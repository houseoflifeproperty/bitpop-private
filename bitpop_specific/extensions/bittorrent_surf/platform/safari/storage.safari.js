/*jshint white:false, camelcase:false */
define([
	'require',
	'helpers/functional'
],
function ( require ) {

	

	var _bt = require( 'helpers/functional' ),
		storage = localStorage, 
		my = {
			get: function( key, callback ){
				var obj = {};
				obj[ key ] = JSON.parse( storage.getItem( key ) );

				//defer callback until current stack has finished
				//avoids race conditions
				setTimeout(function(){
					callback( obj );
				}, 0);
				return;
			},
			set: function( items, callback ){
				for ( var key in items ){
					storage.setItem( key, JSON.stringify( items[ key ] ) );
				}
				//defer callback until current stack has finished
				//avoids race conditions
				setTimeout( function () {
					callback();
				}, 0 );
				return;
			},
			clear: function(){
				storage.clear();
				return;
			},
			remove: function( key, callback ){
				storage.removeItem( key );
				//defer callback until current stack has finished
				//avoids race conditions
				setTimeout( function () {
					callback();
				}, 0 );
				return;
			}
		};

	return {
		local: my,
		sync:  my,
		clear: my.clear
	};

});
