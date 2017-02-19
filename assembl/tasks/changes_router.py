"""This process obtains JSON representations of modified, created or deleted
database objects through ZeroMQ, and feeds them to browser clients
through a websocket."""
import signal
import time
import sys
from os import makedirs, access, R_OK, W_OK
from os.path import exists, dirname
import ConfigParser
import traceback
from time import sleep

import simplejson as json
import zmq
from zmq.eventloop import ioloop
from zmq.eventloop import zmqstream
import requests
from tornado import web
from sockjs.tornado import SockJSRouter, SockJSConnection
from tornado.httpserver import HTTPServer

from assembl.lib.zmqlib import INTERNAL_SOCKET
from assembl.lib.raven_client import setup_raven, capture_exception
from assembl.lib.web_token import decode_token, TokenInvalid

# Inspired by socksproxy.

if len(sys.argv) != 2:
    print "usage: python changes_router.py configuration.ini"
    exit()


SECTION = 'app:assembl'
Everyone = 'system.Everyone'

settings = ConfigParser.ConfigParser({'changes.prefix': ''})
settings.read(sys.argv[-1])
CHANGES_SOCKET = settings.get(SECTION, 'changes.socket')
CHANGES_PREFIX = settings.get(SECTION, 'changes.prefix')
TOKEN_SECRET = settings.get(SECTION, 'session.secret')
WEBSERVER_PORT = settings.getint(SECTION, 'changes.websocket.port')
# NOTE: Not sure those are always what we want. Also seems to fail in requests,
# possibly due to https://github.com/kennethreitz/requests/issues/3844 ?
# SERVER_PROTOCOL = 'https' if settings.getboolean(SECTION, 'require_secure_connection') else 'http'
SERVER_PROTOCOL = 'http'
SERVER_HOST = settings.get(SECTION, 'public_hostname')
SERVER_PORT = settings.getint(SECTION, 'public_port')
setup_raven(settings)

context = zmq.Context.instance()
ioloop.install()
io_loop = ioloop.IOLoop.instance()  # ZMQ loop

if CHANGES_SOCKET.startswith('ipc://'):
    dir = dirname(CHANGES_SOCKET[6:])
    if not exists(dir):
        makedirs(dir)

td = zmq.devices.ThreadDevice(zmq.FORWARDER, zmq.XSUB, zmq.XPUB)
td.bind_in(CHANGES_SOCKET)
td.bind_out(INTERNAL_SOCKET)
td.setsockopt_in(zmq.IDENTITY, 'XSUB')
td.setsockopt_out(zmq.IDENTITY, 'XPUB')
td.start()


class ZMQRouter(SockJSConnection):

    token = None
    discussion = None
    userId = None

    def on_open(self, request):
        self.valid = True
        self.closing = False

    def on_recv(self, data):
        try:
            data = data[-1]
            if '@private' in data:
                jsondata = json.loads(data)
                jsondata = [x for x in jsondata
                            if x.get('@private', self.userId) == self.userId]
                if not jsondata:
                    return
                data = json.dumps(jsondata)
            self.send(data)
        except Exception:
            capture_exception()
            self.do_close()

    def do_close(self):
        self.closing = True
        self.close()
        self.socket = None
        if getattr(self, "loop", None):
            self.loop.stop_on_recv()
            self.loop.close()
            self.loop = None

    def on_message(self, msg):
        try:
            if getattr(self, 'socket', None):
                print "closing old socket"
                self.loop.add_callback(self.do_close)
                return
            if msg.startswith('discussion:') and self.valid:
                self.discussion = msg.split(':', 1)[1]
            if msg.startswith('token:') and self.valid:
                try:
                    self.raw_token = msg.split(':', 1)[1]
                    self.token = decode_token(self.raw_token, TOKEN_SECRET)
                    if self.token['userId'] != Everyone:
                        self.userId = 'local:AgentProfile/' + str(
                            self.token['userId'])
                    else:
                        self.userId = Everyone
                except TokenInvalid:
                    pass
            if self.token and self.discussion:
                # Check if token authorizes discussion
                r = requests.get(
                    '%s://%s:%d/api/v1/discussion/%s/permissions/read/u/%s' %
                    (SERVER_PROTOCOL, SERVER_HOST, SERVER_PORT, self.discussion,
                        self.token['userId']))
                print r.text
                if r.text != 'true':
                    return
                self.socket = context.socket(zmq.SUB)
                self.socket.connect(INTERNAL_SOCKET)
                self.socket.setsockopt(zmq.SUBSCRIBE, '*')
                self.socket.setsockopt(zmq.SUBSCRIBE, str(self.discussion))
                self.loop = zmqstream.ZMQStream(self.socket, io_loop=io_loop)
                self.loop.on_recv(self.on_recv)
                print "connected"
                self.send('[{"@type":"Connection"}]')
                if self.userId != Everyone:
                    requests.post('%s://%s:%d/data/Discussion/%s/all_users/%d/connecting' %
                        (SERVER_PROTOCOL, SERVER_HOST, SERVER_PORT, self.discussion,
                            self.token['userId']), data={'token': self.raw_token})
        except Exception:
            capture_exception()
            self.do_close()

    def on_close(self):
        if self.closing:
            return
        try:
            print "closing"
            if self.raw_token and self.discussion and self.userId != Everyone:
                requests.post('%s://%s:%d/data/Discussion/%s/all_users/%d/disconnecting' %
                    (SERVER_PROTOCOL, SERVER_HOST, SERVER_PORT, self.discussion,
                        self.token['userId']), data={'token': self.raw_token})
            self.do_close()
        except Exception:
            capture_exception()
            raise


def logger(msg):
    print msg


def log_queue():
    socket = context.socket(zmq.SUB)
    socket.connect(INTERNAL_SOCKET)
    socket.setsockopt(zmq.SUBSCRIBE, '')
    loop = zmqstream.ZMQStream(socket, io_loop=io_loop)
    loop.on_recv(logger)

log_queue()

sockjs_router = SockJSRouter(
    ZMQRouter, prefix=CHANGES_PREFIX, io_loop=io_loop)
routes = sockjs_router.urls
web_app = web.Application(routes, debug=False)


def term(*_ignore):
    web_server.stop()
    io_loop.add_timeout(time.time() + 0.3, io_loop.stop)

signal.signal(signal.SIGTERM, term)

web_server = HTTPServer(web_app)
web_server.listen(WEBSERVER_PORT)
try:
    if CHANGES_SOCKET.startswith('ipc://'):
        sname = CHANGES_SOCKET[6:]
        for i in range(5):
            if exists(sname):
                break
            sleep(0.1)
        else:
            raise RuntimeError("could not create socket " + sname)
        if not access(sname, R_OK | W_OK):
            raise RuntimeError(sname + " cannot be accessed")
    io_loop.start()
except KeyboardInterrupt:
    term()
except Exception:
    capture_exception()
    raise
