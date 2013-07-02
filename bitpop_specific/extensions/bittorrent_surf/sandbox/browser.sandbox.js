define([
	'require', 
	'config',
	'extension_storage.sandbox',
	'observer.sandbox',
	'request.sandbox',
	'loader.sandbox',
	'popup.sandbox',
	'tabs.sandbox',
	'extension_tabs.sandbox'
], function ( require ) {
	

	var config            = require('config'),
		Observer          = require('observer.sandbox'),
		Storage           = require('extension_storage.sandbox'),
		Request           = require('request.sandbox'),
		Popup             = require('popup.sandbox'),
		Tabs              = require('tabs.sandbox'),
		Extension_Tabs    = require('extension_tabs.sandbox'),
		Loader            = require('loader.sandbox');

	var core = null,
		get_sandbox = function () {
			return core;
		},
		//simple ready boolean
		is_ready = false,
		//where to hold registered ready-callbacks
		ready_listeners = [],
		//register callbacks for when browser core has loaded
		ready = function ( cb ) {
			ready_listeners.push( cb );
			if ( is_ready ) {
				call_ready();
			}
		},
		//empties out ready listeners and calls them in the order they were inserted
		call_ready = function () {
			while ( ready_listeners.length ) {
				var cb = ready_listeners.shift();
				//pass in the core module
				cb( core );
			}
		};

	// * Browser delegate model the actual low-level browser operations that 
	// * differ from each other. The following interfaces need to be defined 
	// * for a delegate object:
	// *		init(config): intiialization
	// *		storage: storage interfaces
	// *		requests: ajax request interfaces
	// *		message: inter-component messaging interfaces

	// TODO: error handling - what if config.browser is undefined
	//require( [ './sandbox/' + config.browser + '/sandbox.' + config.browser ], function ( the_core ) {
	require( [ 'sandbox.' + config.browser ], function ( the_core ) {
		core = the_core;
		core.storage = Storage;
		core.request = Request;
		core.loader = Loader;
		core.observer = Observer;
		core.popup = Popup;
		core.tabs = Tabs;
        core.extension_tabs = Extension_Tabs;
		is_ready = true;
		//init the core
		core.init( config );
		//init the core ( sandbox ) observer
		core.observer.init( core.message );
		//init the core storage
		core.storage.init( core.message );
		//init the ajax link
		core.request.init( core.message );
		//init the popup connection module
		core.popup.init( core.message );
		//init the tabs connection module
		core.tabs.setup( core.message );
        //init the extension_tabs ( sandboxed tab pages module )
        core.extension_tabs.init( core.message );
        //set up a loader_observer for the loader to use
        var loader_observer = core.observer.load('loader');
		//init the loader to load the right scripts
		core.loader.init( loader_observer );
		//ready returned from loader is a Q promise that resolves when script has loaded
		core.loader.ready.then( call_ready );
		//call_ready();
	});

	return {
		ready: ready,
		get_sandbox: get_sandbox
	};
});
