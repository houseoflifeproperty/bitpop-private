define([
	'require',
	'local_config',
	'app_config'
], function(require) {

	

	var config = {
			//browser: 	( typeof Cc === 'undefined' && typeof addon === 'undefined' ? ( typeof chrome === 'undefined' ? 'safari' : 'chrome' ) : 'firefox' ),
			browser: 	( typeof Cc === 'undefined' && typeof addon === 'undefined' && !( typeof document !== 'undefined' && 'MozBoxSizing' in document.documentElement.style ) ? ( typeof chrome === 'undefined' ? 'safari' : 'chrome' ) : 'firefox' ),
			env: 		'prod',
			//config.source gets set in loader to tell us where the code is coming from.
			//	don't use this key for ANYTHING else
			source: 	null
		},
		app_config = require('app_config'),
		local_config;

	try {
		local_config = require('local_config');
	}
	catch ( err ) {
		console.error('couldn\'t load local config');
	}

	if ( local_config !== undefined ) {
		for ( var key in local_config ) {
			config[ key ] = local_config[ key ];
		}
	}


	//set app config
	config.app = app_config;

	//browser bools
	config.is_chrome = function(){ return config.browser === 'chrome' };
	config.is_ff = function(){ return config.browser === 'firefox' };
	config.is_safari = function(){ return config.browser === 'safari' };

	config.data_path = config.data_path || typeof BT_BUILD_SCRIPT !== 'undefined' ? '/' : config.is_safari() ? safari.extension.baseURI : config.is_chrome() ? ( typeof chrome !== 'undefined' && chrome.extension ) ? chrome.extension.getURL('') : '/' : ( self && self.data ) ? self.data.url() : '/firefox/data/' ;
	//TODO:  lib path should be app_path
	config.lib_path = config.lib_path || config.data_path + 'src/lib';

	config.toJSON = function () {
		var safe = {};
		for ( var key in config ) {
			if ( typeof config[ key ] !== 'function' ) {
				safe[ key ] = config[ key ];
			}
		}
		return safe;
	};

	// var noop = function(){},
	//     //consoles = "assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,trace,warn".split(",");
	//     consoles = "assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,warn".split(",");
	// for( var i = 0, len = consoles.length; i < len; i++ ){
	//   console[ consoles[i] ] = noop;
	// }


	return config;
});
