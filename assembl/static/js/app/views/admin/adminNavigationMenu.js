'use strict';
/**
 * 
 * @module app.views.admin.adminNavigationMenu
 */

var Marionette = require('../../shims/marionette.js'),
    $ = require('jquery'),
    i18n = require('../../utils/i18n.js'),
    Permissions = require('../../utils/permissions.js'),
    Ctx = require('../../common/context.js');

var adminNavigationMenu = Marionette.LayoutView.extend({
  constructor: function adminNavigationMenu() {
    Marionette.LayoutView.apply(this, arguments);
  },

  template: '#tmpl-adminNavigationMenu',
  tagName: 'nav',
  className: 'sidebar-nav',
  selectedSection: undefined,

  initialize: function(options) {
    if ( "selectedSection" in options ){
      this.selectedSection = options.selectedSection;
    }
  },

  serializeData: function() {
    return {
      selectedSection: this.selectedSection,
      is_sysadmin: Ctx.getCurrentUser().can(Permissions.SYSADMIN),
    };
  },

  templateHelpers: function() {
    return {
      urlDiscussion: function() {
        return '/' + Ctx.getDiscussionSlug() + '/';
      }
    }
  }
});

module.exports = adminNavigationMenu;
