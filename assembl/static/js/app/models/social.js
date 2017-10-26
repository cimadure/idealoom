/**
 * An access token for facebook
 * @module app.models.social
 */

import $ from 'jquery';
import Base from './base.js';
import Ctx from '../common/context.js';
import i18n from '../utils/i18n.js';
import Agents from './agents.js';
import Moment from 'moment';

var tokenTimeManager = function() {
  this.minTime = new Moment('0001-01-01T00:00:00Z').utc() //datetime.min in python
};

tokenTimeManager.prototype = {
    /**
     * The function will attempt to convert a timezone-less
     * ISO 8601 string to a UTC timezone.
     * If string has a timezone, regardless of whether it is UTC
     * or not, it will be returned.
     * @param  {string} e ISO 8601 
     * @returns {string}   ISO 8601 with timezone (UTC if possible)
     */ 
    processTimeToUTC: function(e){
        if (/[Z]$|([+-]\d{2}:\d{2})$/.test(e) ) {
            return e;
        }
        else {
            return e + 'Z'; //Z: ISO 8601 UTC Timezone
        }
    },
    /**
     * Compares a Moment object to the Python datetime.min time
     * @param  {Moment}  t [Time to compare]
     * @returns {boolean}   []
     */
    isMinTime: function(t){
        var tmp; 
        if (!Moment.isMoment(t)){
            tmp = Moment(t).utc();            
        }
        else tmp = t;
        return this.minTime.isSame(tmp);
  }
};

/**
 * Facebook access token model
 * Frontend model for :py:class:`assembl.models.facebook_integration.FacebookAccessToken`
 * @class app.models.social.FacebookAccessToken
 * @extends app.models.base.BaseModel
 */

var FacebookAccessToken = Base.Model.extend({
   constructor: function FacebookAccessToken() {
    Base.Model.apply(this, arguments);
  },

   urlRoot: function(){
        var fbId = Ctx.getCurrentUserFacebookAccountId();
        if (!fbId) {
            throw new Error("There is no Facebook Account for this user");
        }
        else {
            var route = Ctx.getApiV2DiscussionUrl('/all_users/current/accounts/') +
                Ctx.extractId(fbId) + "/access_tokens";
            return route;
        }
    },
    defaults: {
        fb_account_id: null,
        token: null,
        expiration: null,
        token_type: null,
        object_name: null,
        object_fb_id: null,
        '@view': null,
        '@type': null
    },

    isExpired: function(){
        var t = new tokenTimeManager().processTimeToUTC(this.get('expiration'));
        var d = new Moment(t).utc();
        var now = new Moment.utc();
        return now.isAfter(d);
    },

    isMinimumTime: function(){
        return new Time().isMinTime(this.get('expiration'));
    },

    isInfiniteToken: function(){
        //Backend will return a property, is_infinite_token
        return this.get('is_infinite_token') === false;
    },

    isUserToken: function(){
        return this.get('token_type') === 'user';
    },

    isPageToken: function(){
        return this.get('token_type') === 'page';
    }, 

    isGroupToken: function(){
        return this.get('token_type') === 'group';
  }
});

/**
 * Facebook access token collection
 * @class app.models.social.FacebookAccessToken
 * @extends app.models.base.BaseCollection
 */

var FacebookAccessTokens = Base.Collection.extend({
   constructor: function FacebookAccessTokens() {
    Base.Collection.apply(this, arguments);
  },
  //Things to add: Promise function to get the agent model
  //represented by this model.
  model: FacebookAccessToken,
  url: function() {
    var fbId = Ctx.getCurrentUserFacebookAccountId();
    if (!fbId) {
      throw new Error("There is no Facebook Account for this user");
    }
    else {
      var route = Ctx.getApiV2DiscussionUrl('/all_users/current/accounts/') +
          Ctx.extractId(fbId) + "/access_tokens";
      return route;
    }
  },
  getUserToken: function() {
    var tmp = this.find(function(model) { return model.isUserToken(); });
    if (!tmp) return null;
    else return tmp;
  },

  hasUserToken: function() {
    var tmp = this.find(function(model) { return model.isUserToken(); });
    if (!tmp) return false;
    else return true;
  }
});

export default {
  Facebook: {
    Token: {
      Model: FacebookAccessToken,
      Collection: FacebookAccessTokens,
      Time: tokenTimeManager
    } 
  }
}

