(function (){

	define([
		'require',
		'underscore',
		'config'
	], function ( require ) {

		var my = {},
			_ = require('underscore'),
			config = require('config'),
			Settings = null, //set in init
			observer = null, //set in init
			inited = false;

		//Private methods
		var initialize = function () {
			if ( !inited ) {
				inited = true;

				Settings = _sandbox.storage.load('settings', {
					wait: 300,
		            defaults: config.app.settings_defaults
		        });
			}

			return Settings; //always return the extension_storage instance
		};

		//Public Methods
		_.extend( my, {
			init: initialize
		});

		return my;
	});

})();