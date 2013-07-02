//this function is what is called in loader.js => load( id ) ...
define([
	'config'
], function() {

	var config = require('config');

	return function ( id, dir ) {
		// scope ( this ) is the frames object in loader.js
        var src = config.data_path + dir + '/' + id + '/' + id + '.html'

		this[ id ] = document.createElement('iframe');
		this[ id ].src = src;
		this[ id ].name = id;
		document.body.appendChild( this[ id ] );
	}
});