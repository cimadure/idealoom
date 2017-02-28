'use strict';
/**
 * Represent an idea
 * @module app.models.idea
 */
var _ = require('underscore'),
    Promise = require('bluebird'),
    Base = require('./base.js'),
    Ctx = require('../common/context.js'),
    i18n = require('../utils/i18n.js'),
    Types = require('../utils/types.js'),
    Attachment = require('./attachments.js'),
    Permissions = require('../utils/permissions.js');
/**
 * Idea model
 * Frontend model for :py:class:`assembl.models.idea.Idea`
 * @class app.models.idea.IdeaModel
 * @extends app.models.base.BaseModel
 */
var IdeaModel = Base.Model.extend({
  /**
   * @function app.models.idea.IdeaModel.constructor
   */
  constructor: function IdeaModel() {
    Base.Model.apply(this, arguments);
  },
  /**
   * @function app.models.idea.IdeaModel.initialize
   */
  initialize: function(obj) {
    obj = obj || {};
    var that = this;
    obj.creationDate = obj.creationDate || Ctx.getCurrentTime();
    this.set('creationDate', obj.creationDate);
    this.set('hasCheckbox', Ctx.getCurrentUser().can(Permissions.EDIT_SYNTHESIS));
    this.adjust_num_read_posts(obj);
  },
  /**
   * Set the number of read posts
   * @function app.models.idea.IdeaModel.adjust_num_read_posts
   */
  adjust_num_read_posts: function(resp) {
    if (resp.num_total_and_read_posts !== undefined) {
      this.set('num_posts', resp.num_total_and_read_posts[0]);
      this.set('num_contributors', resp.num_total_and_read_posts[1]);
      this.set('num_read_posts', resp.num_total_and_read_posts[2]);
    }
  },
  /**
   * Returns the attributes hash to be set on the model
   * @function app.models.idea.IdeaModel.parse
   */
  parse: function(resp, options) {
    var that = this;
    this.adjust_num_read_posts(resp);
    if (resp.attachments !== undefined){
      resp.attachments = new Attachment.ValidationAttachmentCollection(resp.attachments, {
        parse: true,
        objectAttachedToModel: that,
        limits: {
          count: 1,
          type: 'image'
        }
      })
    }
    return Base.Model.prototype.parse.apply(this, arguments);
  },

  getApiV2Url: function() {
    return Ctx.getApiV2DiscussionUrl('/ideas/'+this.getNumericId());
  },

  /**
   * @member {string} app.models.idea.IdeaModel.urlRoot
   */
  urlRoot: Ctx.getApiUrl("ideas"),
  /**
   * Defaults
   * @type {Object}
   */
  defaults: {
    shortTitle: '',
    longTitle: '',
    definition: '',
    numChildIdea: 0,
    num_posts: 0,
    num_read_posts: 0,
    isOpen: true,
    hidden: false,
    hasCheckbox: false,
    original_uri: null,
    is_tombstone: false,
    subtype: "idea:GenericIdeaNode",
    featured: false,
    active: false,
    parentId: null,
    widget_links: [],
    order: 1,
    creationDate: null
  },
  //The following should be mostly in view code, but currently the longTitle editor code isn't common in ideaPanel and synthesisView. At least this is mostly DRY.
  /**
   * Returns the display text for a idea definition.
   * Will return the first non-empty from: definition, longTitle, i18n.gettext('Add a definition for this idea')
   * @returns {string}
   * @function app.models.idea.IdeaModel.getDefinitionDisplayText
   */
  getDefinitionDisplayText: function() {
    if (this.get('root') === true) {
      return i18n.gettext('The root idea will not be in the synthesis');
    }

    if (Ctx.stripHtml(this.get('definition'))) {
      return this.get('definition');
    }
    else if (Ctx.stripHtml(this.get('longTitle'))) {
      return this.get('longTitle');
    }
    else {
      if (Ctx.getCurrentUser().can(Permissions.EDIT_IDEA))
          return i18n.gettext('Add a description of this idea');
      else
          return "";
    }
  },
  /**
   * Returns the display text for a idea synthesis expression. Will return the first non-empty from: longTitle, shortTitle, i18n.gettext('Add and expression for the next synthesis')
   * @returns {string}
   * @function app.models.idea.IdeaModel.getLongTitleDisplayText
   */
  getLongTitleDisplayText: function() {
      if (this.get('root') === true) {
        return i18n.gettext('The root idea will never be in the synthesis');
      }

      if (Ctx.stripHtml(this.get('longTitle'))) {
        return this.get('longTitle');
      }
      else if (Ctx.stripHtml(this.get('shortTitle'))) {
        return this.get('shortTitle');
      }
      else if (Ctx.stripHtml(this.get('definition'))) {
        return this.get('definition');
      }
      else {
        return i18n.gettext('You can add an expression for the next synthesis');
      }
    },

  /**
   * HTML Striping if necessary is the responsability of the caller.
   * @returns {string} The short Title to be displayed
   * @function app.models.idea.IdeaModel.getShortTitleDisplayText
   */
  getShortTitleDisplayText: function() {
    if (this.isRootIdea()) {
      return i18n.gettext('All posts');
    }
    else if (Ctx.stripHtml(this.get('shortTitle'))) {
      return this.get('shortTitle');
    }
    else if (Ctx.stripHtml(this.get('longTitle'))) {
      return this.get('longTitle');
    }
    else if (Ctx.stripHtml(this.get('definition'))) {
      return this.get('definition');
    }
    else {
      return i18n.gettext('New idea');
    }
  },
  /**
   * Returns true if the current idea is the root idea
   * @returns {boolean}
   * @function app.models.idea.IdeaModel.isRootIdea
   */
  isRootIdea: function() {
    return this.get('@type') === Types.ROOT_IDEA;
  },
  /**
   * Adds an idea as child
   * @param  {Idea} idea
   * @function app.models.idea.IdeaModel.addChild
   */
  addChild: function(idea) {
    this.collection.add(idea);
    if (this.isDescendantOf(idea)) {
      this.save('parentId', null);
    }
    idea.save({
        'order': this.getOrderForNewChild(),
            'parentId': this.getId()}, {
              success: function(model, resp) {
            },
              error: function(model, resp) {
                console.error('ERROR: addChild', resp);
              }
            });
  },
  /**
   * Adds an idea as sibling above
   * @param {Idea} idea
   * @function app.models.idea.IdeaModel.addSiblingAbove
   */
  addSiblingAbove: function(idea) {
    var parent = this.getParent(),
        parentId = parent ? parent.getId() : null,
        index = this.collection.indexOf(this),
        order = this.get('order') - 0.1;
    this.collection.add(idea, { at: index });
    idea.attributes.parentId = parentId;
    idea.attributes.order = order;
    idea.trigger('change:parentId');
    if (parent) {
      parent.updateChildrenOrder();
    } else {
      this.collection.updateRootIdeasOrder();
    }
  },
  /**
   * Adds an idea as sibling below
   * @param {Idea} idea
   * @function app.models.idea.IdeaModel.addSiblingBelow
   */
  addSiblingBelow: function(idea) {
    var parent = this.getParent(),
        parentId = parent ? parent.getId() : null,
        index = this.collection.indexOf(this) + 1,
        order = this.get('order') + 0.1;
    this.collection.add(idea, { at: index });
    idea.attributes.parentId = parentId;
    idea.attributes.order = order;
    idea.trigger('change:parentId');
    if (parent) {
      parent.updateChildrenOrder();
    } else {
      this.collection.updateRootIdeasOrder();
    }
  },
  /**
   * Return all children's idea
   * @returns {Array}
   * @function app.models.idea.IdeaModel.getChildren
   */
  getChildren: function() {
    return this.collection.where({ parentId: this.getId() });
  },
  /**
   * Return the parent idea
   * @returns {Object} or undefined
   * @function app.models.idea.IdeaModel.getParent
   */
  getParent: function() {
    return this.collection.findWhere({ '@id': this.get('parentId') });
  },
  /**
   * Return if the idea is descendant of the given idea
   * @param {Object} idea
   * @returns {boolean}
   * @function app.models.idea.IdeaModel.isDescendantOf
   */
  isDescendantOf: function(idea) {
    var parentId = this.get('parentId');
    if (parentId === idea.getId()) {
      return true;
    }
    return parentId === null ? false : this.getParent().isDescendantOf(idea);
  },
  /**
   * Returns an array of Idea models in order of ancestry From current idea -> parent idea, including the current idea itself.
   * @returns {Array}
   * @function app.models.idea.IdeaModel.getAncestry
   */
  getAncestry: function(){
    var ideas = [];
    function rec(idea){
      if (idea) {
        if (! idea.isRootIdea() ) {
          ideas.push(idea);
        }
        if ( idea.getParent() ) {
          rec(idea.getParent() )
        }
      }
    };
    rec(this);
    return ideas.reverse();
  },
  /**
   * Returns the indentantion level
   * @returns {number}
   * @function app.models.idea.IdeaModel.getLevel
   */
  getLevel: function() {
    var counter = 0,
        parent = this;
    do {
      if (parent.get('root') === true)
          break;
      parent = parent.get('parentId') !== null ? parent.getParent() : null;
      counter += 1;
    } while (parent);
    return counter;
  },
  /**
   * Returns the order number for a new child
   * @returns {number}
   * @function app.models.idea.IdeaModel.getOrderForNewChild
   */
  getOrderForNewChild: function() {
    return this.getChildren().length + 1;
  },
  /** Return a promise for all Extracts models for this idea
   * @returns {Promise}
   * @function app.models.idea.IdeaModel.getExtractsPromise
   */
  getExtractsPromise: function() {
    var that = this;
    return this.collection.collectionManager.getAllExtractsCollectionPromise()
            .then(function(allExtractsCollection) {
              return Promise.resolve(allExtractsCollection.where({idIdea: that.getId()}))
                    .catch(function(e) {
                      console.error(e.statusText);
                    });
            }
        );
  },
  /**
   * Returns a promise for the announcement to be displayed in the message-list, if any
   * @returns {Promise}
   * @function app.models.idea.IdeaModel.getApplicableAnnouncementPromise
   */
  getApplicableAnnouncementPromise: function() {
    var that = this;
    return this.collection.collectionManager.getAllAnnouncementCollectionPromise()
            .then(function(allAnnouncementCollection) {
              var announcement = undefined,
                  counter = 0,
                  parent = that,
                  condition;
              do {
                if( counter === 0 ) {
                  announcement = allAnnouncementCollection.findWhere(
                      {idObjectAttachedTo: parent.id}
                      );
                }
                else {
                  announcement = allAnnouncementCollection.findWhere(
                      {idObjectAttachedTo: parent.id,
                       should_propagate_down: true}
                      );
                }
                if (announcement)
                  break;
                parent = parent.get('parentId') !== null ? parent.getParent() : null;
                counter += 1;
              } while (parent);
              return Promise.resolve(announcement);
            }
        );
  },
  /**
   * Adds a segment
   * @param  {Object} segment
   * @function app.models.idea.IdeaModel.addSegment
   */
  addSegment: function(segment) {
    segment.save('idIdea', this.getId(), {
      success: function(model, resp) {
            },
      error: function(model, resp) {
        console.error('ERROR: addSegment', resp);
      }
    });
  },
  /**
   * Creates a new instance of a segment as a child within the collection and returns the newly created idea.
   * @param {Segment} segment, possibly unsaved.
   * @returns {Object}
   * @function app.models.idea.IdeaModel.addSegmentAsChild
   */
  addSegmentAsChild: function(segment) {
    delete segment.attributes.highlights;
    var data = {
      shortTitle: segment.getQuote().substr(0, 50),
      longTitle: segment.getQuote(),
      parentId: this.getId(),
      order: this.getOrderForNewChild()
    };
    var onSuccess = function(idea) {
      idea.addSegment(segment);
    };
    return this.collection.create(data, { success: onSuccess });
  },
  /**
   * Updates the order in all children
   * @function app.models.idea.IdeaModel.updateChildrenOrder
   */
  updateChildrenOrder: function() {
    var children = _.sortBy(this.getChildren(), function(child) {
      return child.get('order');
    }),
    currentOrder = 1;
    _.each(children, function(child) {
      child.save('order', currentOrder, {
        success: function(model, resp) {
                },
        error: function(model, resp) {
          console.error('ERROR: updateChildrenOrder', resp);
        }
      });
      currentOrder += 1;
    });
  },
  /**
   * Set a hash of attributes on the model.
   * @param {String} key
   * @param {val} val
   * @param {Object} options
   * @returns {Object}
   * @function app.models.idea.IdeaModel.set
   */
  set: function(key, val, options) {
    if (typeof key === 'object') {
      var attrs = key;
      options = val;
      if (attrs['parentId'] === null && this.id !== undefined && attrs['root'] !== true) {
        var id = attrs['@id'];
        var links = this.collection.collectionManager._allIdeaLinksCollection.where({target: id});
        if (links.length > 0) {
          attrs['parents'] = _.map(links, function(l) {
            return l.get('source')
          });
          attrs['parentId'] = attrs['parents'][0];
        }
      }
      return Backbone.Model.prototype.set.call(this, attrs, options);
    } else {
      return Backbone.Model.prototype.set.call(this, key, val, options);
    }
  },
  /**
   * Validate the model attributes
   * @function app.models.idea.IdeaModel.validate
   */
  validate: function(attributes, options) {
    /**
     * check typeof variable
     * */
     
     //Add validation for the attachment collection of ideas
     

  }
});
/**
 * Ideas collection
 * @class app.models.idea.IdeaCollection
 * @extends app.models.base.BaseCollection
 */
var IdeaCollection = Base.Collection.extend({
  /**
   * @function app.models.idea.IdeaCollection.constructor
   */
  constructor: function IdeaCollection() {
    Base.Collection.apply(this, arguments);
  },
  /**
   * @member {string} app.models.idea.IdeaCollection.url
   */
  url: Ctx.getApiUrl("ideas"),
  /**
   * The model
   * @type {IdeaModel}
   */
  model: IdeaModel,
  /**
   * Returns the root idea
   * @returns {Object}
   * @function app.models.idea.IdeaCollection.getRootIdea
   */
  getRootIdea: function() {
    var retval = this.findWhere({ '@type': Types.ROOT_IDEA });
    if (!retval) {
      _.forEach(this.models, function(model) {
        console.log(model.get('@type'));
      })
      console.error("getRootIdea() failed!");
    }
    return retval;
  },
  /**
   * Returns the order number for a new root idea
   * @returns {Number}
   * @function app.models.idea.IdeaCollection.getOrderForNewRootIdea
   */
  getOrderForNewRootIdea: function() {
    var lastIdea = this.last();
    return lastIdea ? lastIdea.get('order') + 1 : 0;
  },
  /**
   * Updates the order in the idea list
   * @function app.models.idea.IdeaCollection.updateRootIdeasOrder
   */
  updateRootIdeasOrder: function() {
    var children = this.where({ parentId: null }),
        currentOrder = 1;
    _.each(children, function(child) {
      child.save('order', currentOrder, {
        success: function(model, resp) {
                },
        error: function(model, resp) {
          console.error('ERROR: updateRootIdeasOrder', resp);
        }
      });
      currentOrder += 1;
    });
  },
  /**
   * @param {Object} idea_links - The collection of idea_links to navigate
   * @param {Object} visitor - Visitor function
   * @param {String} origin_id - the id of the root
   * @param {Object} ancestry - Internal recursion parameter, do not set or use
   * @function app.models.idea.IdeaCollection.visitDepthFirst
   */
  visitDepthFirst: function(idea_links, visitor, origin_id, include_ts, ancestry, includeHidden) {
    if (ancestry === undefined) {
      ancestry = [];
    }
    var that = this,
        idea = this.get(origin_id);
    if (idea !== undefined && idea.get('is_tombstone') && include_ts !== true) {
      return;
    }
    if (idea !== undefined && includeHidden !== true && idea.get('hidden')) {
      return;
    }
    if (idea === undefined || visitor.visit(idea, ancestry)) {
      ancestry = ancestry.slice(0);
      ancestry.push(origin_id);
      var child_links = _.sortBy(
          idea_links.where({ source: origin_id }),
                function(link) {
                  return link.get('order');
                });
      // break most cycles. (TODO: handle cycles of missing ideas)
      child_links = child_links.filter(function(l) {
        return ancestry.indexOf(l.get('target')) === -1;
      });
      var results = _.map(child_links, function(child_link) {
        return that.visitDepthFirst(idea_links, visitor, child_link.get('target'), include_ts, ancestry, includeHidden);
      });
      return visitor.post_visit(idea, results);
    }
  },
  /**
   * @param {Object} idea_links - The collection of idea_links to navigate
   * @param {Object} visitor - Visitor function
   * @param {String} origin_id - the id of the root
   * @param {Object} ancestry - Internal recursion parameter, do not set or use
   * @function app.models.idea.IdeaCollection.visitBreadthFirst
   */
  visitBreadthFirst: function(idea_links, visitor, origin_id, include_ts, ancestry, includeHidden) {
    var that = this,
        continue_visit = true,
        idea = this.get(origin_id);
    if (idea !== undefined && includeHidden !== true && idea.get('hidden')) {
      return;
    }
    if (ancestry === undefined) {
      ancestry = [];
      if (idea !== undefined) {
        continue_visit = visitor.visit(idea, ancestry);
      }
    }
    if (continue_visit) {
      ancestry = ancestry.slice(0);
      ancestry.push(origin_id);
      var child_links = _.sortBy(
          idea_links.where({ source: origin_id }),
                function(link) {
                  return link.get('order');
                });
      // break most cycles. (TODO: handle cycles of missing ideas)
      child_links = child_links.filter(function(l) {
        return ancestry.indexOf(l.get('target')) === -1;
      });
      var children_to_visit = [];
      for (var i in child_links) {
        var link = child_links[i],
            target_id = link.get('target'),
            target = this.get(target_id);
        if (target.get('is_tombstone') && include_ts !== true)
            continue;
        if (visitor.visit(target, ancestry)) {
          children_to_visit.push(target_id);
        }
      }
      var results = _.map(children_to_visit, function(child) {
        that.visitBreadthFirst(idea_links, visitor, child, include_ts, ancestry, includeHidden);
      });
      return visitor.post_visit(idea, results);
    }
  }
});

module.exports = {
  Model: IdeaModel,
  Collection: IdeaCollection
};

