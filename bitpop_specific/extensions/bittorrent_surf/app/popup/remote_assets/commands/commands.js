var Bt = Bt || {};

$(document).ready(function(){
	var on_cmd_click = function( e ){
		e.preventDefault();
		e.stopPropagation();
		window.parent.postMessage({ key: 'do_command', data: $(this).data('cmd') }, '*');
	};

	Bt.on_get_commands = function ( data ) {
		console.warn('on_get commands', data );

		_.each( data, function ( val, key ) {
			console.log( key, val );

			//make the element
			var html = [
				'<div class="cf">',
					'<a class="left" data-cmd="'+key+'">',
						'/'+key,
					'</a>',
					'<span class="right">',
						val.desc,
					'</span>',
				'</div>'
			].join('');

			$('body').append( html );

			$('a[data-cmd="'+key+'"]').click( on_cmd_click );
		});


	};

	$(window).on('message', function ( evt ) {
		var e = evt.originalEvent,
			key = e.data.key,
			data = e.data.data;

		//console.log('commands got a message', evt);

		if ( Bt[ 'on_'+key ] ) {
			Bt[ 'on_'+key ]( data );
		} else {
			console.error('no handler for message with key: ' + key );
		}
	});

	window.parent.postMessage({ key: 'get_commands' }, '*');
});