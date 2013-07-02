from session import Session
import logging
from util import asyncsleep
from tornado import gen
from tornado.options import options
if options.debug:
    import pdb

from falcon import Torrent, File

class File(File):
    def __init__(self, torrent, i, data):
        self.index = i
        self.torrent = torrent
        self.data = data
        logging.info('init file %s' % [self.get('name')])

    coldefs = [
            { 'name': 'name' },
            { 'name': 'size' , 'type': 'int', 'unit': 'bytes' },
            { 'name': 'downloaded', 'type': 'int', 'unit': 'bytes' },
            { 'name': 'priority', 'type': 'int' },
            { 'name': 'first_piece', 'type': 'int' },
            { 'name': 'num_pieces', 'type': 'int' },
            { 'name': 'streamable', 'type': 'bool' },
            { 'name': 'encoded_rate', 'type': 'int' },
            { 'name': 'duration', 'type': 'int' },
            { 'name': 'width', 'type': 'int' },
            { 'name': 'height', 'type': 'int' },
            { 'name': 'stream_eta', 'type': 'int' },
            { 'name': 'streamability', 'type': 'int' }
        ]
    coldefnames = {}
    for i,v in enumerate(coldefs):
        coldefnames[v['name']] = i

    def get(self, attr):
        i = self.coldefnames[attr]
        return self.data[i]

class Torrent(Torrent):
    coldefs = [
            { 'name': 'hash' },
            { 'name': 'status', 'type': 'int' , 'bits': ['started', 'checking', 'start after check', 'checked', 'error', 'paused', 'queued', 'loaded'] },
            { 'name': 'name' },
            { 'name': 'size', 'type': 'int' },
            { 'name': 'progress', 'type': 'int' },
            { 'name': 'downloaded', 'type': 'int' },
            { 'name': 'uploaded', 'type': 'int' },
            { 'name': 'ratio', 'type': 'int' },
            { 'name': 'up_speed', 'type': 'int' },
            { 'name': 'down_speed', 'type': 'int' },
            { 'name': 'eta', 'type': 'int' },
            { 'name': 'label' },
            { 'name': 'peers_connected', 'type': 'int' },
            { 'name': 'peers_swarm', 'type': 'int', 'alias': 'peers_in_swarm' },
            { 'name': 'seed_connected', 'type': 'int', 'alias': 'seeds_connected' },
            { 'name': 'seed_swarm', 'type': 'int', 'alias': 'seeds_in_swarm' },
            { 'name': 'availability', 'type': 'int' },
            { 'name': 'queue_position', 'type': 'int', 'alias': 'queue_order' },
            { 'name': 'remaining', 'type': 'int' },
            { 'name': 'download_url' },
            { 'name': 'rss_feed_url' },
            { 'name': 'message' },
            { 'name': 'stream_id' },
            { 'name': 'added_on', 'type': 'int' },
            { 'name': 'completed_on', 'type': 'int' },
            { 'name': 'app_update_url' },
            { 'name': 'directory' },
            { 'name': 'webseed_enabled' }
            ]
    coldefnames = {}
    for i,v in enumerate(coldefs):
        coldefnames[v['name']] = i

    def get(self, attr):
        i = self.coldefnames[attr]
        if attr == 'hash':
            return self.data[i].lower()
        else:
            return self.data[i]

    def __init__(self, client, data):
        self.client = client
        self.data = data
        logging.info('init torrent %s' % [self.get('name')])

    def update(self, data):
        changed = []
        for i,v in enumerate(data):
            if v != self.data[i]:
                try:
                    changed.append((self.coldefs[i]['name'], self.data[i], v))
                except:
                    logging.error('coldefs %s, data %s, has no index %s' % (len(self.coldefs), len(self.data), i))
        self.data = data
        changedstr = ', '.join( ['%s(%s -> %s)' % (c[0], c[1], c[2]) for c in changed] )
        logging.info('updating torrent data %s, %s' % (self.get('name'), changedstr))

    def serialize(self):
        return dict( (self.coldefs[i]['name'], self.data[i]) for i in range(len(self.coldefs)) )

    @gen.engine
    def remove(self, callback=None):
        args = { 'action': 'remove', 'hash': self.get('hash') }
        response = yield gen.Task( self.client.session.request, 'POST', '/client/gui/', args )
        if callback:
            callback(response)

    @gen.engine
    def fetch_files(self, callback=None):
        args = { 'action': 'getfiles', 'hash': self.get('hash') }
        response = yield gen.Task( self.client.session.request, url_params=args )
        self.files = [ File(self, i, d) for i,d in enumerate(response.body['files'][1]) ]
        callback(response)


class Client(object):
    def __init__(self, username=None, password=None, session=None):
        self.username = username
        self.password = password
        self.session = session or Session()

        self.torrents = {}
        self._syncing = False
        self.cid = None

    @gen.engine
    def add_url(self, url, callback=None):
        args = { 'action':'add-url', 's': url }
        yield gen.Task( self.session.request, url_params=args )

    @gen.engine
    def sync(self, simulate_crappy_network=False):
        self._syncing = True
        if not self.session.data and self.username and self.password:
            logging.info('logging in')
            yield gen.Task( self.session.login, self.username, self.password )

        self.session._simulate_crappy_network = simulate_crappy_network
        while self._syncing:
            args = { 'list': 1 }
            if self.cid:
                args['cid'] = self.cid
            response = yield gen.Task( self.session.request, url_params=args )
            if response.error:
                logging.error('error: %s' % response)
                yield gen.Task( asyncsleep, 1 )
                continue
            if 'torrentc' in response.body:
                self.cid = response.body['torrentc']

            if 'torrents' in response.body:
                logging.info('response torrents %s' % len(response.body['torrents']))
                for data in response.body['torrents']:
                    hash = data[0].lower()
                    if hash in self.torrents:
                        self.torrents[hash].update( data )
                    else:
                        self.torrents[hash] = Torrent(self, data)
            if 'torrentm' in response.body:
                for data in response.body['torrentm']:
                    hash = data[0].lower()
                    del self.torrents[hash]
            if 'torrentp' in response.body:
                # modified
                for data in response.body['torrentp']:
                    hash = data[0].lower()
                    if hash in self.torrents:
                        self.torrents[hash].update( data )
                    else:
                        self.torrents[hash] = Torrent(self, data)
            yield gen.Task( asyncsleep, 1 )
    
    def stop(self):
        self._syncing = False
