"""views related to login, registration, etc."""

import sys

from pyramid.settings import aslist
from social.apps.pyramid_app.views import (
    auth as psa_auth_view, complete as psa_complete_view)
import simplejson as json


def includeme(config):
    """ This function returns a Pyramid WSGI application."""

    def contextual_route(name, route, from_root=True):
        config.add_route('contextual_'+name, '/{discussion_slug}'+route)
        if from_root:
            config.add_route(name, route)

    contextual_route('login', '/login')
    contextual_route('login_forceproviders', '/login_showallproviders')
    contextual_route('logout', '/logout')
    # type in u(sername), id, email, {velruse-id-type}
    config.add_route('profile_user', '/user/{type}/{identifier}')
    config.add_route('avatar', '/user/{type}/{identifier}/avatar/{size:\d+}')
    contextual_route('register', '/register')
    contextual_route('user_confirm_email', '/users/email_confirm/{ticket}')
    # Do we want this?
    # config.add_route('profile_search', '/usernames/{user_name}')
    # TODO: secure next three methods to avoid spamming the user.
    contextual_route('confirm_emailid_sent',
                     '/confirm_email_sent_id/{email_account_id:\d+}')
    contextual_route('confirm_email_sent', '/confirm_email_sent/{email}')

    contextual_route('password_change_sent',
                     '/password_change_sent/{profile_id:\d+}')
    contextual_route('request_password_change', '/req_password_change')
    contextual_route('do_password_change', '/do_password_change/{ticket}')
    contextual_route('welcome', '/welcome/{ticket}')
    contextual_route('finish_password_change', '/finish_password_change')
    config.add_route('contextual_social_auth', '/{discussion_slug}/login/{backend}')
    contextual_route('add_social_account', '/add_account/{backend}')

    # determine which providers we want to configure
    settings = config.get_settings()
    providers = aslist(settings['login_providers'])
    config.add_settings(login_providers=providers)
    config.add_settings(trusted_login_providers=aslist(
        settings.get('trusted_login_providers', '')))
    if not any(providers):
        sys.stderr.write('no login providers configured, double check '
                         'your ini file and add a few')
    settings = config.registry.settings
    for name in ('SOCIAL_AUTH_AUTHENTICATION_BACKENDS',
                 'SOCIAL_AUTH_USER_FIELDS',
                 'SOCIAL_AUTH_PROTECTED_USER_FIELDS',
                 'SOCIAL_AUTH_FIELDS_STORED_IN_SESSION'):
        settings[name] = aslist(settings.get(name, ''))
    for name in ('SOCIAL_AUTH_SAML_ORG_INFO',
                 'SOCIAL_AUTH_SAML_TECHNICAL_CONTACT',
                 'SOCIAL_AUTH_SAML_SUPPORT_CONTACT',
                 'SOCIAL_AUTH_SAML_ENABLED_IDPS'):
        val = settings.get(name, '')
        if val:
            settings[name] = json.loads(val)
    for k in settings.iterkeys():
        if k.endswith("_SCOPE") and k.startswith("SOCIAL_AUTH_"):
            settings[k] = aslist(settings.get(k, ''))
    config.add_request_method(
        'assembl.auth.social_auth.get_user', 'user', reify=True)
    config.include('social.apps.pyramid_app')
    config.scan()
    config.scan('social.apps.pyramid_app')
