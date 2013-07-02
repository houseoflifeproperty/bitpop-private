define([], function () {
    return {
        paths: {
            //jquery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min'
            sites:            './app/ext/lib/sites',
            surf_link:        './app/ext/lib/surf_link',
            parser:           './app/ext/lib/parser',
            parser_cache:     './app/ext/lib/parser_cache',
            request_queue:    './app/ext/lib/request_queue',
            notifications:    './app/ext/lib/notifications',
            search:           './app/ext/lib/search',
            btfc_search:      './app/ext/lib/search.btfc',
            settings:         './app/ext/lib/settings',
            app_helpers:      './app/helpers.app',
            sha1:             './app/lib/falcon-api/js/deps/SHA-1',
            sjcl:             './app/lib/falcon-api/js/deps/sjcl',

            btapp:            './app/lib/btapp/btapp',
            backbrace:        './app/lib/backbrace/backbrace',
            'client.btapp':   './app/lib/btapp/client.btapp',
            'plugin.btapp':   './app/lib/btapp/plugin.btapp',
            'pairing.btapp':  './app/lib/btapp/pairing.btapp',
            'app.torque':     './app/ext/lib/app.torque',

            scraper:          './app/ext/lib/scraper',
            bench:            './app/ext/lib/bench',
            download_urls:    './app/ext/lib/download_urls'
        },

        shim: {
            btapp: {
                exports: 'Btapp',
                deps: [ 'client.btapp', 'plugin.btapp', 'pairing.btapp', 'backbone', 'backbrace' ]
            },
            'plugin.btapp': {
                // exports: [ 'PluginManagerView', 'PluginManager' ],
                deps: [ 'backbone', 'pairing.btapp' ],
                init: function () {
                    //Set globals here instead of in exports
                    window.PluginManagerView = PluginManagerView;
                    window.PluginManager = PluginManager;
                    return;
                }
            },
            'client.btapp': {
                // exports: [ 'TorrentClient', 'FalconTorrentClient', 'LocalTorrentClient' ],
                deps: [ 'plugin.btapp', 'pairing.btapp', 'jstorage' ],
                init: function () {
                    //Set globals here instead of in exports
                    window.TorrentClient = TorrentClient;
                    window.FalconTorrentClient = FalconTorrentClient;
                    window.LocalTorrentClient = LocalTorrentClient;
                    return;
                }
            },
            'pairing.btapp': {
                // exports: [ 'PairingView', 'PluginPairing', 'JQueryPairing', 'Pairing' ],
                deps: [ 'backbone' ],
                init: function () {
                    //Set globals here instead of in exports
                    window.PairingView = PairingView;
                    window.PluginPairing = PluginPairing;
                    window.JQueryPairing = JQueryPairing;
                    window.Pairing = Pairing;
                    return;
                }
            },
            'backbrace': {
                exports: 'Backbrace',
                deps: [ 'backbone' ]
            },
            sjcl: {
                exports: 'sjcl'
            }
        }
    };
});