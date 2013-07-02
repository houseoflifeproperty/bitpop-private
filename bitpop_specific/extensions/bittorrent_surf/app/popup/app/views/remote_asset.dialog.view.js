(function(){

	define([
		'require',
		'backbone',
		'dialog.view'
	], function (require) {
		//required components
		var Dialog = require('dialog.view');

		//app constructor
		var View = Dialog.extend({
			
            id: 'remote_asset',

            events: {
            	'click #remote_asset .cancel': "cancel",
        		'click #remote_asset .primary': "close"            	
            },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );

				// this.render();
				var html = Handlebars.templates.remote_asset(); //needs data to render
				this.$dialog.html( html );

				this.setup_iframe();
				//reference the icon els
				this.$icon = this.$dialog.find('.remote_asset_icon');
				this.bind_events();
				
				console.log('initialize remote_asset dialog view', arguments, this);
			
			},

			bind_events: function(){
		        //listen for posted messages from remote_asset iframes
		        $(window).on('message', _.bind( this.on_message, this ) );
			},

			on_message: function ( evt ) {
		        //the popup is a sandboxed worker that recieves messages
		        //from it's parent from the ext core.  Need to make sure that
		        //this message came from the iframe generated for this view
		        if ( evt.originalEvent.source !== this.iframe.contentWindow ) { 
		        	return; 
		        }

		    	var e = evt.originalEvent,
		    		key = e.data.key,
		    		data = e.data.data,
		    		src = e.source;
		        //console.log('got message from remote asset iframe', this.iframe, evt, key, data, src, src === this.iframe.contentWindow );

		        //otherwise, handle the message
		        if ( this[ 'on_' + key ] ) {
		        	this[ 'on_' + key ]( data, src, key );
		        } else {
		        	console.error('remote_asset view has no handler for key \''+key+'\', looked for \'on_'+key+'\'');
		        }
			},

			send_message: function ( key, data, target ) {
				target.postMessage( { key: key, data: data }, '*' );
			},

			on_get_commands: function ( data, src, key ) {
				this.send_message( key, this.app.commands, src );
			},

			on_open_tab: function ( data, src, key ) {
				Bt.msg.send( Bt.events.OPEN_TAB, data, 'ext' );
			},

			on_do_command: function ( data, src, key ) {
				this.app.do_command( data );
			},

			setup_iframe: function () {
				this.iframe = document.createElement('iframe');
				$( this.iframe ).appendTo( this.$dialog.find('#remote_iframe_container') );
			},

			set_title: function ( str ) {
				this.$dialog.find('.dialog_header .text').text( str );
			},

			set_icon: function ( src ) {
				if ( !src ) {
					this.$icon.hide();
				} else {
					this.$icon.find('img').attr({ src: src });
					this.$icon.show();
				}
			},

			load: function ( opts ) {
				console.log('load remote_asset view', opts);
				this.set_title( opts.title );
				this.set_icon( opts.icon );
				$(this.iframe).attr('class', opts.cls);
				this.iframe.src = opts.url;
			},

			unload: function () {
				this.iframe.src = null;
			}
		});

		return View;
	});

})();