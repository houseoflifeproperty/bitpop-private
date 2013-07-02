if ( window.top === window ) {
	
	var _Message = (function () {
		var my = {
			send: function ( key, data, target ) {
				safari.self.tab.dispatchMessage('msg', {
					key: key,
					data: data,
					worker: 'tab',
					target: target || 'core' //default to core if target not provided
				});
			},
			on: function ( key, handler, scope ) {
				if( !handler || typeof handler !== 'function' ) {
					throw new Error('Trying to listen to for message on key (' + key + ') without a handler function.');
					return;
				}
				//console.error('REGISTERING HANDLER', window.name, key);

				if( !scope )
					scope = this;

				//register the listener boolean in the extension core
				my.send( 'rt:lis', key, 'core' );

				//return addon.port.on.apply( scope, [ key, handler ]);
				return (function(){
					safari.self.addEventListener( 'message', function( event ) {
						//console.error('tab page got message', event, arguments);
						var msg_key = event.message.key,
							source = event.message.worker,
							data = event.message.data;

						//spoof back to tab from sepcific tab target name
						event.message.target = 'tab';

						//make sure that message from parent that spawned it
						if( key === msg_key ){
							//console.error('got iframe message', msg_key, key, data );
							handler.apply( scope, [ data, source ] );
						}
					}, false );

				})();			
			}
		};
		return my;
	})();

	_Message.on('inject', function ( data, src ) {
		console.error('got inject message in tab', data, src );
		eval(data);
	});

	//dispatch tab specific ready call
	//safari.self.tab.dispatchMessage('ready');
}