/**
 * Description of the columns of classified messages under an idea
 * @module app.models.timeline
 */
import _ from 'underscore';

import Base from './base.js';
import LangString from './langstring.js';
import Moment from 'moment';
import Ctx from '../common/context.js';

/**
 * A category of classified messages under an idea
 * Frontend model for :py:class:`assembl.models.idea_msg_column.TimelineEvent`
 * @class app.models.timeline.TimelineEventModel
 * @extends app.models.base.BaseModel
 */
var TimelineEventModel = Base.Model.extend({
  /**
   * @function app.models.timeline.TimelineEventModel.initialize
   */
  initialize: function(obj) {
    obj = obj || {};
    var that = this;
  },
  /**
   * Defaults
   * @type {Object}
   */
  defaults: {
    'discussion': null,
    '@type': 'DiscussionPhase',
    'previous_event': null,
    'title': null,
    'description': null,
    "identifier": null,
    'image_url': null,
    'start': null,
    'end': null,
  },
  parse: function(rawModel) {
    if (rawModel.title !== undefined) {
      rawModel.title = new LangString.Model(rawModel.title, {parse: true});
    }
    if (rawModel.description !== undefined) {
      rawModel.description = new LangString.Model(rawModel.description, {parse: true});
    }
    return rawModel;
  },

  asLocalTime: function(time) {
      time = Moment.utc(time);
      time.utcOffset(Moment().utcOffset());
      return time.format().substring(0, 19);
  },

  getStartNoTZ: function() {
    var start = this.get('start');
    if (start !== null) {
      return this.asLocalTime(start);
    }
    return start;
  },
  getEndNoTZ: function() {
    var end = this.get('end');
    if (end !== null) {
      return this.asLocalTime(end);
    }
    return end;
  },
});

/**
 * The collection of categories of classified messages under an idea
 * @class app.models.timeline.TimelineEventCollection
 * @extends app.models.base.BaseCollection
 */
var TimelineEventCollection = Base.Collection.extend({
  /**
   * The model
   * @type {TimelineEventModel}
   */
  model: TimelineEventModel,
  /**
   * @member {string} app.models.timeline.TimelineEventCollection.url
   */
  url: function() {
    return Ctx.getApiV2DiscussionUrl() + 'timeline_events';
  },

  comparator: function(e1, e2) {
    // Sorting a chained list.
    // in theory, this can fail if links of the chain are missing.
    // in practice, the collections are tiny, and this should not be an issue.
    // To be sure, re-sort once the collection is complete.
    var e1p = e1.get("previous_event");

    var e2p = e2.get("previous_event");
    if (e1.id == e2p) {
      return -1;
    } else if (e2.id == e1p) {
      return 1;
    } else if (e1p === null) {
      return -1;
    } else if (e2p === null) {
      return 1;
    } else {
      e1 = this.get(e1p);
      if (e1 !== undefined) {
        return this.comparator(e1, e2);
      }
      e2 = this.get(e2p);
      if (e2 !== undefined) {
        return this.comparator(e1, e2);
      }
      return undefined;
    }
  },

});

export default {
  Model: TimelineEventModel,
  Collection: TimelineEventCollection,
};

