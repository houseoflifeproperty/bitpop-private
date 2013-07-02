(function () {

	var enc_opts  = window.location.href.split('?')[1],
		opts      = JSON.parse( atob( enc_opts ) );

	//create the iframe
	var frame = document.createElement('iframe');

	//listen for messages from iframe.  msg.worker gets transformed by core safari tabs module
	window.addEventListener( 'message', function( event ) {
        var msg = event.data;

        //cancel connect messages from code, because ext core takes care of the connections
        if ( msg.key === 'rt:cct' || msg.key === 'rt:dct' ) {
        	return;
        }

		//console.log('got message from iframe', JSON.stringify( event.data, null, 4 ) );
		safari.self.tab.dispatchMessage( 'msg', msg );
	}, false );			

	safari.self.addEventListener( 'message', function( event ) {
        var msg = event.message;
        //transform the message target name back so tab page thinks it is unique and all alone in this world.
        //console.log('got message from core to pass on to sandboxed tab: ', JSON.stringify( msg, null, 4 ) );
        msg.target = opts.name;
        //console.log('got message from core to pass on to sandboxed tab: ', JSON.stringify( msg, null, 4 ) );
		frame.contentWindow.postMessage( msg, '*' );
	}, false );

	//load the iframe
	frame.src = safari.extension.baseURI+'app/'+opts.name+'/'+opts.name+'.html?' + enc_opts; //pass the encoded options into the sandboxed frame
	document.body.appendChild( frame );

})();