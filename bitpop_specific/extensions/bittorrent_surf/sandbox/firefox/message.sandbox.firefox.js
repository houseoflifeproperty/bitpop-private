define( [
	'require',
	'events'
], function(require) {
	

	var Events = require('events'),
		my = {

			worker_name: window.name || document.title.toLowerCase(),

			send: function ( key, data, target ) {
				return addon.postMessage({
					key:    key,
					data:   data,
					worker: my.worker_name,
					target: target || 'core'
				});
				// window.parent.postMessage({
				// 	key: key, 
				// 	data: data, 
				// 	worker: window.name,
				// 	target: target || 'ext' //default to ext if target not provided
				// }, '*');
			},

			on: function ( key, handler, scope ) {
				if( !handler || typeof handler !== 'function' ) {
					throw new Error('Trying to listen to Bt.msg on key (' + key + ') without a handler function.');
					return;
				}
				//console.error('REGISTERING HANDLER', window.name, key);

				if( !scope )
					scope = this;

				//register the listener boolean in the extension core
				my.send( Events.LISTEN, key, 'core' );

				return (function(){
					addon.on('message', function(msg){

						if( key === msg.key ){
							//console.log('handling message', msg.worker, msg.target, msg.key);
							handler.apply( scope, [ msg.data, msg.worker ] );
						}
					});
				})();


				// //return addon.port.on.apply( scope, [ key, handler ]);
				// return (function(){
				// 	window.addEventListener( 'message', function( event ) {
				// 	//$(window).bind('message', function( jqEvent ){
				// 		//var event = jqEvent.originalEvent,
				// 		var msg_key = event.data.key,
				// 			data = event.data.data;

				// 		if( key === msg_key ){
				// 			//console.error('got iframe message', window.name, msg_key, key, data );
				// 			handler.apply( scope, [ data ] );
				// 		}
				// 	//});
				// 	}, false );

				// })();			
			}
		};

	//send connect message
	my.send( Events.CONNECT, {}, 'core' );


	//take over console messages so I can see them when developing the extension
	var oldConsole = console,
		fns = ['log','info','warn','error','trace'];

	for ( var i=0; i<fns.length; i++ ){

		(function(val){

			console[ val ] = function(a,b,c,d,e){
			    var args = [a,b,c,d,e];
			    var s = '';
			    for (var j=0; j<args.length; j++) {
			        if (args[j] !== undefined) {
			            try {
			            	s = s + ', ' + 	JSON.stringify( args[j] );
			            } catch ( err ) {
			            	s = s + ', BAD ARGUMENT ( ' + j +' )';
			            }
			        }
			    }

			    my.send( 'console', {
			    	fn: val,
			    	args: s
			    }, 'core');

				//Bt.msg.send( 'console', val+': '+s );	    
			}

		})(fns[i]);

	}

	console.log('hello sandbox message firefox', window.name, document.title.toLowerCase() );

	return my;
});