# -*- coding: utf-8 -*-
from future import standard_library
standard_library.install_aliases()
from builtins import next
from collections import OrderedDict
import urllib.parse

import pytest
import simplejson as json
from requests import Response
import mock
from pyramid.interfaces import ISessionFactory, IAuthorizationPolicy
from pyramid.request import Request

from assembl.models import SocialAuthAccount


def test_assembl_login(discussion, participant1_user,
                       test_app_no_login, request):
    url = test_app_no_login.app.request_factory({}).route_path(
        'contextual_login', discussion_slug=discussion.slug)
    # here we have to know it's "password", as the non-hashed password value
    # is not stored in the object.
    res = test_app_no_login.post(url, OrderedDict([
        ('identifier', participant1_user.get_preferred_email()),
        ('password', 'password')]))
    assert (res.status_code == 302 and urllib.parse.urlparse(
        res.location).path == '/' + discussion.slug + '/')
    assert test_app_no_login.app.registry.getUtility(
        IAuthorizationPolicy).remembered == participant1_user.id


def test_assembl_login_mixed_case(discussion, participant1_user,
                                  test_app_no_login, request):
    """Check that the login process works with weird case in email"""
    url = test_app_no_login.app.request_factory({}).route_path(
        'contextual_login', discussion_slug=discussion.slug)
    # here we have to know it's "password", as the non-hashed password value
    # is not stored in the object.
    res = test_app_no_login.post(url, OrderedDict([
        ('identifier',
         participant1_user.get_preferred_email().title()),
        ('password', 'password')]))
    assert (res.status_code == 302 and urllib.parse.urlparse(
        res.location).path == '/' + discussion.slug + '/')
    assert test_app_no_login.app.registry.getUtility(
        IAuthorizationPolicy).remembered == participant1_user.id


fake_facebook_locale_info = """<?xml version='1.0'?>
<locales>
<locale>
<englishName>English (US)</englishName>
<codes>
<code>
<standard>
<name>FB</name>
<representation>en_US</representation>
</standard>
</code>
</codes>
</locale>
</locales>"""


# keep coordinated with participant1_user in fixtures
p1_name = "A. Barking Loon"
p1_email = 'abloon@gmail.com'
p1_uid = '111111111111111111111'

fake_social_token = json.dumps({
    "access_token": "some_token",
    "token_type": "Bearer",
    "expires_in": 3600,
    "id_token": "some_other_token"})

fake_social_profile = json.dumps({
    'access_token': 'some_token',
    'displayName': p1_name,
    'emails': [{'type': 'account', 'value': p1_email}],
    'etag': '"etag"',
    'expires': 3600,
    'expires_in': 3600,
    'id': p1_uid,
    'id_token': 'some_other_token',
    'image': {
        'isDefault': False,
        'url': 'https://lh4.googleusercontent.com/abcd/photo.jpg?sz=50'
    },
    'isPlusUser': True,
    'kind': 'plus#person',
    'language': 'en',
    'name': {'familyName': 'Loon', 'givenName': 'A. Barking'},
    'objectType': 'person',
    'verified': False})

fake_responses = {
    "https://accounts.google.com/o/oauth2/token": fake_social_token,
    "https://www.googleapis.com/plus/v1/people/me": fake_social_profile,
    "https://www.facebook.com/translations/FacebookLocales.xml":
        fake_facebook_locale_info
}


def fake_response_handler(url=None, **kwargs):
    r = Response()
    r.status_code = 200
    r.encoding = "utf-8"
    assert url in fake_responses, "unknown URL: " + url
    r._content = fake_responses[url].encode("utf-8")
    return r


def test_social_login(
        test_session, test_app, discussion, google_identity_provider, request,
        test_webrequest):
    path = test_webrequest.route_path(
        'social.auth', backend=google_identity_provider.provider_type)
    res = test_app.get(path)
    assert res.status_code == 302  # Found
    url = urllib.parse.urlparse(res.location)
    qs = urllib.parse.parse_qs(url.query)
    state = qs['state']
    code = 'code'
    session_state = 'session_state'
    with mock.patch('requests.sessions.Session.request') as mock_request:
        mock_request.side_effect = fake_response_handler
        path = test_webrequest.route_path(
            'social.complete', backend=google_identity_provider.provider_type)
        res2 = test_app.get(path, {
            'state': state,
            'code': code,
            'authuser': '0',
            'session_state': session_state,
            'prompt': 'none'})
        assert res2.status_code == 302
        assert mock_request.call_count > 1
        urls_called = {call[1]['url'] for call in mock_request.call_args_list}
        assert "https://www.googleapis.com/plus/v1/people/me" in urls_called
    account = test_session.query(SocialAuthAccount).filter_by(
        email=p1_email).first()
    assert account
    assert account.uid == p1_uid
    assert account.profile.name == p1_name
    account.delete()
    account.profile.delete()


def test_add_social_account(
        test_session, test_app, discussion, admin_user,
        google_identity_provider, base_registry, test_webrequest):
    session_factory = base_registry.getUtility(ISessionFactory)
    path = test_webrequest.route_path(
        'social.auth', backend=google_identity_provider.provider_type)
    res = test_app.get(path)
    assert res.status_code == 302  # Found
    url = urllib.parse.urlparse(res.location)
    qs = urllib.parse.parse_qs(url.query)
    state = qs['state']
    code = 'code'
    session_state = 'session_state'
    cookie = next(iter(test_app.cookiejar))
    beaker_session = session_factory(Request.blank(
        "/", cookies={cookie.name: cookie.value}))
    beaker_session["add_account"] = True
    beaker_session.persist()

    with mock.patch('requests.sessions.Session.request') as mock_request:
        mock_request.side_effect = fake_response_handler
        path = test_webrequest.route_path(
            'social.complete', backend=google_identity_provider.provider_type)
        res2 = test_app.get(path, {
            'state': state,
            'code': code,
            'authuser': '0',
            'session_state': session_state,
            'prompt': 'none'})
        assert res2.status_code == 302
        assert mock_request.call_count > 1
        urls_called = {call[1]['url'] for call in mock_request.call_args_list}
        assert "https://www.googleapis.com/plus/v1/people/me" in urls_called
    account = test_session.query(SocialAuthAccount).filter_by(
        email=p1_email).first()
    assert account
    assert account.uid == p1_uid
    assert account.profile == admin_user
    account.delete()


def test_merge_social_account(
        test_session, test_app, discussion, participant1_user,
        google_identity_provider, base_registry, test_webrequest):
    path = test_webrequest.route_path(
        'social.auth', backend=google_identity_provider.provider_type)
    res = test_app.get(path)
    assert res.status_code == 302  # Found
    url = urllib.parse.urlparse(res.location)
    qs = urllib.parse.parse_qs(url.query)
    state = qs['state']
    code = 'code'
    session_state = 'session_state'

    with mock.patch('requests.sessions.Session.request') as mock_request:
        mock_request.side_effect = fake_response_handler
        path = test_webrequest.route_path(
            'social.complete', backend=google_identity_provider.provider_type)
        res2 = test_app.get(path, {
            'state': state,
            'code': code,
            'authuser': '0',
            'session_state': session_state,
            'prompt': 'none'})
        assert res2.status_code == 302
        assert mock_request.call_count > 1
        urls_called = {call[1]['url'] for call in mock_request.call_args_list}
        assert "https://www.googleapis.com/plus/v1/people/me" in urls_called
    account = test_session.query(SocialAuthAccount).filter_by(
        email=p1_email).first()
    assert account
    assert account.uid == p1_uid
    assert account.profile == participant1_user
    account.delete()
