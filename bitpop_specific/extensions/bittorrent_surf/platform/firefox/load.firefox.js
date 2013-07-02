//this function is what is called in loader.js => load( id ) ...
define([
	'config',
	'router'
], function() {

	var config = require('config'),
		Router = require('router');

	return function ( id, dir ) {
		// scope ( this ) is the frames object in loader.js
		console.error('load firefox', id, dir);
        var src = config.data_path + dir + '/' + id + '/' + id + '.html'

		this[ id ] = PageWorker.Page({
			contentURL: src,
			onMessage: Router.route
		});
	}
});