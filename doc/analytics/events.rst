Analytics Events
----------------

All custom events that will currently be fired by IdeaLoom are defined
in: ``../../assembl/static/js/app/internal\_modules/analytics/abstract.js``

Events in Piwik (and other Analytics software) are on a multi-axis
spectrum. These axis are:

Category, Action, and Event Name

Often times, these axii are orthogonal to each other. As a result,
events can be defined in multi-dimensional space. Do not let this
concept bog you down, however. It simply means that analytic events
simply have some luggage with them. That luggage is the contexts in which
the event was fired. Within Piwik, each axis can be viewed in
relation to 1 of the other axii. IdeaLoom has decided that these axis
should convey a meaningful structure. This means that the context of an
event should have value to the analytst who reads reports generated upon
events being fired. IdeaLoom tries to simply this by defining the axis as
follows:

-  Category: Which physical UI element did the event originate from?  Typically
        corresponds to a specific view (ex: Idea Panel)
-  Action: From which high-level user process did the event originate from?
        Currently ONBOARDING, READING, FINDING, INTERACTING, PRODUCING
-  Event Name: Contexual event name.  Name of the actual action.  
        ex:  NAVIGATE_TO_IDEA .  To be interpreted with the Action and Category
