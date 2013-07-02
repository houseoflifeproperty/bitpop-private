//THIS IS SURF SPECIFIC AND SHOULDN'T BE IN THE SCAFFOLD
define([
	'require', 
	'underscore', 
	'helpers/functional'
], function ( require ) {

	var _ = require('underscore');
	var _bt = require('helpers/functional');

	var gui = {
		//used for making a title string for an html element based off relevent info in notification data
		getNotificationTip: function( data ){
			var tip = '';

			if ( data ) {
				data = _bt.makeArray( data );
				//check for worthwhile urls
				_.each( data, function(el, i, arr){
					if( el.url ){
						if( i )
							tip += ', ';
						tip += el.url;
					} else if ( el.name ) {
						if ( i )
							tip += ', ';
						tip += el.name;
					}
				});        
			}
			
			return tip;
		}

	};

	return gui;
});
