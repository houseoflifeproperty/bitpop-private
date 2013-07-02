//define the path locations for chrome.
//TODO - figure out how to get all the different browser configs into one single file.

define( 'require.config.core', function () {
	return {
		baseUrl: '/',
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
			storage:              './platform/chrome/storage.chrome',
			extension_storage:    './platform/extension_storage',
			events:               './platform/events',
			browser:              './platform/browser',
			router:               './platform/router',
			request:              './platform/request',
			message:              './platform/chrome/message.chrome',
			loader:               './platform/loader',
			load_fn:              './platform/chrome/load.chrome',
	        popup:                './platform/chrome/popup.chrome',
	        tabs:                 './platform/chrome/tabs.chrome',
	        extension_tabs:       './platform/chrome/extension_tabs.chrome',
	        observer:             './platform/observer',
	        clipboard:            './platform/chrome/clipboard.chrome',
			'helpers/functional': './helpers/functional',
			'helpers/string':     './helpers/string',
	        'helpers/torrent':    './helpers/torrent'

		}
	};

});


var _install = false;
if ( chrome && chrome.runtime && chrome.runtime.onInstalled ) {
	//hold the install event listener as well
	chrome.runtime.onInstalled.addListener(function(details) {
	    if(details.reason === "install"){
	    	console.warn('INSTALLED EXTENSION');
	    	_install = true;
	    }
	});
}
