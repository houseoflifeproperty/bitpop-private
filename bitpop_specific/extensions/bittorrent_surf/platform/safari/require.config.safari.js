//define the path locations for chrome.
//TODO - figure out how to get all the different browser configs into one single file.

define( 'require.config.core', function () {
	return {
		//baseUrl: '/' + window.location.pathname[0],
		baseUrl: safari.extension.baseURI,
	    shim: {
	        underscore: {
	            exports: '_'
	        }
	    },
		paths: {
			config:               './config',
			local_config:         './config.local',
	        app_config:           './app/config.app',
			q:                    './lib/q',
	        underscore:           './lib/underscore-amd',
			storage:              './platform/safari/storage.safari',
			extension_storage:    './platform/extension_storage',
			events:               './platform/events',
			browser:              './platform/browser',
			router:               './platform/router',
			request:              './platform/request',
			message:              './platform/safari/message.safari',
			loader:               './platform/loader',
			load_fn:              './platform/safari/load.safari',
	        popup:                './platform/safari/popup.safari',
	        tabs:                 './platform/safari/tabs.safari',
	        extension_tabs:       './platform/safari/extension_tabs.safari',
	        observer:             './platform/observer',
	        clipboard:            './platform/safari/clipboard.safari',
			'helpers/functional': './helpers/functional',
			'helpers/string':     './helpers/string',
	        'helpers/torrent':    './helpers/torrent'

		}
	};

});

//track install better
var _install = false;
if ( safari && safari.extension && safari.extension.settings ) {
	//http://stackoverflow.com/questions/15968213/safari-extension-first-time-run-and-update
	if ( !safari.extension.settings._installed ) {
		_install = true;
		safari.extension.settings._installed = true;
		console.log('INSTALLED SAFARI EXTENSION');
	}
}