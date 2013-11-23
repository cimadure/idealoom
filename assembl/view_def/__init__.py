import traceback
from os.path import exists, join, dirname

import simplejson

_def_cache = {}

# Unnamed literal attribute will be present (unless also reln)
# Unnamed relation will be given as URL
# Unnamed back relation? ommitted.
# relation: "view_def_name" will use that view_def to give object(s)
# attribute: false will be blocked (idem relation)
# attribute: true same as attribute:"attribute". Will handle list appropriately.
# name: "attribute" will access attribute relation.uri and rename it as "name"
# TODO: property access.
# relation: [] will be given as list of URL, even if back.
# relation: ["view_def_name"] will be given as list of objects
# relation: {"@id":"view_def_name"} will be given as hash of objects
# name: &method will call the method with no arguments. DANGER! PLEASE RETURN JSON.
# @id, @type and @view will always be defined.
# IDs will always take the form 
# local:<discussionid>/generic/<classname>/<object_id>

def get_view_def(name, use_cache=False):
    global _def_cache
    if use_cache and name in _def_cache:
        return _def_cache[name]

    fname = join(dirname(__file__), name+".json")
    if exists(fname):
        try:
            json = simplejson.load(open(fname))
            if use_cache:
                _def_cache[name] = json
            return json
        except:
            traceback.print_exc()
