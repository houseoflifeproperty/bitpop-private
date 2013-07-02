define( [
	'require',
	'events'
], function(require) {
	

	var Events = require('events'),
		my = {

			worker_name: window.name || document.title.toLowerCase(),

			send: function ( key, data, target ) {
				//console.log( 'sandbox send', key, data, target );
				var msg = {
					key: key,
					data: data, 
					worker: my.worker_name,
					target: target || 'core' //default to ext if target not provided
				};

				window.parent.postMessage( msg, '*');
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

				//return addon.port.on.apply( scope, [ key, handler ]);
				return (function(){
					window.addEventListener( 'message', function( event ) {
					//$(window).bind('message', function( jqEvent ){
						//var event = jqEvent.originalEvent,
						var msg_key = event.data.key,
							source = event.data.worker,
							data = event.data.data;

						if( key === msg_key && event.source === window.parent ){
							//console.error('got iframe message', window.name, msg_key, key, data );
							handler.apply( scope, [ data, source ] );
						}
					//});
					}, false );

				})();			
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
			            	s = s + ', ' + JSON.stringify( args[j] );
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
	


	console.log('hello sandbox message for firefox extension tab', Events);

	return my;
});