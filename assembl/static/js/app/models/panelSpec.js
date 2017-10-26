/**
 * Represents a panel in the interface. When added to the collection, the matching view (panelWrapper) will be instanciated
 * @module app.models.panelSpec
 */

import Base from './base.js';

import PanelSpecTypes from '../utils/panelSpecTypes.js';

/**
 * Panel specification model
 * @class app.models.panelSpec.PanelSpecModel
 * @extends app.models.base.BaseModel
 */

var PanelSpecModel = Base.Model.extend({
  constructor: function PanelSpecModel() {
    Base.Model.apply(this, arguments);
  },

  defaults: {
    type: '',
    hidden: false,
    locked: false,
    minWidth:40
  },
  
  /** This returns undefined if the model is valid */
  validate: function(attributes, options) {
    var viewsFactory = require('../objects/viewsFactory.js').default;
    if (viewsFactory === undefined) {
      throw new Error("You must define viewsFactory to run validation");
    }

    var view;
    try {
      view = viewsFactory.byPanelSpec(this);
      if (view === undefined) {
        return "The view is undefined";
      }
    }
    catch (err) {
      return "An exception was thrown trying to create the view for this panelSpec";
    }

    //Everything ok
  },

  /**
   @returns an instance of PanelSpecType, or throws an exception
   */
  getPanelSpecType: function(psType) {
      return PanelSpecTypes.getByRawId(this.get('type'));
    },

  isOfType: function(psType) {
      return PanelSpecTypes.getByRawId(this.get('type')) == psType;
    }
});

/**
 * Panel specifications collection
 * @class app.models.panelSpec.PanelSpecs
 * @extends app.models.base.BaseCollection
 */

var PanelSpecs = Base.Collection.extend({
  constructor: function PanelSpecs() {
    Base.Collection.apply(this, arguments);
  },

  model: PanelSpecModel,
  
  validate: function(attributes, options) {
    var invalid = [];
    this.each(function(panelSpec) {
      if (!panelSpec.isValid()) {
        invalid.push(panelSpec);
      }
    });
    if (invalid.length) {
      this.remove(invalid);
    }

    return (this.length > 0);
  }
});

export default {
  Model: PanelSpecModel,
  Collection: PanelSpecs
};
