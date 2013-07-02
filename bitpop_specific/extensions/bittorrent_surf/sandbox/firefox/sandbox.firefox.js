// require.config({
// 	baseUrl: '/src'
// });

var message_path = ( typeof addon === 'undefined' ? 
	'message.sandbox.firefox.tab' :
	'message.sandbox.firefox'
);

define([
	'require', 
	//'../router',
	//'./message.sandbox.firefox'
	message_path

	//'./loader.chrome'
//	'./requests', 
//	'./message'
], function ( require ) {
// define( [ 'require' ], function(require) {
	// var storage = require('./storage.chrome');
	// var router = require('../router');
	// var loader = require('./loader.chrome');
	//var message = require('./message.sandbox.firefox');
	var message = require(message_path);
		//storage = require('./extension_storage.sandbox');
	// var requests = require('./requests');

	

	var initialize = function ( config ) {
		console.log('firefox core sandbox initialize', arguments );

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
