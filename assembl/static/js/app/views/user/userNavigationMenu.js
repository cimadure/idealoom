'use strict';
/**
 * 
 * @module app.views.user.userNavigationMenu
 */

var Marionette = require('backbone.marionette'),
    $ = require('jquery'),
    i18n = require('../../utils/i18n.js'),
    Ctx = require('../../common/context.js'),
    CollectionManager = require('../../common/collectionManager.js'),
    Roles = require('../../utils/roles.js'),
    Permissions = require('../../utils/permissions.js');

var userNavigationMenu = Marionette.View.extend({
  constructor: function userNavigationMenu() {
    Marionette.View.apply(this, arguments);
  },

  template: '#tmpl-loader',
  tagName: 'nav',
  className: 'sidebar-nav',
  selectedSection: undefined,

  initialize: function(options) {
    var that = this,
        collectionManager = new CollectionManager();

    if ( "selectedSection" in options ){
      this.selectedSection = options.selectedSection;
    }
    collectionManager.getLocalRoleCollectionPromise().then(function(localRoles) {
      if(!that.isDestroyed()) {
        that.localRoles = localRoles;
        that.template = '#tmpl-userNavigationMenu';
        that.render();
      }
     
    });
  },

  serializeData: function() {
    if(this.template === '#tmpl-loader') {
      return {};
    }
    return {
      selectedSection: this.selectedSection,
      currentUser: Ctx.getCurrentUser(),
      Permissions: Permissions,
      Roles: Roles,
      localRoles: this.localRoles
    };
  },

  templateContext: function() {
    return {
      urlDiscussion: function() {
        return '/' + Ctx.getDiscussionSlug() + '/';
      }
    }
  }
});

module.exports = userNavigationMenu;
