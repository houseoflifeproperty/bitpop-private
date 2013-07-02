// require.config({
// 	baseUrl: '/src'
// });

//get the encoded opts into a usable format
var _opts,
	_message_module = 'message.sandbox.safari';
try {
	_opts = JSON.parse( atob( window.location.href.split('?')[1] ) );
	//default path is app
	if ( _opts.popover ) {
		_message_module = 'message.sandbox.safari.popover';
	}
} catch ( err ) {
	console.error( 'couldn\'t parse _opts', err );
}

console.error( ( _message_module === 'message.sandbox.safari.popover' ? 'I AM _POPOVER' : 'I AM SANDBOXED' ), document.title );


define([
	'require', 
	//'message.sandbox.safari'
	'message.sandbox.safari'
], function ( require ) {
// define( [ 'require' ], function(require) {
	// var storage = require('./storage.chrome');
	// var router = require('../router');
	// var loader = require('./loader.chrome');
	var message = require( 'message.sandbox.safari' );
		//storage = require('./extension_storage.sandbox');
	// var requests = require('./requests');

	

	var initialize = function ( config ) {
		console.log('core sandbox initialize', arguments );
	};

	// TODO: define the actual interfaces and docs
	return {
		init: 		initialize,
		message: 	message
		//storage: 	storage
		// router: 	router,
		// loader: 	loader
		// requests: requests,
		// message: message
	};
});
