/*jshint white:false, camelcase:false */
define( [
	'helpers/functional',
	'events',
	'router',
	'loader'
], function( _bt, Events ) {

	

	var Router 	= require('router'), //set in init
		Loader 	= require('loader'), //set in init
		my 		= {},

		//hooks up how the different type of windows/workers/frames communicate with the router
		init 	= function () {
			//sandboxed iFrames check in that the content window is ready for messages to be posted to it
			Router.on( Events.CONNECT, function( msg ){
			    //console.log('EVENT ROUTER CONNECT', msg);
			    if ( msg.worker.indexOf('ext_') === 0 ) {
			    	return;
			    }

			    Router.connect( msg.worker, Loader.get( msg.worker ), function( worker, msg ){
			        //console.log('posting message to worker', msg.worker, msg.target, worker, msg);
			        worker.postMessage( msg );
			    });
			});

			//fire fox needs a console listener for development of page-workers
			Router.on( 'console', function( msg ){
			  //console.info(JSON.stringify( msg, null, 4 ));
			  //console.log( msg.worker + ': ', msg.data.substr(0,300) );
			  //console.log( msg.worker + ': ', msg.data );

			  console[ msg.data.fn ]( msg.worker, msg.data.args );

			});

			console.error('INIT MESSAGE.FIREFOX');			
		};

	//run it
	init();

	_bt.extend( my, {});

	return my;

});