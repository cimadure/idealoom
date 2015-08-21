'use strict';


/*
  TODO: Update category registry with well defined Categories
 */
var _CATEGORY_DEFINITIONS = {
    TABLE_OF_IDEAS: 'TABLE_OF_IDEAS',
    SYNTHESIS: 'SYNTHESIS',
    IDEA_PANEL: 'IDEA_PANEL',
    MESSAGE_LIST: 'MESSAGE_LIST',
    MESSAGE: 'MESSAGE',
    NAVIGATION_PANEL: 'NAVIGATION_PANEL',
    SHARED_URL: 'SHARED_URL',
    NOTIFICATION: 'NOTIFICATION'
};

/*
  TODO: Update actions registry with well defined Actions to track
 */
var _ACTION_DEFINITIONS = {
    READING: 'READING',
    FINDING: 'FINDING',
    INTERACTING: 'INTERACTING',
    PRODUCING: 'PRODUCING'
};

/**
 * eventDefinition.category, eventDefinition.action, eventDefinition.eventName
 */
var _EVENT_DEFINITIONS = {
    NAVIGATION_OPEN_CONTEXT_SECTION: {action: 'FINDING', category: 'NAVIGATION_PANEL', eventName: 'OPEN_CONTEXT_SECTION'},
    NAVIGATION_OPEN_DEBATE_SECTION: {action: 'FINDING', category: 'NAVIGATION_PANEL', eventName: 'OPEN_DEBATE_SECTION'},
    NAVIGATION_OPEN_SYNTHESES_SECTION: {action: 'FINDING', category: 'NAVIGATION_PANEL', eventName: 'OPEN_SYNTHESES_SECTION'},
    NAVIGATION_OPEN_VISUALIZATIONS_SECTION: {action: 'FINDING', category: 'NAVIGATION_PANEL', eventName: 'OPEN_VISUALIZATIONS_SECTION'}
    /*
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    JOIN_GROUP:'JOIN_GROUP',
    JOIN_GROUP_REFUSED: 'JOIN_GROUP_REFUSED',
    NAVIGATE_IDEA: 'NAVIGATE_IDEA',
    REPLY_MESSAGE_START: 'REPLY_MESSAGE_START',
    REPLY_MESSAGE_COMPLETE: 'REPLY_MESSAGE_COMPLETE'
    */
};

/**
 * Pseudo URLs: (/TARGET/TRIGGER_INFO (NOT origin target ), ex: IDEA/SYNTHESIS,
 *  meaning an idea was navigated to from the synthesis (any synthesis) but NOT 
 *  IDEA/SYNTHESIS_SECTION (meaning an idea was navigated to from the synthesis
 *  section of the accordeon) 
 *  A dash (-) means that the TRIGGER_INFO in unknown, or irrelevent
 *  Ex: TODO
 */
var _PAGE_DEFINITIONS = { 
    //IMPLEMENTED
    'SIMPLEUI_CONTEXT_SECTION': 'SIMPLEUI_CONTEXT_SECTION',
    'SIMPLEUI_DEBATE_SECTION': 'SIMPLEUI_DEBATE_SECTION',
    'SIMPLEUI_SYNTHESES_SECTION': 'SIMPLEUI_SYNTHESES_SECTION',
    'SIMPLEUI_VISUALIZATIONS_SECTION': 'SIMPLEUI_VISUALIZATIONS_SECTION',
    //NOT YET IMPLEMENTED
    'LOGIN/-': 'LOGIN/-',
    'SIGNUP/-': 'SINGUP/-',
    'JOIN_GROUP/-': 'JOIN_GROUP/-',

};

var CUSTOM_VARIABLES = {
  SAMPLE_CUSTOM_VAR: ['SAMPLE_CUSTOM_VAR', 1]
}

/**
 * Abstract Base Class for Analytics Wrapper 
 */
function Wrapper() {
  if (this.constructor === Wrapper){
    throw new Error("Abstract class cannot be constructed!");
  }
};

Wrapper.prototype = {
  customVariableSize: 5,
  debug: true,
  events: _EVENT_DEFINITIONS,
  actions: _ACTION_DEFINITIONS,
  categories: _CATEGORY_DEFINITIONS,
  pages: _PAGE_DEFINITIONS,

  
  validateEventsArray: function() {
    var that = this;

    _.each(this.events, function(event) {
      if (!(event.action in that.actions)) {
        throw new Error("Action "+event.action+" not in _ACTION_DEFINITIONS");
      }
      if (!(event.category in that.categories)) {
        throw new Error("Action "+event.action+" not in _CATEGORY_DEFINITIONS");
      }
    });
  },
  
  initialize: function(options){
    throw new Error('Cannot call abstract method!');
  },

  // this.updatePageUrl = function(target, options){
  //   throw new Error('Cannot call abstract method!');
  // },
  // 
  // this.updateTitle = function(title){
  //   throw new Error('Cannot call abstract method!'); 
  // },

  /**
   * Change the state of the current page for other events, and log the navigation
   * to the new page.
   * 
   * Concrete implementions should call both piwik's updatePageUrl and updateTitle
   * (or whatever equivalent in the implementation)
   * 
   * @param page One of this.pages
   */
  changeCurrentPage: function(page, options) {
    throw new Error('Cannot call abstract method!');
  },

  trackEvent: function(eventDefinition, value, options) {
    throw new Error('Cannot call abstract method!');
  },

  setCustomVariable: function(name, value, options){
    throw new Error('Cannot call abstract method!');
  },
 
  deleteCustomVariable: function(options){
    throw new Error('Cannot call abstract method!');
  },

  trackLink: function(urlPath, options){
    throw new Error('Cannot call abstract method!');
  },

  trackGoal: function(goalId, options){
    throw new Error('Cannot call abstract method!');
  },

  createNewVisit: function(){
    throw new Error('Cannot call abstract method!');
  },

  setUserId: function(id) {
    throw new Error('Cannot call abstract method!');
  },

  //The below functions do not seem to have a correlation to GA, used by Piwik only
  trackImpression: function(contentName, contentPiece, contentTarget) {
    throw new Error('Cannot call abstract method!');
  },

  trackVisibleImpression: function(checkOnScroll, timeInterval){
    throw new Error('Cannot call abstract method!');
  },

  trackDomNodeImpression: function(domNode){
    throw new Error('Cannot call abstract method!');
  },

  trackContentInteraction: function(interaction, contentName, contentPiece, contentTarget){
    throw new Error('Cannot call abstract method!');
  },

  trackDomNodeInteraction: function(domNode, contentInteraction){
    throw new Error('Cannot call abstract method!');
  }
};


module.exports = Wrapper;
