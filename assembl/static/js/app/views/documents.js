/**
 * 
 * @module app.views.documents
 */

import Marionette from 'backbone.marionette';

import _ from 'underscore';
import $ from 'jquery';
import oembed from 'jquery-oembed-all/jquery.oembed';
import Assembl from '../app.js';
import Promise from 'bluebird';
import Ctx from '../common/context.js';
import i18n from '../utils/i18n.js';
import Raven from 'raven-js';


var AbstractDocumentView = Marionette.View.extend({
  constructor: function AbstractDocumentView(){
    Marionette.View.apply(this, arguments);
  },

  className: 'embeddedFile',

  initialize: function(options){
    if (!this.model) {
      throw new Error('file needs a model');
    }
    this.errorState = false;
    this.uri = this.model.get('external_url') ? this.model.get('external_url') : this.model.get('uri');
  },

  doOembed: function() {
    //console.log (this.model.get('external_url'));
    var that = this;
    this.$el.oembed(this.uri, {
      //initiallyVisible: false,
      embedMethod: "fill",

      //apikeys: {
      //etsy : 'd0jq4lmfi5bjbrxq2etulmjr',
      //},
      maxHeight: "300px", maxWidth: "100%",
      debug: Ctx.debugOembed,
      onEmbedFailed: function() {
        if (Ctx.debugOembed){
          console.log("onEmbedFailed (assembl)");
        }

        that.onRenderOembedFail();
      },
      onError: function(externalUrl, embedProvider, textStatus, jqXHR) {
        if (jqXHR) {
          // Do not reload assembl for an embed failure
          jqXHR.handled = true;
        }
        if (Ctx.debugOembed){
          console.log('err:', externalUrl, embedProvider, textStatus);
        }

        that.onRenderOembedFail();
      },
      afterEmbed: function() {
        if (Ctx.debugOembed){
          console.log("Embeeding done");
        }
      },
      proxyHeadCall: function(url) {
        return "/api/v1/mime_type?url=" + encodeURIComponent(url);
      },
      timeout: 5000
    });
  },

  doLocalEmbed: function(){
    if (this.model.isImageType()){
      //Before the model is saved, this.uri is not updated. So update everytime that there is a render!
      this.uri = this.model.get('external_url');

      if (this.uri){
        var html = "<a href="+ this.uri +" target=_blank>"
        html += "<img src=" + this.uri + " class='embedded-image-preview'>"
        html += "</a>"

        this.$el.html(html);
      }
    }
    else {
      this.onRenderOembedFail();
    }
  },

  processEmbedType: function(){
    if (this.model.isFileType()){
      this.doLocalEmbed();
    }
    else {
      this.doOembed();
    }
  },

  processErrorView: function(){
    var errorMessage = i18n.sprintf(i18n.gettext("Sorry, we have failed to upload your file \"%s\". Please try again."), this._getName());
    this.$el.html("<span class='error-message'>"+ errorMessage +"</span>");
  },

  onRender: function() {
    if (this.errorState){
      this.processErrorView();
    }
    else {
      this.processEmbedType();
    }

  },

  /**
   * Override to alter the Oembed failure condition
   */
  onRenderOembedFail: function(){
    this.$el.html("<a href="+ this.uri + " target='_blank'>"+ this._getName() + "</a>");
  },

  /**
   * @param {boolean} sendError: Send a Raven report or not
   */
  _getName: function(sendError){
    if (this.model.isFileType()){
      var fileName = this.model.get('title');
      if (!fileName){
        if (sendError) {
          Raven.captureMessage("[documents.js][onRenderOembedFail] A filename for the document " + 
                               "model could not be found. The model is defined here: " +
                               JSON.stringify(this.model));  
        }
        fileName = this.model.get('file').name
      }
      return fileName;
    }
    else {
      //There isn't a name type for a non-file type
      return this.uri;
    }
  }

});


var DocumentView = AbstractDocumentView.extend({
  constructor: function DocumentView() {
    AbstractDocumentView.apply(this, arguments);
  },

  template: '#tmpl-fileEmbed',

  initialize: function(options){
    AbstractDocumentView.prototype.initialize.call(this, options);
  },

  serializeData: function() {
    return {
      url: this.uri
    }
  },

  onRender: function(){
    if (Ctx.debugOembed){ console.log("[doingOembed] uri:", this.uri); }
    if (!this.uri){
      console.error("[DocumentView Failed] uri does not exist for model id " + this.model.id +
                    " and external_url " + this.model.get('external_url'));
    }
    AbstractDocumentView.prototype.onRender.call(this);
  }
});


var FileView = AbstractDocumentView.extend({
  constructor: function FileView(){
    AbstractDocumentView.apply(this, arguments);
  },

  template: "#tmpl-fileUploadEmbed",

  initialize: function(options){
    AbstractDocumentView.prototype.initialize.call(this, options);
  },

  serializeData: function(){
    return {
      name: this.model.get('title'),
      url: this.uri,
      percent: null
    }
  },

  onRender: function(){
    if (Ctx.debugOembed){ console.log("[doingOembed] uri:", this.uri); }
    if (!this.uri){
      console.error("[FileView Failed] uri does not exist for model id " + this.model.id +
                    " and external_url " + this.model.get('external_url'));
    }
    AbstractDocumentView.prototype.onRender.call(this);
  }
});


var AbstractEditView =  AbstractDocumentView.extend({
  constructor: function AbstractEditView(){
    AbstractDocumentView.apply(this, arguments);
  },

  template: "#tmpl-loader",

  modelEvents: {
    'progress': 'onShowProgress'
  },

  initialize: function(options){
    
    AbstractDocumentView.prototype.initialize.call(this, options);
    this.showProgress = false;
    this.percentComplete = 0; // Float from 0-100
    this.parentView = options.parentView;
    var that = this;
    if (options.showProgress) {
      this.showProgress = true;
    }

    /*
      For lifecycle of a document model, the model must be saved, in order
      for file types to be servable and renderable via the backend. Therefore,
      upon view init, save the model.

      However, upon attachment re-render, the view is re-instantiated.
      Therefore, do not PUT on the model if it is already been saved.
     */
    if (this.model.isNew()){
      /**
       * TODO: Re-Promisify the save operation
       *
       * For whatever reason, under promisification, handling the jqXhr
       * fails to follow through. (ie. setting jqXhr.handled = true still crashes Assembl)
       *
       * Previously this was: Promise.resolve(this.model.save()).then(function(){
       *  /*Handle success logic;*\/
       *  }, function(resp){ /* resp.handled = true; *\/});
       */
      this.model.save(null, {
        wait: true,
        success: function(model, resp, options){
          if (!that.isDestroyed()){
            that.initalizeCallback();
          }
        },
        error: function(model, resp, options){
          resp.handled = true;
          if (!that.isDestroyed()){
            if (that.parentView){
              var attachmentModel = that.parentView.model;
              //1st ParentView: AttachmentEditView
              //2nd ParentView: AttachmentEditableCollectionView
              //3rd: The container LayoutView
              var containerView = that.parentView.parentView.parentView;
              containerView.failModel(attachmentModel);
            }
          }
        }
      });
    }
    else {
      if (!that.isDestroyed()){
        that.initalizeCallback();
      }
    }
  },

  initalizeCallback: function(model){
    /*
      Override in subclasses to override what the view will initalize after
      saving its model to the backend.
     */
    // this.$(window).on("beforeunload", function(ev){this.onBeforeUnload(ev)});
    throw new Error("Cannot instantiate an AbstractDocumentEditView");
  },

  /**
   * Override in child classes 
   */
  onShowProgress: function(ev){
    if (this.showProgress) {
      // console.log("Show the progress of the file upload in view with event", ev);
    }
  }
});

var DocumentEditView = AbstractEditView.extend({
  constructor: function DocumentEditView(){
    AbstractEditView.apply(this, arguments);
  },

  template: "#tmpl-fileEmbed",

  initialize: function(options){
    AbstractEditView.prototype.initialize.call(this, options);
  },

  initalizeCallback: function(){
    if (!this.isDestroyed()){
      this.render();
    }
  },

  serializeData: function(){
    return {
      url: this.uri
    }
  }

});

var FileEditView = AbstractEditView.extend({
  constructor: function FileEditView(){
    AbstractEditView.apply(this, arguments);
  },

  template: "#tmpl-fileUploadEmbed",

  initalize: function(options){
    AbstractEditView.prototype.initalize.call(this, options);
  },

  initalizeCallback: function(){
    this.uploadComplete = true;
    this.uri = this.model.get('external_url');
    if (!this.isDestroyed()){
      this.render();
    }
  },

  serializeData: function(){
    return {
      name: this.model.get('title'),
      url: this.uploadComplete ? this.uri : "javascript:void(0)",
      percent: this.percentComplete
    }
  },

  onShowProgress: function(ev){
    // console.log("FileEditView progress bar has been made!", ev);
    this.percentComplete = ~~(ev * 100); //float -> integer
    if (!this.isDestroyed()){
      this.render();
    }
  },

  /*
    This is poorly done. It overrides the current template. Want to be using
    the template logic here to maintain flexibility and keeping DRY
   */
  onRenderOembedFail: function(){
    var string = "<a href="+ this.uri + " target='_blank'>"+ this._getName() + "</a>";
    if (this.percentComplete){
      this.$el.html(string + " (100%)");
    }
    else { 
      this.$el.html(string);
    }
  },

  doLocalEmbed: function(){
    if (this.model.isImageType()){
      //Before the model is saved, this.uri is not updated. So update everytime that there is a render!
      this.uri = this.model.get('external_url');
      if (this.uri){
        //TODO: Use jQuery to create this DOM element. There is a breach if uri is malformed
        var html = "<img src=" + this.uri + " class='embedded-image-preview'>";
        this.$el.html(html);
      }
    }
    else {
      this.onRenderOembedFail();
    }
  },

});


export default {
  DocumentView: DocumentView,
  DocumentEditView: DocumentEditView,
  FileView: FileView,
  FileEditView: FileEditView
};
