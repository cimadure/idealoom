'use strict';

var Backbone = require('../shims/backbone.js'),
    Marionette = require('../shims/marionette.js'),
    Assembl = require('../app.js'),
    _ = require('../shims/underscore.js'),
    $ = require('../shims/jquery.js'),
    Ctx = require('../common/context.js'),
    i18n = require('../utils/i18n.js');


var messageModerationOptions = Marionette.LayoutView.extend({
  template: '#tmpl-messageModerationOptions',
  className: 'messageModerationOptions',
  initialize: function(options) {
    console.log("messageModerationOptions::initialize() options: ", options);
    this.options = options;

    if ( !("message_publication_status" in options) ){
      this.options.message_publication_status = "PUBLISHED";
    }

    if ( !("message_moderated_version" in options) ){
      this.options.message_moderated_version = Ctx.getPreferences().moderation_template;
    }
    
    if ( !("message_moderation_remarks" in options) ){
      this.options.message_moderation_remarks = "";
    }
  },

  ui: {
    publicationStatusSelect: '.js_messagePublicationStatusSelect',
    moderationDetails: '.js_moderationDetails',
    messageModeratedVersion: '.js_messageModeratedVersion',
    saveButton: '.js_messageModerationSaveButton',
    cancelButton: '.js_messageModerationCancelButton'
  },

  events: {
    'change @ui.publicationStatusSelect': 'onPublicationStatusSelectChange',
    'click @ui.saveButton': 'onSaveButtonClick',
    'click @ui.cancelButton': 'onCancelButtonClick'
  },

  onPublicationStatusSelectChange: function(ev){
    console.log("messageModerationOptions::onPublicationStatusSelectChange() ev: ", ev);
    if ( ev && "currentTarget" in ev ){
      var val = $(ev.currentTarget).val();
      if ( val == "PUBLISHED" ){
        this.ui.moderationDetails.addClass("hidden");
      } else {
        this.ui.moderationDetails.removeClass("hidden");
      }
    }
  },

  onSaveButtonClick: function(){
    console.log("messageModerationOptions::onSaveButtonClick()");
    console.log("this.model: ", this.model);
    var publication_state = this.ui.publicationStatusSelect.val();
    if ( publication_state == "PUBLISHED" ){
      this.model.save({
        publication_state: publication_state
      }, {patch: true}); // send a PATCH request, not a PUT
    }
    else {
      this.model.save({
        publication_state: publication_state,
        moderation_text: this.ui.messageModeratedVersion.val()
        // TODO: js_messageModerationRemarks
      }, {patch: true}); // send a PATCH request, not a PUT
    }
    this.trigger("moderationOptionsSave");
    this.trigger("moderationOptionsClose");
  },

  onCancelButtonClick: function(){
    this.trigger("moderationOptionsClose");
  },

  serializeData: function() {
    return {
      i18n: i18n,
      message_publication_status: this.options.message_publication_status,
      message_moderated_version: this.options.message_moderated_version,
      message_moderation_remarks: this.options.message_moderation_remarks
    }
  },

});

module.exports = messageModerationOptions;