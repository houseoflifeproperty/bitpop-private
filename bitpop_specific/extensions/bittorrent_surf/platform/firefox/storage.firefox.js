/*jshint white:false, camelcase:false */
define([
	'require',
	'helpers/functional'
],
function ( require ) {

	

	var _bt = require( 'helpers/functional' ),
		storage = SS.storage, 
		my = {
			get: function( key, callback ){
				var obj = {};
				obj[ key ] = _bt.clone( storage[ key ] );
				//console.log('storage get: ', key, JSON.stringify( _bt.clone( obj ) ), '\n\n', JSON.stringify( _bt.clone( storage[ key ] ) ),'\n\n' );
				
				//defer callback until current stack has finished
				//avoids race conditions
				setTimeout( function(){ 
					callback( obj );
				}, 0 );
				return;
			},
			set: function( items, callback ){
				for ( var key in items ){
					storage[ key ] = _bt.clone( items[ key ] );
				}
				//console.log('storage set: ', key, JSON.stringify( _bt.clone( items ) ) );
				
				//defer callback until current stack has finished
				//avoids race conditions
				setTimeout( function () {
					callback();
				}, 0 );
				return;
			},
			clear: function(){
				for ( var key in storage ){
					delete storage[ key ];
				}
				return;
			},
			remove: function( key, callback ){
				if( storage[ key ] ) {
					delete storage[ key ];
				}
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
