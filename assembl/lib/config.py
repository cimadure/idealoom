""" Indirection layer to enable getting at the config while not littering the
codebase with thread-local access code. """
import logging

from pyramid.threadlocal import get_current_registry

_settings = None
log = logging.getLogger(__name__)


def set_config(settings, reconfig=False):
    """ Set the settings object. """
    global _settings
    if _settings:
        if reconfig:
            _settings = settings
        else:
            # Re-initializing settings fails. Patch.
            log.warn("initialized twice: " + repr(settings))
            log.debug("keeping: " + repr(_settings))
    else:
        _settings = settings


def get_config():
    """ Return the whole settings object. """
    global _settings
    return _settings or get_current_registry().settings


def get(name, default=None):
    """ Return a specific setting. """
    return get_config().get(name, default)
