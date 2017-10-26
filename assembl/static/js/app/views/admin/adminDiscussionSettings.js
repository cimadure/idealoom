/**
 * 
 * @module app.views.admin.adminDiscussionSettings
 */

var Marionette = require('backbone.marionette');

var i18n = require('../../utils/i18n.js');
var CollectionManager = require('../../common/collectionManager.js');
var Sources = require('../../models/sources.js');
var SourceView = require('./generalSource.js');
var AdminNavigationMenu = require('./adminNavigationMenu.js');

var AdminDiscussionSettings = Marionette.View.extend({
  constructor: function AdminDiscussionSettings() {
    Marionette.View.apply(this, arguments);
  },

  template: '#tmpl-adminDiscussionSettings',
  className: 'admin-settings',
  ui: {
    addSource: '.js_addSource'
  },
  events: {
    'click @ui.addSource': 'addFakeFacebookSource'
  },
  regions: {
    sources: "#sources-content",
    createSource: "#create-source",
    navigationMenuHolder: '.navigation-menu-holder'
  },
  onRender: function() {
    var that = this;
    var collectionManager = new CollectionManager();

    collectionManager.getDiscussionSourceCollectionPromise2()
      .then(function(discussionSource) {
        that.collection = discussionSource;
        var discussionSourceList = new SourceView.DiscussionSourceList({
          collection: discussionSource
        });
        that.showChildView('sources', discussionSourceList);
      });

    this.showChildView('createSource', new SourceView.CreateSource());

    var menu = new AdminNavigationMenu.discussionAdminNavigationMenu(
      {selectedSection: "settings"});
    this.showChildView('navigationMenuHolder', menu);
  },

  addFakeFacebookSource: function(evt){
    evt.preventDefault();

    //Mock facebook view
    // this.collection.add(new Sources.Model.Facebook({
    //   '@type': 'FacebookSinglePostSource',
      
    //   name: 'Benoit!'
    // }));
  }
});

module.exports = AdminDiscussionSettings;
