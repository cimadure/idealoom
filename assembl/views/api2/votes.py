from future import standard_library
standard_library.install_aliases()
from datetime import datetime
from io import BytesIO, TextIOWrapper

from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPBadRequest, HTTPUnauthorized, HTTPNotFound)
from pyramid.security import authenticated_userid
from pyramid.response import Response
from pyramid.settings import asbool
from simplejson import dumps

from ..traversal import (CollectionContext, InstanceContext)
from assembl.auth import (
    P_READ, Everyone, CrudPermissions, P_ADMIN_DISC, P_VOTE)
from assembl.models import (
    AbstractIdeaVote, User, AbstractVoteSpecification, VotingWidget)
from assembl.lib.sqla import get_named_class
from . import (FORM_HEADER, JSON_HEADER, check_permissions)


# Votes are private
@view_config(context=CollectionContext, renderer='json',
             request_method='GET', permission=P_READ,
             ctx_collection_class=AbstractIdeaVote)
def votes_collection_view(request):
    ctx = request.context
    user_id = authenticated_userid(request)
    if not user_id:
        raise HTTPUnauthorized
    view = request.GET.get('view', None) or ctx.get_default_view() or 'id_only'
    tombstones = asbool(request.GET.get('tombstones', False))
    q = ctx.create_query(view == 'id_only', tombstones).join(
        User, AbstractIdeaVote.voter).filter(User.id == user_id)
    if view == 'id_only':
        return [ctx.collection_class.uri_generic(x) for (x,) in q.all()]
    else:
        return [i.generic_json(view, user_id) for i in q.all()]


@view_config(context=CollectionContext, request_method='POST',
             header=JSON_HEADER, permission=P_VOTE,
             ctx_collection_class=AbstractIdeaVote)
def votes_collection_add_json(request):
    ctx = request.context
    user_id = authenticated_userid(request)
    if not user_id:
        raise HTTPUnauthorized
    permissions = ctx.get_permissions()
    check_permissions(ctx, user_id, CrudPermissions.CREATE)
    spec = ctx.get_instance_of_class(AbstractVoteSpecification)
    if spec:
        required = spec.get_vote_class()
    else:
        required = ctx.collection_class
    widget = ctx.get_instance_of_class(VotingWidget)
    if not widget and spec:
        widget = spec.widget
    if not widget:
        raise HTTPBadRequest("Please provide a reference to a widget")
    if widget.activity_state != 'active':
        raise HTTPUnauthorized("Not in voting period")
    typename = request.json_body.get('@type', None)
    if typename:
        cls = get_named_class(typename)
        if not issubclass(cls, required):
            raise HTTPBadRequest("@type is %s, should be in %s" % (
                typename, spec.get_vote_class().__name__))
    else:
        typename = required.external_typename()
    json = request.json_body
    json['voter'] = User.uri_generic(user_id)
    if "@type" not in json:
        json["@type"] = typename
    else:
        pass  # TODO: Check subclass
    try:
        instances = ctx.create_object(typename, json)
    except Exception as e:
        raise HTTPBadRequest(e)
    if instances:
        first = instances[0]
        db = first.db
        for instance in instances:
            db.add(instance)
        db.flush()
        # validate after flush so we can check validity with DB constraints
        if not first.is_valid():
            raise HTTPBadRequest("Invalid vote")
        view = request.GET.get('view', None) or 'default'
        return Response(
            dumps(first.generic_json(view, user_id, permissions)),
            location=first.uri_generic(first.id),
            status_code=201)


@view_config(context=InstanceContext, request_method='GET',
             ctx_instance_class=AbstractVoteSpecification,
             name="vote_results", renderer="json",
             permission=P_READ)
def vote_results(request):
    ctx = request.context
    user_id = authenticated_userid(request)
    if not user_id:
        raise HTTPUnauthorized
    histogram = request.GET.get('histogram', None)
    if histogram:
        try:
            histogram = int(histogram)
        except ValueError as e:
            raise HTTPBadRequest(e)
        if histogram > 25:
            raise HTTPBadRequest(
                "Please select at most 25 bins in the histogram.")
    widget = ctx._instance.widget
    if widget.activity_state != "ended":
        permissions = ctx.get_permissions()
        if P_ADMIN_DISC not in permissions:
            raise HTTPUnauthorized()
    return ctx._instance.voting_results(histogram)

@view_config(context=InstanceContext, request_method='GET',
             ctx_instance_class=AbstractVoteSpecification,
             name="vote_results_csv", permission=P_READ)
def vote_results_csv(request):
    ctx = request.context
    user_id = authenticated_userid(request)
    if not user_id:
        raise HTTPUnauthorized
    histogram = request.GET.get('histogram', None)
    if histogram:
        try:
            histogram = int(histogram)
        except ValueError as e:
            raise HTTPBadRequest(e)
        if histogram > 25:
            raise HTTPBadRequest(
                "Please select at most 25 bins in the histogram.")
    widget = ctx._instance.widget
    if widget.activity_state != "ended":
        permissions = ctx.get_permissions()
        if P_ADMIN_DISC not in permissions:
            raise HTTPUnauthorized()
    output = BytesIO()
    output_utf8 = TextIOWrapper(output, encoding='utf-8')
    ctx._instance.csv_results(output_utf8, histogram)
    output_utf8.detach()
    output.seek(0)
    return Response(body_file=output, content_type='text/csv', charset="utf-8")
