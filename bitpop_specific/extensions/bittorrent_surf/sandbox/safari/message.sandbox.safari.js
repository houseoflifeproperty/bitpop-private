define( [
	'require',
	'events'
], function(require) {
	

	var _opts,
		_target_frame = window.parent;
	try {
		_opts = JSON.parse( atob( window.location.href.split('?')[1] ) );
		//default path is app
		if ( _opts.popover ) {
			_target_frame = safari.extension.globalPage.contentWindow;

			//for development.  turn off when ready to stage and ship
			window.console = safari.extension.globalPage.contentWindow.console;

			console.log('SETTING _TARGET_FRAME');
		}
	} catch ( err ) {
		console.error( 'couldn\'t parse _opts', err );
	}

	var Events = require('events'),
		my = {

			worker_name: window.name || document.title.toLowerCase(),

			send: function ( key, data, target ) {
				//console.log( 'sandbox send', key, data, target );
				_target_frame.postMessage({
					key: key,
					data: data,
					worker: my.worker_name,
					target: target || 'core' //default to core if target not provided
				}, '*');
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

						// console.log('got message in sandbox', event.source === _target_frame, key, msg_key, source, data, event.data.target);

						//make sure that message from parent that spawned it
						if( key === msg_key && event.source === _target_frame ){
							//console.error('got iframe message', event.source === window.parent, window.name, msg_key, key, data );
							handler.apply( scope, [ data, source ] );
						}
					//});
					}, false );

				})();			
			}
		};

	//send connect message
	my.send( Events.CONNECT, {}, 'core' );

	// //for development.  turn off when ready to stage and ship
	// window.console = safari.extension.globalPage.contentWindow.console;

	console.log('hello sandbox message safari', document.title, Events);

	return my;
});