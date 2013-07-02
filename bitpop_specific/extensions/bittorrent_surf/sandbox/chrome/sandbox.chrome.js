// require.config({
// 	baseUrl: '/src'
// });

define([
	'require', 
	//'../router',
	'./message.sandbox.chrome'
	//'./loader.chrome'
//	'./requests', 
//	'./message'
], function ( require ) {
// define( [ 'require' ], function(require) {
	// var storage = require('./storage.chrome');
	// var router = require('../router');
	// var loader = require('./loader.chrome');
	var message = require('./message.sandbox.chrome');
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
