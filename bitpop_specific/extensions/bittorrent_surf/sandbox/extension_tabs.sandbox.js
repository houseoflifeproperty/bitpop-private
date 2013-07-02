define([
	'require',
	'underscore',
	'events'
], function ( require ) {

	var _ 		= require('underscore'),
		Events  = require('events'),
		Message = null, //set in init
		my 		= {};


	//Private Methods
	var initialize = function ( _message ) {
		Message = _message;

		console.log('extension_tabs init', _message);

	},

	//sends message to core to open extension tab
	open = function ( opts ) {
		//opts is serializable object
		// .name is required.
		// then entire object is b64 encoded and passed
		// on as a search param on the url string
		Message.send( Events.OPEN_EXT_TAB, opts, 'core' );
	};


////  OOOOOOOOOH...
// 		give the core router an observer.
//		on connect trigger connect with the worker name
// 		on disconnect, trigger disconnect with the worker name

	//Public Methods && Variables
	_.extend( my, {
		init: initialize,
		open: open
	});

	return my;

});