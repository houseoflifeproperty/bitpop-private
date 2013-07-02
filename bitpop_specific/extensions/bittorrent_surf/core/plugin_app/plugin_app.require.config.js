define([], function () {
	return {
		//base url is two levels up because all sandboxed workers live in /app/{name}/{name}.html
		//baseUrl: '../../',
		paths : {
			btapp:            './app/lib/btapp/btapp',
	        backbrace:        './app/lib/backbrace/backbrace',
	        'client.btapp':   './app/lib/btapp/client.btapp',
	        'plugin.btapp':   './app/lib/btapp/plugin.btapp',
	        'pairing.btapp':  './app/lib/btapp/pairing.btapp'
	        //surf_events:      './app/js/surf_events'
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
	        }
	    }
	};
});