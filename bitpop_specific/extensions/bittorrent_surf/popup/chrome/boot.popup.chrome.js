// console.log('hello boot.popup.chrome.js');

(function () {

	require.config({
		paths: {
			events: '../../platform/events',
			jquery: '../../lib/jquery'
		}
	});

	require([
		'events',
		'jquery'
	], function ( Events, $ ) {
		var frame, h = 0, w = 0;

		//connect the port
		window.Port = chrome.extension.connect({
	    	name: "popup"
		});

		//create the sandboxed iframe
		frame = document.createElement('iframe');

		//listen for messages from sandboxed popup frame
		window.addEventListener( 'message', function( event ) {
			//console.log('got message from iframe', event.data);
			if ( event.data.key === Events.RESIZE ) {

				if ( event.data.data.height !== h || event.data.data.width !== w ) {
					h = event.data.data.height;
					w = event.data.data.width;

					// console.warn('RESIZE EVENT', event.data.data);

					$( frame ).css({
						height: event.data.data.height,
						width:  event.data.data.width
					});

				}
				return;
			}
			Port.postMessage( event.data );
		}, false );

		//listen for messages from core and pass them onto sandboxed popup frame
		Port.onMessage.addListener( function ( msg ) {
			frame.contentWindow.postMessage( msg, '*' );
		});

		//load the sandboxed popup iframe
		frame.src = '/app/popup/popup.html';
		frame.name = 'popup';
		document.body.appendChild( frame );

	});

	//rsz
})();