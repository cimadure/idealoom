/**
 * A partner organization, to be displayed in front page
 * @module app.models.partners
 */

import $ from 'jquery';
import Base from './base.js';
import i18n from '../utils/i18n.js';
import Ctx from '../common/context.js';


/**
 * Partner model
 * Frontend model for :py:class:`assembl.models.auth.PartnerOrganization`
 * @class app.models.partners.PartnerOrganizationModel
 * @extends app.models.base.BaseModel
 */
var PartnerOrganizationModel = Base.Model.extend({
  constructor: function PartnerOrganizationModel() {
    Base.Model.apply(this, arguments);
  },

  /**
   * @type {string}
   */
  urlRoot: Ctx.getApiV2DiscussionUrl('partner_organizations'),

  /**
   * Defaults
   * @type {Object}
   */

  defaults: {
    name: '',
    description: '',
    homepage: '',
    logo: '',
    is_initiator: false
  },

  validate: function(attrs, options) {
    /**
     * check typeof variable
     * */
     
  }
});

/**
 * Partner collection
 * @class app.models.partners.PartnerOrganizationCollection
 * @extends app.models.base.BaseCollection
 */
var PartnerOrganizationCollection = Base.Collection.extend({
  constructor: function PartnerOrganizationCollection() {
    Base.Collection.apply(this, arguments);
  },

  /**
   * @type {string}
   */
  url: Ctx.getApiV2DiscussionUrl('partner_organizations'),

  /**
   * The model
   * @type {PartnerOrganizationModel}
   */
  model: PartnerOrganizationModel
});

export default {
  Model: PartnerOrganizationModel,
  Collection: PartnerOrganizationCollection
};
