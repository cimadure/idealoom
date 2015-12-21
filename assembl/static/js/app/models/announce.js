'use strict';

var $ = require('../shims/jquery.js'),
    Base = require('./base.js'),
    i18n = require('../utils/i18n.js'),
    Ctx = require('../common/context.js'),
    Types = require('../utils/types.js');

/**
 * @class AnnounceModel
 * Represents an announce, a mutable message-like object, with an author and a 
 * date
 */
var AnnounceModel = Base.Model.extend({
  /**
   * Defaults
   * @type {Object}
   */
  defaults: {
    //'@type': Types.ANNOUNCE,
    //"creation_date": undefined,
    //"modification_date": undefined,
    "creator": undefined,
    "last_updated_by": undefined, 
    "title": undefined,
    "body": undefined,
    "idObjectAttachedTo": undefined,
    //Only for idea announces
    "should_propagate_down": undefined
  },

  initialize: function(options) {
    this.on("invalid", function(model, error) {
      console.log(model.id + " " + error);
    });
  },

  validate: function(attrs, options) {
    if(!this.get('idObjectAttachedTo')) {
      return "Object attached to is missing";
    }
    if(!this.get('last_updated_by')) {
      return "Attached document is missing";
    }
    if(!this.get('creator')) {
      return "Creator is missing";
    }
  },

  /** 
   * Return a promise for the post's creator
   */
  getCreatorPromise: function() {
    var that = this;

    return this.collection.collectionManager.getAllUsersCollectionPromise()
      .then(function(allUsersCollection) {
        var creatorModel = allUsersCollection.get(that.get('creator'));
        if(creatorModel) {
          return Promise.resolve(creatorModel);
        }
        else {
          return Promise.reject("Creator " + that.get('creator') + " not found in allUsersCollection");
        }
        
      });
  }
});

/**
 * @class PartnerOrganizationCollection
 */
var AnnounceCollection = Base.Collection.extend({
  /**
   * @type {String}
   */
  url: Ctx.getApiV2DiscussionUrl('announces'),
  
  /**
   * The model
   * @type {PartnerOrganizationModel}
   */
  model: AnnounceModel
});

module.exports = {
  Model: AnnounceModel,
  Collection: AnnounceCollection
};
