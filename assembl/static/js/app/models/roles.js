/**
 * A role that the user is granted in this discussion
 * @module app.models.roles
 */

import Base from './base.js';

import Ctx from '../common/context.js';
import Roles from '../utils/roles.js';
import Types from '../utils/types.js';
import Analytics from '../internal_modules/analytics/dispatcher.js';

/**
 * Role model
 * Frontend model for :py:class:`assembl.models.auth.LocalUserRole`
 * @class app.models.roles.roleModel
 * @extends app.models.base.BaseModel
 */

var roleModel = Base.Model.extend({
  constructor: function roleModel() {
    Base.Model.apply(this, arguments);
  },

  urlRoot: Ctx.getApiV2DiscussionUrl("/all_users/current/local_roles"),

  defaults: {
    'requested': false,
    'discussion': null,
    'role': null,
    'user': null,
    '@id': null,
    '@type': null,
    '@view': null
  },

  validate: function(attrs, options) {
    /**
     * check typeof variable
     * */
  }

});

/**
 * Roles collection
 * @class app.models.roles.roleCollection
 * @extends app.models.base.BaseCollection
 */

var roleCollection = Base.Collection.extend({
  constructor: function roleCollection() {
    Base.Collection.apply(this, arguments);
  },

  url: function() {
    if (Ctx.isAdminApp()) {
      return Ctx.getApiV2Url("/"+Types.USER+"/"+Ctx.getCurrentUserId()+"/roles")
    } else {
      return Ctx.getApiV2DiscussionUrl("/all_users/current/local_roles")
    }
  },
  model: roleModel,


  /** This method needs to change once subscription has it's own table 
   *
   */
  isUserSubscribedToDiscussion: function() {
    //console.log("isUserSubscribedToDiscussion returning", this.hasRole(Roles.PARTICIPANT))
    return this.hasRole(Roles.PARTICIPANT);
  },

  /**
   * @param  {Role}  The role
   * @returns {boolean} True if the user has the given role
   */
  hasRole: function(role) {
    var roleFound =  this.find(function(local_role) {
      return local_role.get('role') === role;
    });
    return roleFound !== undefined;
  },

  UnsubscribeUserFromDiscussion: function() {
    var that = this;

    var role =  this.find(function(local_role) {
      return local_role.get('role') === Roles.PARTICIPANT;
    });

    role.destroy({
      success: function(model, resp) {
        that.remove(model);
        var analytics = Analytics.getInstance();
        analytics.trackEvent(analytics.events.LEAVE_DISCUSSION);
      },
      error: function(model, resp) {
        console.error('ERROR: unSubscription failed', resp);
      }});
  }
});

export default {
  Model: roleModel,
  Collection: roleCollection
};
