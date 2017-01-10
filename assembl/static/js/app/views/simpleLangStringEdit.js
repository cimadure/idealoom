'use strict';
/**
 * A simple editor for langstring models, mostly for back-office use
 * @module app.views.admin.simpleLangStringEdit
 */

var Assembl = require('../app.js'),
    Ctx = require('../common/context.js'),
    i18n = require('../utils/i18n.js'),
    EditableField = require('./reusableDataFields/editableField.js'),
    IdeaMessageColumn = require('../models/ideaMessageColumn.js'),
    LangString = require('../models/langstring.js'),
    CollectionManager = require('../common/collectionManager.js'),
    Marionette = require('backbone.marionette'),
    Growl = require('../utils/growl.js'),
    $ = require('jquery'),
    _ = require('underscore'),
    Promise = require('bluebird');


/**
 * @class  app.views.admin.simp.SimpleLangStringEditPanel
 */
var SimpleLangStringEditPanel = Marionette.View.extend({
  constructor: function SimpleLangStringEditPanel() {
    Marionette.View.apply(this, arguments);
  },
  template: '#tmpl-simpleLangStringEdit',

  ui: {
    addEntry: '.js_add_entry',
    entryList: '.js_entryList',
  },

  regions: {
    entryList: '@ui.entryList',
  },

  events: {
    'click @ui.addEntry': 'addEntry',
  },

  initialize: function(options) {
    if(this.isDestroyed()) {
      return;
    }
    this.langCache = Ctx.localesAsSortedList();
    this.model = options.model;
    this.owner_relative_url = options.owner_relative_url;
  },

  addEntry: function(ev) {
    var langstring = this.model,
        entries = langstring.get('entries'),
        entry = new LangString.EntryModel();
    entries.add(entry);
    // saving will happen after entry has changed value
    ev.preventDefault();
  },

  onRender: function() {
    if (this.isDestroyed()) {
      return;
    }
    this.showChildView(
      "entryList",
      new LangStringEntryList({
        basePanel: this,
        langstring: this.model,
        owner_relative_url: this.owner_relative_url,
        collection: this.model.get('entries'),
      }));
  },
});


/**
 * @class  app.views.admin.adminMessageColumns.LangStringEntryView
 */
var LangStringEntryView = Marionette.View.extend({
  constructor: function LangStringEntryView() {
    Marionette.View.apply(this, arguments);
  },
  template: '#tmpl-langStringEntry',
  ui: {
    locale: '.js_locale',
    value: '.js_value',
    deleteButton: '.js_delete',
  },
  events: {
    'change @ui.locale': 'changeLocale',
    'change @ui.value': 'changeValue',
    'click @ui.deleteButton': 'deleteEntry',
  },
  initialize: function(options) {
    this.languages = options.basePanel.langCache;
    this.owner_relative_url = options.owner_relative_url;
  },
  serializeData: function() {
    return {
      languages: this.languages,
      model: this.model,
    };
  },

  modelUrl: function() {
    var url = this.owner_relative_url + "/" + this.model.langstring().getNumericId() + "/entries";
    if (this.model.id !== undefined) {
      url += "/" + this.model.getNumericId();
    }
    return url;
  },

  deleteEntry: function(ev) {
    this.model.destroy({url: this.modelUrl()});
    ev.preventDefault();
  },
  changeLocale: function(ev) {
    var that = this;
    this.model.save({
      '@language': ev.currentTarget.value
    }, {
      url: this.modelUrl(),
    });
    ev.preventDefault();
  },
  changeValue: function(ev) {
    var that = this;
    this.model.save({
      value: ev.currentTarget.value
    }, {
      url: this.modelUrl(),
    });
    ev.preventDefault();
  },
});


/**
 * The collections of columns to be seen on this idea
 * @class app.views.adminMessageColumns.LangStringEntryList
 */
var LangStringEntryList = Marionette.CollectionView.extend({
  constructor: function LangStringEntryList() {
    Marionette.CollectionView.apply(this, arguments);
  },
  initialize: function(options) {
    this.childViewOptions = options;
  },
  childView: LangStringEntryView,
});

module.exports = SimpleLangStringEditPanel;
