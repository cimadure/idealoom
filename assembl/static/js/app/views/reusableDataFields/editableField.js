/**
 * 
 * @module app.views.reusableDataFields.editableField
 */

import $ from 'jquery';
import Marionette from 'backbone.marionette';
import _ from 'underscore';
import Assembl from '../../app.js';
import Ctx from '../../common/context.js';

var EditableField = Marionette.View.extend({
  constructor: function EditableField() {
    Marionette.View.apply(this, arguments);
  },

  template: _.template(""),
  initialize: function(options) {
    this.view = this;

    this.canEdit = (_.has(options, 'canEdit')) ? options.canEdit : true;
    this.modelProp = (_.has(options, 'modelProp')) ? options.modelProp : null;
    this.placeholder = (_.has(options, 'placeholder')) ? options.placeholder : null;
    this.focus = (_.has(options, 'focus')) ? options.focus : null;

    if (this.model === null) {
      throw new Error('EditableField needs a model');
    }

    this.listenTo(this.view, 'EditableField:render', this.render);
  },

  events: {
    'blur': 'onBlur',
    'keydown': 'onKeyDown'
  },

  getTextValue: function() {
    return this.model.get(this.modelProp);
  },

  setTextValue: function(text) {
    this.model.save(this.modelProp, text, {
      success: function(model, resp) {},
      error: function(model, resp) {
        console.error('ERROR: saveEdition', resp.responseJSON);
      }
    });
  },

  onRender: function() {
    if (this.canEdit) {
      if (!(this.$el.attr('contenteditable'))) {
        this.$el.attr('contenteditable', true);
      }

      this.$el.addClass('canEdit panel-editablearea');
      if (this.focus) {
        if (Ctx.debugRender) {
          console.log("EditableField:onRender() stealing browser focus");
        }
        this.$el.focus();
      }
    }

    var text = this.getTextValue();
    this.el.innerHTML = text || this.placeholder;
  },

  /**
   * Renders inside the given jquery or HTML elemenent given
   * @param {jQuery|HTMLElement|string} el
   */
  renderTo: function(el) {
    $(el).append(this.$el);
    this.view.trigger('EditableField:render');
  },

  onBlur: function(ev) {
    if (this.canEdit) {
      this.focus = false;
      var data = Ctx.stripHtml(ev.currentTarget.textContent);
      data = $.trim(data);

      if (data != this.placeholder || data == '') {
        /* we never save placeholder values to the model */
        if (this.getTextValue() != data) {
          /* Nor save to the database and fire change events
           * if the value didn't change from the model
           */
          this.setTextValue(data);
        }
      }
    }
  },

  onKeyDown: function(ev) {
    if (ev.which === 13 || ev.which === 27) {
      ev.preventDefault();
      $(ev.currentTarget).trigger('blur');
      return false;
    }
  }

});

export default EditableField;
