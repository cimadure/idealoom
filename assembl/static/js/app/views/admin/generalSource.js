/**
 * 
 * @module app.views.admin.generalSource
 */
var Marionette = require('../../shims/marionette.js'),
    $ = require('jquery'),
    _ = require('underscore'),
    i18n = require('../../utils/i18n.js'),
    Types = require('../../utils/types.js'),
    Ctx = require('../../common/context.js'),
    Permissions = require('../../utils/permissions.js'),
    Growl = require('../../utils/growl.js'),
    Source = require('../../models/sources.js'),
    CollectionManager = require('../../common/collectionManager.js'),
    SourceViews = require("./sourceEditViews.js"),
    Moment = require('moment'),
    FacebookSourceEditView = require("../facebookViews.js");

function getSourceEditView(model_type) {
  var form;
  switch (model_type) {
    case Types.IMAPMAILBOX:
    case Types.MAILING_LIST:
    case Types.ABSTRACT_FILESYSTEM_MAILBOX:
      return SourceViews.EmailSource;
    case Types.FACEBOOK_GENERIC_SOURCE:
    case Types.FACEBOOK_GROUP_SOURCE:
    case Types.FACEBOOK_GROUP_SOURCE_FROM_USER:
    case Types.FACEBOOK_PAGE_POSTS_SOURCE:
    case Types.FACEBOOK_PAGE_FEED_SOURCE:
    case Types.FACEBOOK_SINGLE_POST_SOURCE:
      return FacebookSourceEditView.init;
    default:
      console.error("Not edit view for source of type "+model_type);
      return;
  }
};



var ReadSource = Marionette.ItemView.extend({
  constructor: function ReadSource() {
    Marionette.ItemView.apply(this, arguments);
  },

    template: '#tmpl-adminDiscussionSettingsGeneralSourceRead',
    ui: {
        manualStart: '.js_manualStart',
        reimport: '.js_reimport',
        reprocess: '.js_reprocess',
        showEdit: '.js_moreOptions',
    },

    modelEvents: {
        'change': 'updateView'
    },

    events: {
        'click @ui.manualStart': 'manualStart',
        'click @ui.reimport': 'reimportSource',
        'click @ui.reprocess': 'reprocessSource',
        'click @ui.showEdit': 'toggleEditView'
    },

    initialize: function(options) {
        this.parent = options.parent;
        this.model = this.parent.model;
    },

    toggleEditView: function() {
        this.parent.toggleEditView();
    },

    reimportSource: function(e){
        e.preventDefault();
        e.stopPropagation();
        return Promise.resolve(this.model.doReimport()).then(function(resp) {
            if (_.has(resp, 'error')){
                Growl.showBottomGrowl(Growl.GrowlReason.ERROR, i18n.gettext("There was a reimport error!"));
                console.error("Source " + this.model.name + " failed to reimport due to an internal server problem with response ", resp);
            }
            Growl.showBottomGrowl(Growl.GrowlReason.SUCCESS, i18n.gettext('Reimport has begun! It can take up to 15 minutes to complete.'));
        }).catch(function(e) {
            Growl.showBottomGrowl(Growl.GrowlReason.ERROR, i18n.gettext('Reimport failed.'));
        });
    },

    reprocessSource: function(e){
        e.preventDefault();
        e.stopPropagation();
        return Promise.resolve(this.model.doReprocess()).then(function(resp) {
            if (_.has(resp, 'error')){
                Growl.showBottomGrowl(Growl.GrowlReason.ERROR, i18n.gettext("There was a reprocess error!"));
                console.error("Source " + this.model.name + " failed to reprocess due to an internal server problem with response", resp);
            }
            Growl.showBottomGrowl(Growl.GrowlReason.SUCCESS, i18n.gettext('Reprocess has begun! It can take up to 15 minutes to complete.'));
        }).catch(function(e) {
            Growl.showBottomGrowl(Growl.GrowlReason.ERROR, i18n.gettext('Reprocess failed'));
        });
    },

    manualStart: function(evt){
      var url = this.model.url() + "/fetch_posts";
      var user = Ctx.getCurrentUser();
      var payload = {};
      if (user.can(Permissions.ADMIN_DISCUSSION)){
        payload.force_restart = true;
      }
      $.ajax(
        url,
        {
          method: "POST",
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify(payload)
        }
      ).then(function() {
        Growl.showBottomGrowl(Growl.GrowlReason.SUCCESS, i18n.gettext('Import has begun!'))
      });
    },

    serializeData: function() {
      // TODO: Name for the types
      var backoff = this.model.get('error_backoff_until');
      return {
        name: this.model.get('name'),
        type: this.model.localizedName,
        connection_error: this.model.get('connection_error') || '',
        error_desc: this.model.get('error_description') || '',
        error_backoff: backoff ? Moment(backoff).fromNow() : '',
      };
    },

    updateView: function(evt){
        this.render(); //Update 
    }
});

function getSourceDisplayView(model) {
  // TODO
  return ReadSource;
};


var SourceView = Marionette.LayoutView.extend({
  constructor: function SourceView() {
    Marionette.LayoutView.apply(this, arguments);
  },

  ui: {
    edit_container: '.js_source_edit_container'
  },
  template: '#tmpl-adminDiscussionSettingsGeneralSource',
  regions: {
    readOnly: '.js_source_read',
    form: '.js_source_edit'
  },
  toggleEditView: function() {
    this.ui.edit_container.toggleClass('hidden');
  },
  onShow: function(){
    var display_view = getSourceDisplayView(this.model);
    this.getRegion('readOnly').show(new display_view({parent: this}));
    var editViewClass = getSourceEditView(this.model.get("@type"));
    if (editViewClass !== undefined) {
      this.getRegion('form').show(new editViewClass({model: this.model}));
    }
  },
});


var CreateSource = Marionette.LayoutView.extend({
  constructor: function CreateSource() {
    Marionette.LayoutView.apply(this, arguments);
  },

  template: '#tmpl-DiscussionSettingsCreateSource',
  regions: {
    edit_form: ".js_editform"
  },
  ui: {
    selector: ".js_contentSourceType",
    create_button: ".js_contentSourceCreate",
  },
  events: {
    'click @ui.create_button': 'createButton',
    'change @ui.selector': 'changeSubForm',
  },
  editView: undefined,
  serializeData: function() {
    var types = [
        Types.IMAPMAILBOX,
        Types.MAILING_LIST,
        Types.FACEBOOK_GROUP_SOURCE,
        Types.FACEBOOK_GROUP_SOURCE_FROM_USER,
        Types.FACEBOOK_PAGE_POSTS_SOURCE,
        Types.FACEBOOK_PAGE_FEED_SOURCE,
        Types.FACEBOOK_SINGLE_POST_SOURCE
      ],
      type_name_assoc = {};
      for (var i in types) {
        type_name_assoc[types[i]] = Source.getSourceClassByType(types[i]).prototype.localizedName;
      }
    return {
      types: types,
      type_names: type_name_assoc
    };
  },
  changeSubForm: function(ev) {
    var sourceType = ev.currentTarget.value;
    var editViewClass = getSourceEditView(sourceType);
    var modelClass = Source.getSourceClassByType(sourceType);
    if (editViewClass !== undefined && modelClass !== undefined) {
      this.editView = new editViewClass({model: new modelClass()});
      this.getRegion('edit_form').show(this.editView);
    } else {
      this.editView = undefined;
      this.getRegion('edit_form').show("");
    }
  },
  createButton: function(ev) {
    if (this.editView !== undefined) {
      this.editView.saveModel();
    }
  }
});


var DiscussionSourceList = Marionette.CollectionView.extend({
  constructor: function DiscussionSourceList() {
    Marionette.CollectionView.apply(this, arguments);
  },

    // getChildView: getSourceDisplayView
    childView: SourceView
});


module.exports = {
    Item: ReadSource,
    Root: SourceView,
    CreateSource: CreateSource,
    DiscussionSourceList: DiscussionSourceList
}
