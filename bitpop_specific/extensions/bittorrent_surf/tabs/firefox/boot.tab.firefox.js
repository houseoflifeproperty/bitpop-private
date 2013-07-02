(function(){

	var _time = {
		getTime: function() {
			var date = new Date();
			return date.getTime();
		}
	};

	var enc_opts  = window.location.href.split('?')[1],
		opts      = JSON.parse( atob( enc_opts ) ),
		port_name = 'ext_'+opts.name + '_' + _time.getTime();

	// console.log('yea, tab ready', port_name, enc_opts, JSON.stringify( opts, null, 4 ) );

	// console.log('event listener? ', typeof window.addEventListener );

	//connect the worker.
	//just sending message as a string, that get's picked up as a connect call
	self.postMessage( port_name );

	//create the iframe
	var frame = document.createElement('iframe');

	//listen for messages from iframe
	window.addEventListener( 'message', function( event ) {
        var msg = event.data;

        //going to transform messages so each tab thinks it is on its own
        msg.worker = port_name;

		//console.log('got message from iframe', JSON.stringify( event.data, null, 4 ) );

		self.postMessage( msg );
	}, false );			

    //listen for messages from core and pass them onto sandboxed popup frame
    self.on('message', function ( msg ) {
    	// console.log('self got message');
        //transform the message back so tab page thinks it is unique and all alone in this world.
        msg.target = opts.name;

        //console.log('got message from core to pass on to sandboxed tab: ', JSON.stringify( msg, null, 4 ) );

        frame.contentWindow.postMessage( msg, '*' );
    });

	//load the iframe
	//frame.src = window.location.protocol + '//' + window.location.host + '/firefox/data/app/'+opts.name+'/'+opts.name+'.html?' + enc_opts; //pass the encoded options into the sandboxed frame
    var data_path = window.location.href.split('/data/')[0] + '/data/';
    //document.write( data_path );	
    frame.src = data_path + 'app/'+opts.name+'/'+opts.name+'.html?' + enc_opts; //pass the encoded options into the sandboxed frame
	document.body.appendChild( frame );

})();