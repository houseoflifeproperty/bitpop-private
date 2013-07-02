(function () {

	require.config({
		paths: {
			//events: '../../platform/events',
			'helpers/time': '../../helpers/time'
		}
	});

	require([
		//'events',
		'helpers/time'
	// ], function ( Events ) {
	], function () {

		var _time     = require('helpers/time'),
			enc_opts  = window.location.href.split('?')[1],
			opts      = JSON.parse( atob( enc_opts ) ),
			port_name = 'ext_'+opts.name + '_' + _time.getTime();

		//connect the port
		window.Port = chrome.extension.connect({
	    	name: port_name
		});

		//create the sandboxed iframe
		var frame = document.createElement('iframe');

		//listen for messages from iframe
		window.addEventListener( 'message', function( event ) {
            var msg = event.data;
			//console.log('got message from iframe', event.data, msg);

            //going to transform messages so each tab thinks it is on its own
            msg.worker = port_name;

			// //Router.route( event.data );
			Port.postMessage( msg );
		}, false );		

        //listen for messages from core and pass them onto sandboxed popup frame
        Port.onMessage.addListener( function ( msg ) {
            //transform the message back so tab page thinks it is unique and all alone in this world.
            msg.target = opts.name;

            frame.contentWindow.postMessage( msg, '*' );
        });

		//load the iframe
		frame.src = '/app/'+opts.name+'/'+opts.name+'.html?' + enc_opts; //pass the encoded options into the sandboxed frame
		document.body.appendChild( frame );

	});

})();