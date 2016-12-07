'use strict';
/**
 * 
 * @module app.views.navigation.synthesisInNavigation
 */

var Marionette = require('backbone.marionette'),
    _ = require('underscore'),
    Promise = require('bluebird'),
    AssemblPanel = require('../assemblPanel.js'),
    CollectionManager = require('../../common/collectionManager.js'),
    Types = require('../../utils/types.js'),
    Assembl = require('../../app.js'),
    Ctx = require('../../common/context.js'),
    i18n = require('../../utils/i18n.js'),
    PanelSpecTypes = require('../../utils/panelSpecTypes.js'),
    scrollUtils = require('../../utils/scrollUtils.js'),
    Analytics = require('../../internal_modules/analytics/dispatcher.js');

var SynthesisItem = Marionette.ItemView.extend({
  constructor: function SynthesisItem() {
    Marionette.ItemView.apply(this, arguments);
  },

  template: '#tmpl-loader',
  initialize: function(options) {
    var that = this;
    this.panel = options.panel;
    this.model.collection.collectionManager.getUserLanguagePreferencesPromise(Ctx).then(function(ulp) {
        that.translationData = ulp.getTranslationData();
        that.template = '#tmpl-synthesisItemInNavigation';
        that.render();
    });
  },
  events: {
    'click .js_synthesisList': 'onSelectedSynthesis'
  },
  serializeData: function() {
    if (this.template == "#tmpl-loader") {
        return {};
    }
    return {
      id: this.model.get('published_in_post'),
      subject: this.model.get('subject'),
      date: Ctx.formatDate(this.model.get('creation_date'))
    };
  },

  onSelectedSynthesis: function(e) {
    var messageId =  $(e.currentTarget).attr('data-message-id');
    this.panel.displaySynthesis(messageId);
    //If it's a small screen detected => scroll to the right
    if(Ctx.isSmallScreen()){
      var screenSize = window.innerWidth;
      scrollUtils.scrollToNextPanel('.groupsContainer',100,screenSize);
    }
  }

});

var SynthesisList = Marionette.CollectionView.extend({
  constructor: function SynthesisList() {
    Marionette.CollectionView.apply(this, arguments);
  },

  childView: SynthesisItem,
  initialize: function(options) {

    var publishedSyntheses = this.collection.getPublishedSyntheses();

    _.sortBy(publishedSyntheses, function(message) {
      return message.get('creation_date');
    });
    publishedSyntheses.reverse();

    this.collection = new Backbone.Collection(publishedSyntheses);

    this.childViewOptions = {
      panel: options.panel
    }
  }

});

var SynthesisInNavigationPanel = AssemblPanel.extend({
  constructor: function SynthesisInNavigationPanel() {
    AssemblPanel.apply(this, arguments);
  },

  template: '#tmpl-loader',
  panelType: PanelSpecTypes.NAVIGATION_PANEL_SYNTHESIS_SECTION,
  className: 'synthesisNavPanel',
  ui: {
    synthesisListHeader: ".synthesisListHeader"
  },
  regions:{
    synthesisContainer: '.synthesisList'
  },

  initialize: function(options) {
      AssemblPanel.prototype.initialize.apply(this, arguments);
    },

  selectSynthesisInMenu: function(messageId) {
      $(".synthesisItem").closest('li').removeClass("selected");
      this.$(".synthesisItem[data-message-id=\"" + messageId + "\"]").addClass("selected");
    },

  displaySynthesis: function(messageId) {
    var analytics = Analytics.getInstance();

    analytics.trackEvent(analytics.events.NAVIGATION_OPEN_SPECIFIC_SYNTHESIS);
    var messageListView = this.getContainingGroup().findViewByType(PanelSpecTypes.MESSAGE_LIST);
    messageListView.currentQuery.clearAllFilters();
    messageListView.toggleFilterByPostId(messageId);
    messageListView.showMessageById(messageId, undefined, false);

    setTimeout(function(){
      if ( messageListView.ui.stickyBar ){
        messageListView.ui.stickyBar.addClass('hidden');
      }
      if ( messageListView.ui.replyBox ){
        messageListView.ui.replyBox.addClass('hidden');
      }
    }, 1);
    

    // Show that entry is selected
    this.selectSynthesisInMenu(messageId);
  },

  displaySynthesisList: function(allMessageStructureCollection, allSynthesisCollection) {
      var lastPublisedSynthesis = allSynthesisCollection.getLastPublisedSynthesis();

      if (lastPublisedSynthesis) {

        var synthesisList = new SynthesisList({
          collection: allSynthesisCollection,
          panel: this
        });

        this.getRegion('synthesisContainer').show(synthesisList);
        this.displaySynthesis(lastPublisedSynthesis.get('published_in_post'));
      }
      else {
        this.ui.synthesisListHeader.html(i18n.gettext("No synthesis of the discussion has been published yet"));
      }
    },
  
  onBeforeShow: function() {
    var that = this,
    collectionManager = new CollectionManager();

    Promise.join(collectionManager.getAllMessageStructureCollectionPromise(),
      collectionManager.getAllSynthesisCollectionPromise(),
      function(allMessageStructureCollection, allSynthesisCollection) {
      if(!that.isViewDestroyed()) {
        that.template = '#tmpl-synthesisInNavigationPanel';
        that.render();
        that.displaySynthesisList(allMessageStructureCollection, allSynthesisCollection);
        that.listenTo(allSynthesisCollection, 'add reset', function() {
          //console.log("Re-displaying synthesis list from collection update...", allSynthesisCollection.length);
          that.displaySynthesisList(allMessageStructureCollection, allSynthesisCollection);
        });
        // that.synthesisContainer.$el.find(".synthesisItem:first")[0].id = "tour_step_synthesis_item1";
        // Assembl.vent.trigger("requestTour", "synthesis_item1");
      }
    });
  }

});

module.exports = SynthesisInNavigationPanel;
