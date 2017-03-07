'use strict';
/**
 *
 * @module app.views.admin.adminTimelineEvents
 */

var Assembl = require('../../app.js'),
    Ctx = require('../../common/context.js'),
    i18n = require('../../utils/i18n.js'),
    EditableField = require('../reusableDataFields/editableField.js'),
    TimelineEvent = require('../../models/timeline.js'),
    LangString = require('../../models/langstring.js'),
    CollectionManager = require('../../common/collectionManager.js'),
    Marionette = require('../../shims/marionette.js'),
    Growl = require('../../utils/growl.js'),
    SimpleLangStringEditPanel = require('../simpleLangStringEdit.js'),
    AdminNavigationMenu = require('./adminNavigationMenu.js'),
    $ = require('jquery'),
    _ = require('underscore'),
    Promise = require('bluebird');


/**
 * @class  app.views.admin.adminTimelineEvents.AdminTimelineEventPanel
 */
var AdminTimelineEventPanel = Marionette.LayoutView.extend({
  constructor: function AdminTimelineEventPanel() {
    Marionette.LayoutView.apply(this, arguments);
  },
  template: '#tmpl-adminTimelineEvents',

  ui: {
    addTimelineEvent: '.js_add_event',
    save: '.js_save',
    timelineEventsList: '.js_timelineEventsList',
    navigationMenuHolder: '.navigation-menu-holder',
  },

  regions: {
    timelineEventsList: '@ui.timelineEventsList',
    navigationMenuHolder: '@ui.navigationMenuHolder',
  },

  events: {
    'click @ui.addTimelineEvent': 'addTimelineEvent',
  },

  initialize: function(options) {
    var that = this,
        collectionManager = new CollectionManager();
    this.timelineEventCollection = null;
    if(this.isViewDestroyed()) {
      return;
    }
    this.timelinePromise = collectionManager.getAllTimelineEventCollectionPromise().then(function(timeline) {
      that.timelineEventCollection = timeline;
      that.render();
    })
  },

  addTimelineEvent: function(ev) {
    var eventCollection = this.timelineEventCollection,
        lastEventId,
        event,
        title = new LangString.Model(),
        titles = {},
        description = new LangString.Model(),
        descriptions = {},
        preferences = Ctx.getPreferences();
    if (eventCollection.length > 0) {
      lastEventId = eventCollection.models[eventCollection.length-1].id;
    }
    _.map(preferences.preferred_locales, function(loc) {
      titles[loc] = '';
      descriptions[loc] = '';
    });
    title.initFromDict(titles);
    description.initFromDict(titles);
    event = new TimelineEvent.Model({
      title: title,
      description: description,
      previous_event: lastEventId,
    });
    eventCollection.add(event);
    event.save();
    ev.preventDefault();
  },

  serializeData: function() {
    return {
    };
  },

  onRender: function() {
    if (this.isViewDestroyed()) {
      return;
    }
    if (this.timelineEventCollection != null) {
      this.showChildView(
        "timelineEventsList",
        new TimelineEventsList({
          basePanel: this,
          collection: this.timelineEventCollection,
        }));
    }
    var menu = new AdminNavigationMenu.discussionAdminNavigationMenu(
      {selectedSection: "timeline"});
    this.getRegion('navigationMenuHolder').show(menu);
  },
});


/**
 * @class  app.views.admin.adminTimelineEvents.TimelineEventView
 */
var TimelineEventView = Marionette.LayoutView.extend({
  constructor: function TimelineEventView() {
    Marionette.LayoutView.apply(this, arguments);
  },
  template: '#tmpl-adminTimelineEvent',
  ui: {
    eventTitle: '.js_timeline_title',
    eventDescription: '.js_timeline_description',
    eventImageUrl: '.js_timeline_image_url',
    eventUp: '.js_timeline_up',
    eventDown: '.js_timeline_down',
    eventDelete: '.js_timeline_delete',
  },
  regions: {
    eventTitle: '@ui.eventTitle',
    eventDescription: '@ui.eventDescription',
  },
  events: {
    'click @ui.eventUp': 'reorderColumnUp',
    'click @ui.eventDown': 'reorderColumnDown',
    'click @ui.eventDelete': 'deleteColumn',
    'change @ui.eventImageUrl': 'changeColor',
  },
  getIndex: function() {
    return _.indexOf(this.model.collection.models, this.model);
  },
  serializeData: function() {
    return {
      event: this.model,
      index: this.getIndex(),
      collsize: this.model.collection.length,
    };
  },
  onRender: function() {
    this.showChildView(
      "eventTitle",
      new SimpleLangStringEditPanel({
        model: this.model.get('title'),
        owner_relative_url: this.model.url() + '/title',
      }));
    this.showChildView(
      "eventDescription",
      new SimpleLangStringEditPanel({
        model: this.model.get('description'),
        owner_relative_url: this.model.url() + '/description',
      }));
  },
  reorderColumnDown: function(ev) {
    var index = this.getIndex(),
        nextModel = this.model.collection.at(index + 1);
    Promise.resolve($.ajax(nextModel.url() + "/reorder_up", {
        method: "POST"})).then(function(data) {
        nextModel.collection.fetch({
          success: function() {
            nextModel.collection.sort();
          }
        });
    });
    ev.preventDefault();
  },
  reorderColumnUp: function(ev) {
    var model = this.model;
    Promise.resolve($.ajax(model.url() + "/reorder_up", {
        method: "POST"})).then(function(data) {
        model.collection.fetch({
          success: function() {
            model.collection.sort();
          }
        });
    });
    ev.preventDefault();
  },
  deleteColumn: function(ev) {
    var nextModel = null,
        prevColumn = this.model.get('previous_event'),
        index = this.getIndex();
    if (index + 1 < this.model.collection.length) {
      nextModel = this.model.collection.at(index+1);
    }
    this.model.destroy({
      success: function() {
        if (nextModel !== null) {
          // update the previous_event value
          nextModel.fetch();
        }
      },
    });
    ev.preventDefault();
  },
  changeImageUrl: function(ev) {
    this.model.set('image_url', ev.currentTarget.value);
    this.model.save();
    ev.preventDefault();
  },
});


/**
 * The collections of events to be seen on this idea
 * @class app.views.adminTimelineEvents.TimelineEventsList
 */
var TimelineEventsList = Marionette.CollectionView.extend({
  constructor: function TimelineEventsList() {
    Marionette.CollectionView.apply(this, arguments);
  },
  initialize: function(options) {
    this.options = options;
  },
  childView: TimelineEventView,
});




module.exports = AdminTimelineEventPanel;
