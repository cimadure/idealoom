/**
 * 
 * @module app.views.postFilters
 */

import Ctx from '../common/context.js';

import i18n from '../utils/i18n.js';
import CollectionManager from '../common/collectionManager.js';
import Promise from 'bluebird';

var collectionManager = new CollectionManager();

/** Base interface of all filters */
function AbstractFilter() {
    this._values = [];
  }

AbstractFilter.prototype = {
    /**
     * @returns true if a value was actually added to the filter, false otherwise
     * (tried to add a duplicate value)
     */
    addValue: function(value) {
      if (!this.isValueInFilter(value)) {
        var index = _.sortedIndex(this._values, value);
        this._values.splice(index, 0, value)

        //console.log("AbstractFilter.addValue added value", value, "value are now:", this._values);
        return true;
      }
      else {
        return false;
      }
    },
    
    /**
     * @returns true if a value was actually deleted from the filter, false otherwise
     * (tried to add a duplicate value)
     */
    deleteValue: function(value) {
      //console.log("deleteValue called with",value, "on values", this._values);
      var indexOfValue = _.indexOf(this._values, value, true);
      console.log(indexOfValue);
      
      if (indexOfValue !== -1) {
        this._values.splice(indexOfValue, 1);

        //console.log("deleteValue cleared something, values is now", this._values);
        return true
      }
      else {
        return false;
      }
    },
    
    /**
     * @returns true if a value was actually deleted from the filter, false otherwise
     * (tried to add a duplicate value)
     */
    deleteValueAtIndex: function(valueIndex) {
      //console.log("deleteValueAtIndex called with",valueIndex, "on values", this._values);
      
      if (valueIndex !== -1 && valueIndex !== null) {
        this._values.splice(valueIndex, 1)

        //console.log("deleteValueAtIndex cleared something, values is now", this._values);
        return true
      }
      else {
        return false;
      }
    },
    
    getValues: function() {
      return this._values;
    },
    
    isValueInFilter: function(value) {
      //console.log("isValueInFilter called with", value, ", ", this._values,"returning", _.contains(this._values, value));
      return _.contains(this._values, value);
    },
    
    /** Used for CSS ids, and finding filters in queries */
    getId: function() {
      throw new Error("Need to implement getId");
    },
    
    /** Generates a unique CSS class for a button to add the filter */
    getAddButtonCssClass: function() {
      return "js_filter-" + this.getId() + "-add-button";
    },
    
    getLabelPromise: function() {
      throw new Error("Need to implement getLabelPromise");
    },
    
    /** This is the text used for hover help 
     * @returns The help text, or null if none is available */
    getHelpText: function() {
      return null;
    },
    
    /** Get the name of the GET parameter on the server to put the value in 
     * @returns string */
    getServerParam: function() {
      throw new Error("Need to implement getServerParam");
    },
    
    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      var retval;
      retval = individualFilterValue;
      return Promise.resolve(individualFilterValue)
    },
    
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      var that = this;
      return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
        return that.getLabelPromise().then(function(label) {
          return i18n.sprintf(i18n.ngettext("%s (%s)", "%s (%s)", _.size(individualValuesButtons)), label, individualValuesButtons.join(', '));
        });
      });
    },
    
    /** Get a client side implementation of the filter, if it has one.
     * A client side implementation allows filtering on the client side if it's
     * faster */
    getClientSideImplementation: function() {
      throw new Error("RESERVED FOR FUTURE USE");
    },

    getIncompatibleFiltersIds: function() {
      return [];
    }
  }

/** For filters who can only have a single value */
function AbstractFilterSingleValue() {
    AbstractFilter.call(this);
  }

AbstractFilterSingleValue.prototype = Object.create(AbstractFilter.prototype)
_.extend(AbstractFilterSingleValue.prototype, {
    /** For filters who can only have a single, implicit value
     * Typically displayed in the filters menu */
    getImplicitValuePromise: function() {
      return undefined;
    },
    
    addValue: function(value) {
      if (!this.isValueInFilter(value)) {
        if (_.size(this._values) !== 0) {
          throw new Error("Filter can only have a single value, and we were provided" + value);
        }
      }

      return AbstractFilter.prototype.addValue.call(this, value);
    }
    
  });

/** For filters who can only have a single, true or false */
function AbstractFilterBooleanValue() {
    AbstractFilterSingleValue.call(this);
  }

AbstractFilterBooleanValue.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(AbstractFilterBooleanValue.prototype, {
    addValue: function(value) {
      //console.log("AbstractFilterBooleanValue::addValue called with", value)
      if (!this.isValueInFilter(value)) {
        if (!(value === true || value === false)) {
          console.log(value);
          throw new Error("Filter expects a boolean value, and we were provided with: " + value);
        }
      }

      return AbstractFilterSingleValue.prototype.addValue.call(this, value);
    },

    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      return this.getLabelPromise().then(function(label) {
        var retval = i18n.sprintf((individualFilterValue === true) ? i18n.gettext("%s") : i18n.gettext("NOT %s"), label);
        return retval;
      });

    }
  });

function FilterPostHasIdIn() {
    AbstractFilter.call(this);
  }

FilterPostHasIdIn.prototype = Object.create(AbstractFilter.prototype);
_.extend(FilterPostHasIdIn.prototype, {
    getId: function() {
      return 'post_has_id_in';
    },
    getServerParam: function() {
      return 'ids';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Posts with specific ids'));
    },
    
    getHelpText: function() {
      return i18n.gettext('Only include posts that are in a range of specific ids');
    }
  });

function FilterPostIsInContextOfIdea() {
    AbstractFilterSingleValue.call(this);
  }

FilterPostIsInContextOfIdea.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsInContextOfIdea.prototype, {
    getId: function() {
      return 'post_in_context_of_idea';
    },
    getServerParam: function() {
      return 'root_idea_id';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Related to idea'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages related to the specified idea.  The filter is recursive:  Messages related to ideas that are descendents of the idea are included.');
    },
    
    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      return Promise.join(
          collectionManager.getAllIdeasCollectionPromise(),
          collectionManager.getUserLanguagePreferencesPromise(Ctx),
          function(allIdeasCollection, translationData) {
            var idea = allIdeasCollection.get(individualFilterValue);
            if (!idea) {
              throw new Error('Idea ' + individualFilterValue + ' not found');
            }

            return '"' + idea.getShortTitleSafe(translationData) + '"';
          });
    },
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
        return i18n.sprintf(i18n.ngettext("Discuss idea %s", "Discuss ideas: %s", individualValuesButtons.length), individualValuesButtons.join(i18n.gettext(' AND ')));
      });
    }
  });

function FilterPostIsDescendentOfPost() {
    AbstractFilterSingleValue.call(this);
  }

FilterPostIsDescendentOfPost.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsDescendentOfPost.prototype, {
    getId: function() {
      return 'post_thread';
    },
    getServerParam: function() {
      return 'root_post_id';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Part of thread of'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that are in the specified post reply thread.');
    },
    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      return Promise.join(
            collectionManager.getMessageFullModelPromise(individualFilterValue),
            collectionManager.getUserLanguagePreferencesPromise(Ctx),
            function(post, ulp) {
              if (!post) {
                throw new Error('Post ' + individualFilterValue + ' not found');
              }
              var subject = post.get('subject');
              var subjectText = subject ? subject.bestValue(ulp.getTranslationData()) : '';

              if (post.get('@type') === "SynthesisPost") {
                return i18n.sprintf(i18n.gettext('synthesis "%s"'), subjectText);
              }
              else {
                return i18n.sprintf(i18n.gettext('message "%s"'), subjectText);
              }
            });
    },
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
        return i18n.sprintf(i18n.gettext("Are in the conversation that follows: %s"), individualValuesButtons.join(i18n.gettext(' AND ')));
      });
    }
  });

function FilterPostIsDescendentOrAncestorOfPost() {
    AbstractFilterSingleValue.call(this);
  }

FilterPostIsDescendentOrAncestorOfPost.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsDescendentOrAncestorOfPost.prototype, {
    getId: function() {
      return 'post_ancestry_and_thread';
    },
    getServerParam: function() {
      return 'family_post_id';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Part of the context of'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that are in the specified post reply thread or ancestry.');
    },
    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      return Promise.join(
            collectionManager.getMessageFullModelPromise(individualFilterValue),
            collectionManager.getUserLanguagePreferencesPromise(Ctx),
            function(post, ulp) {
              if (!post) {
                throw new Error('Post ' + individualFilterValue + ' not found');
              }
              var subject = post.get('subject');
              var subjectText = subject ? subject.bestValue(ulp.getTranslationData()) : '';

              if (post.get('@type') === "SynthesisPost") {
                return i18n.sprintf(i18n.gettext('synthesis "%s"'), subjectText);
              }
              else {
                return i18n.sprintf(i18n.gettext('message "%s"'), subjectText);
              }
            });
    },
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
        return i18n.sprintf(i18n.gettext("Are in the context of: %s"), individualValuesButtons.join(i18n.gettext(' AND ')));
      });
    }
  });

function FilterPostIsFromUser() {
    AbstractFilterSingleValue.call(this);
  }

FilterPostIsFromUser.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsFromUser.prototype, {
    getId: function() {
      return 'post_is_from';
    },
    getServerParam: function() {
      return 'post_author';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Posted by'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that are posted by a specific user.');
    },
    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      return collectionManager.getAllUsersCollectionPromise(individualFilterValue).then(function(users) {
        var user = users.get(individualFilterValue);
        if (!user) {
          throw new Error('User ' + individualFilterValue + ' not found');
        }

        return i18n.sprintf(i18n.gettext('"%s"'), user.get('name'));
      })
    },
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
        return i18n.sprintf(i18n.gettext("Are posted by: %s"), individualValuesButtons.join(i18n.gettext(' AND ')));
      });
    }
  });

function FilterPostIsOwnPost() {
    FilterPostIsFromUser.call(this);
  }

FilterPostIsOwnPost.prototype = Object.create(FilterPostIsFromUser.prototype);
_.extend(FilterPostIsOwnPost.prototype, {
    getId: function() {
      return 'only_own_posts';
    },
    getImplicitValuePromise: function() {
      return Promise.resolve(Ctx.getCurrentUser().id);
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Messages I posted'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that I posted.');
    }
  });

function FilterPostReplyToUser() {
    AbstractFilterSingleValue.call(this);
  }

FilterPostReplyToUser.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostReplyToUser.prototype, {
    getId: function() {
      return 'post_replies_to_user';
    },
    getServerParam: function() {
      return 'post_replies_to';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Replies to'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that reply to a specific user.');
    },
    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      return collectionManager.getAllUsersCollectionPromise(individualFilterValue).then(function(users) {
        var user = users.get(individualFilterValue);
        if (!user) {
          throw new Error('User ' + individualFilterValue + ' not found');
        }

        return i18n.sprintf(i18n.gettext('"%s"'), user.get('name'));
      })
    },
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
        return i18n.sprintf(i18n.gettext("Replies to: %s"), individualValuesButtons.join(i18n.gettext(' AND ')));
      });
    }
  });

function FilterPostReplyToMe() {
    FilterPostReplyToUser.call(this);
  }

FilterPostReplyToMe.prototype = Object.create(FilterPostReplyToUser.prototype);
_.extend(FilterPostReplyToMe.prototype, {
    getId: function() {
      return 'post_replies_to_me';
    },
    getImplicitValuePromise: function() {
      return Promise.resolve(Ctx.getCurrentUser().id);
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Messages that reply to me'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that reply one of the messages I posted.');
    }
  });

function FilterPostIsOrphan() {
    AbstractFilterBooleanValue.call(this);
  }

FilterPostIsOrphan.prototype = Object.create(AbstractFilterBooleanValue.prototype);
_.extend(FilterPostIsOrphan.prototype, {
    getId: function() {
      return 'only_orphan_posts';
    },
    getImplicitValuePromise: function() {
      return Promise.resolve(true);
    },
    getServerParam: function() {
      return 'only_orphan';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Messages not yet associated with an idea'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that are not found in any idea.');
    }
  });

function FilterPostIsSynthesis() {
    AbstractFilterBooleanValue.call(this);
  }

FilterPostIsSynthesis.prototype = Object.create(AbstractFilterBooleanValue.prototype);
_.extend(FilterPostIsSynthesis.prototype, {
    getId: function() {
      return 'only_synthesis_posts';
    },
    getImplicitValuePromise: function() {
      return Promise.resolve(true);
    },
    getServerParam: function() {
      return 'only_synthesis';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Synthesis messages'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that represent a synthesis of the discussion.');
    },
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      return Promise.all(individualValuesButtonsPromises, this.getLabelPromise()).then(function(individualValuesButtons, label) {
        return i18n.sprintf("%s %s", label, individualValuesButtons.join(''));
      });
    }
  });

function FilterPostHasUnread() {
    AbstractFilterBooleanValue.call(this);
  }

FilterPostHasUnread.prototype = Object.create(AbstractFilterBooleanValue.prototype);
_.extend(FilterPostHasUnread.prototype, {
    getId: function() {
      return 'post_has_unread';
    },
    getServerParam: function() {
      return 'is_unread';
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Have unread value'));
    },

    getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
      var retval;
      if (individualFilterValue === true) {
        retval = i18n.gettext("You haven't read yet");
      } else if (individualFilterValue === false) {
        retval = i18n.gettext("You've already read");
      }
      else {
        throw new Error("Value is not a boolean!")
      }

      return Promise.resolve(retval);
    },
    getFilterDescriptionStringPromise: function(individualValuesButtonsPromises) {
      return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
        return i18n.sprintf("%s", individualValuesButtons.join(''));
      });
    }
  });

function FilterPostIsUnread() {
    FilterPostHasUnread.call(this);
  }

FilterPostIsUnread.prototype = Object.create(FilterPostHasUnread.prototype);
_.extend(FilterPostIsUnread.prototype, {
    getId: function() {
      return 'is_unread_post';
    },
    getImplicitValuePromise: function() {
      return Promise.resolve(true);
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext("Unread messages"));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages you haven\'t read yet, or you manually marked unread.');
    },
    getIncompatibleFiltersIds: function(){
      return ["is_read_post"];
    }
  });

function FilterPostIsRead() {
    FilterPostHasUnread.call(this);
  }

FilterPostIsRead.prototype = Object.create(FilterPostHasUnread.prototype);
_.extend(FilterPostIsRead.prototype, {
    getId: function() {
      return 'is_read_post';
    },
    getImplicitValuePromise: function() {
      return Promise.resolve(false);
    },
    getLabelPromise: function() {
      return Promise.resolve(i18n.gettext('Read messages'));
    },
    getHelpText: function() {
      return i18n.gettext('Only include messages that have previously been marked read.');
    },
    getIncompatibleFiltersIds: function(){
      return ["is_unread_post"];
    }
  });


function FilterPostIsPostedAfterDate() {
    AbstractFilterSingleValue.call(this);
}

FilterPostIsPostedAfterDate.date_value = null;
FilterPostIsPostedAfterDate.should_ask_value_from_user = true;

FilterPostIsPostedAfterDate.setDate = function(date){
    // we want to set something like "2015-04-11T01%3A59%3A23Z"
    var processInputDate = function(d){
        var d2 = new Date(d);
        return d2.toISOString();
    };
    date = processInputDate(date);
    FilterPostIsPostedAfterDate.date_value = date;
};

FilterPostIsPostedAfterDate.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsPostedAfterDate.prototype, {
    getId: function() {
      return 'is_posted_after_date';
    },
    getImplicitValuePromise: function() {
        return Promise.resolve(FilterPostIsPostedAfterDate.date_value);
    },
    getServerParam: function() {
      return 'posted_after_date';
    },
    getLabelPromise: function() {
      return this.getImplicitValuePromise().then(function(value) {
        // commented because the label of the filter in filter menu is the same as the label of the tag when the filter is active
        //if ( value === null ){
            return i18n.gettext('Messages posted after...');
        //}
        //return i18n.sprintf(i18n.gettext('Messages posted after %s'), Ctx.getNiceDateTime(value));
      });
    },
    getHelpText: function() {
      return i18n.gettext('Only include posts created after a given date.');
    },
    askForValue: function(){
        var defaultValue = FilterPostIsPostedAfterDate.date_value ? FilterPostIsPostedAfterDate.date_value : "2015-01-01";
        var val = window.prompt(i18n.gettext('Please type a date. The filter will then show only posts which have been created after this date. Example: 2015-01-01'), defaultValue);
        if ( val ){
            FilterPostIsPostedAfterDate.setDate(val);
        }
        return val;
    }
});


function FilterPostIsPostedBeforeDate() {
    AbstractFilterSingleValue.call(this);
}

FilterPostIsPostedBeforeDate.date_value = null;
FilterPostIsPostedBeforeDate.should_ask_value_from_user = true;


FilterPostIsPostedBeforeDate.setDate = function(date){
    // we want to set something like "2015-04-11T01%3A59%3A23Z"
    var processInputDate = function(d){
        var d2 = new Date(d);
        return d2.toISOString();
    };
    date = processInputDate(date);
    FilterPostIsPostedBeforeDate.date_value = date;
};

FilterPostIsPostedBeforeDate.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsPostedBeforeDate.prototype, {
    getId: function() {
      return 'is_posted_before_date';
    },
    getImplicitValuePromise: function() {
      return Promise.resolve(FilterPostIsPostedBeforeDate.date_value);
    },
    getServerParam: function() {
      return 'posted_before_date';
    },
    getLabelPromise: function() {
      return this.getImplicitValuePromise().then(function(value) {
        // commented because the label of the filter in filter menu is the same as the label of the tag when the filter is active
        //if ( value === null ){
            return i18n.gettext('Messages posted before...');
        //}
        //return i18n.sprintf(i18n.gettext('Messages posted before %s'), Ctx.getNiceDateTime(value));
      });
    },
    getHelpText: function() {
      return i18n.gettext('Only include posts created before a given date.');
    },
    askForValue: function(){
        var defaultValue = FilterPostIsPostedBeforeDate.date_value ? FilterPostIsPostedBeforeDate.date_value : "2015-01-01";
        var val = window.prompt(i18n.gettext('Please type a date. The filter will then show only posts which have been created before this date. Example: 2015-01-01'), defaultValue);
        if ( val ){
            FilterPostIsPostedBeforeDate.setDate(val);
        }
        return val;
    }
});




function FilterPostIsPostedSinceLastSynthesis() {
    AbstractFilterSingleValue.call(this);
  }

FilterPostIsPostedSinceLastSynthesis.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsPostedSinceLastSynthesis.prototype, {
    getId: function() {
      return 'is_posted_since_last_synthesis';
    },
    getImplicitValuePromise: function() {
      var that = this;
      var collectionManager = new CollectionManager();

      return collectionManager.getAllMessageStructureCollectionPromise().then(function(allMessageStructureCollection) {
        var date = null;
        var lastSynthesisPost = allMessageStructureCollection.getLastSynthesisPost();
        if (lastSynthesisPost) {
          return lastSynthesisPost.get('date');
        }
        else {
          return undefined;
        }
      });
    },
    getServerParam: function() {
      return 'posted_after_date';
    },
    getLabelPromise: function() {
      return this.getImplicitValuePromise().then(function(value) {
        return i18n.sprintf(i18n.gettext('Messages posted since the last synthesis (%s)'), Ctx.getNiceDateTime(value));
      });
    },
    getHelpText: function() {
      return i18n.gettext('Only include posts created after the last synthesis.');
    }
  });




function FilterPostIsDeleted() {
  AbstractFilterSingleValue.call(this);
}

FilterPostIsDeleted.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsDeleted.prototype, {
  getId: function() {
    return 'only_deleted_posts';
  },
  getImplicitValuePromise: function() {
      return Promise.resolve('true');
  },
  getServerParam: function() {
    return 'deleted';
  },
  getLabelPromise: function() {
    return Promise.resolve(i18n.gettext('Deleted messages'));
  },
  getHelpText: function() {
    return i18n.gettext('Only include messages that have been deleted (by their author or by an administrator), and their ancestors.');
  },
  getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
    return Promise.resolve("");
  },
  getFilterDescriptionStringPromise: function(individualValuesButtonsPromises){
    var that = this;
    return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
      return that.getLabelPromise().then(function(label) {
        return label + individualValuesButtons.join('');
      });
    });
  },
  getIncompatibleFiltersIds: function(){
    return ["also_deleted_posts"];
  }
});




function FilterPostIsDeletedOrNot() {
  AbstractFilterSingleValue.call(this);
}

FilterPostIsDeletedOrNot.prototype = Object.create(AbstractFilterSingleValue.prototype);
_.extend(FilterPostIsDeletedOrNot.prototype, {
  getId: function() {
    return 'also_deleted_posts';
  },
  getImplicitValuePromise: function() {
      return Promise.resolve('any');
  },
  getServerParam: function() {
    return 'deleted';
  },
  getLabelPromise: function() {
    return Promise.resolve(i18n.gettext('Show also deleted messages'));
  },
  getHelpText: function() {
    return i18n.gettext('Also include messages that have been deleted (by their author or by an administrator).');
  },
  getFilterIndividualValueDescriptionStringPromise: function(individualFilterValue) {
    return Promise.resolve("");
  },
  getFilterDescriptionStringPromise: function(individualValuesButtonsPromises){
    var that = this;
    return Promise.all(individualValuesButtonsPromises).then(function(individualValuesButtons) {
      return that.getLabelPromise().then(function(label) {
        return label + individualValuesButtons.join('');
      });
    });
  },
  getIncompatibleFiltersIds: function(){
    return ["only_deleted_posts"];
  }
});



var availableFilters = {
    POST_HAS_ID_IN: FilterPostHasIdIn,
    POST_IS_IN_CONTEXT_OF_IDEA: FilterPostIsInContextOfIdea,
    POST_IS_DESCENDENT_OF_POST: FilterPostIsDescendentOfPost,
    POST_IS_DESCENDENT_OR_ANCESTOR_OF_POST: FilterPostIsDescendentOrAncestorOfPost,
    POST_IS_ORPHAN: FilterPostIsOrphan,
    POST_IS_SYNTHESIS: FilterPostIsSynthesis,
    POST_IS_UNREAD: FilterPostIsUnread,
    POST_IS_READ: FilterPostIsRead,
    POST_IS_POSTED_SINCE_LAST_SYNTHESIS: FilterPostIsPostedSinceLastSynthesis,
    POST_IS_POSTED_AFTER_DATE: FilterPostIsPostedAfterDate,
    POST_IS_POSTED_BEFORE_DATE: FilterPostIsPostedBeforeDate,
    POST_IS_FROM: FilterPostIsFromUser,
    POST_IS_FROM_SELF: FilterPostIsOwnPost,
    POST_REPONDS_TO: FilterPostReplyToUser,
    POST_REPONDS_TO_ME: FilterPostReplyToMe,
    POST_IS_DELETED: FilterPostIsDeleted,
    POST_IS_DELETED_OR_NOT: FilterPostIsDeletedOrNot
  };

export default availableFilters;
