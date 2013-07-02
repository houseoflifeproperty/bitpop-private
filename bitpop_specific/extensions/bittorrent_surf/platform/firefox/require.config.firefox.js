/*jshint white:false, camelcase:false */
//this script is loaded in the context of main.js, where 'self' has been defined
define( 'require.config.core', function () {
	return {
		baseUrl: self.data.url(),
	    shim: {
	        underscore: {
	            exports: '_'
	        }
	    },
		paths: {
			config:               'config',
			local_config:         'config.local',
	        app_config:           'app/config.app',
			q:                    'lib/q',
	        underscore:           'lib/underscore-amd',
			storage:              'platform/firefox/storage.firefox',
			extension_storage:    'platform/extension_storage',
			events:               'platform/events',
			browser:              'platform/browser',
			// core:                 'platform/firefox/core.firefox',
			router:               'platform/router',
			request:              'platform/firefox/request.firefox', //firefox needs to use a core chrome component for xhr2 requests ( binary requests );
			message:              'platform/firefox/message.firefox',
			loader:               'platform/loader',
			load_fn:              'platform/firefox/load.firefox',
	        popup:                'platform/firefox/popup.firefox',
	        tabs:                 'platform/firefox/tabs.firefox',
	        extension_tabs:       'platform/firefox/extension_tabs.firefox',
	        observer:             'platform/observer',
	        clipboard:            'platform/firefox/clipboard.firefox',
			'helpers/functional': 'helpers/functional',
			'helpers/string':     'helpers/string',
	        'helpers/torrent':    'helpers/torrent',
	        'helpers/time':       'helpers/time',
	        'helpers/url':        'helpers/url'
		}
	};
});


var _install = false;
console.log('self.loadReason = ', self.loadReason);	
if ( self && self.loadReason && self.loadReason === 'install' ) {
	console.log('INSTALL EXTENSION!');
	_install = true;
}
