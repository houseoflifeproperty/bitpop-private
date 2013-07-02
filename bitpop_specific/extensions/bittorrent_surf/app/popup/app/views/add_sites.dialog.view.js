(function(){

	define([
		'require',
		'handlebars',
		'backbone',
		'sandbox_helpers',
		'dialog.view'
	], function (require) {
		//required components
		var Dialog = require('dialog.view'),
			_bt = require('sandbox_helpers');

		//app constructor
		var View = Dialog.extend({
			
            id: 'add_sites',

            events: {
            	'click .site .remove': "remove_site",
            	'click #add_sites .cancel': "on_cancel",
        		'click #add_sites .primary': "on_save"
            },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );

				console.log('initialize add-sites dialog view');			
			},

			on_cancel: function ( e ) {
				// e.preventDefault();
				// e.stopPropagation();
				var _this = this;
                this.$dialog.find('.site').each(function(){
					var id = $(this).data('id');
					_this.collection.disable( id );
					$(this).remove();
                });

                this.cancel();
			},

			on_save: function ( e ) {
				// e.preventDefault();
				// e.stopPropagation();
				var _this = this;

				this.$dialog.find('.site').each(function(){
					var id = $(this).data('id');
					_this.collection.enable( id );
					$(this).remove();
				});

				this.close();
			},

			// open: function () {
			// 	Dialog.prototype.open.apply( this, arguments );
			// 	this.render();
			// },

		    // removes entry from add-sites dialog
			remove_site: function ( e ) {
		        var me = $(e.currentTarget),
		        	site = me.closest('.site'),
		        	sites = site.parent(),
		        	id = site.data('id');

		        console.error('REMOVE SITE', id);

		        //decline the site in the collection.  communicates with ext
		        //arg[0] is id to disable
		        this.collection.disable( id );

		        //remove from the list
		        site.remove();

		        //make sure there are still some sites left
		        var remaining = sites.children('.site').length;

		        _bt.track( 'dialog', 'disable_site', this.id, remaining );

		        if ( !remaining ) {
		            this.close();
		        }
			},

			render: function () {
				// var html = Handlebars.templates.add_sites(); //needs data to render
				// this.$dialog.html( html );

				if ( ! this.collection.detected.length ) {
					return this.close();
				}

				var html = Handlebars.templates.add_sites( { sites: this.collection.detected });
					this.$dialog.html( html );
                // var html = Handlebars.templates.notifications( { notifications: this.collection.toJSON() } );
                // this.list_content.html( html );
                
                //alerts are no longer the headers
                //this.app.views.alert.on_auto_open( notification );

			}
		});


    	//HANDLEBARS HELPERS
	    _.each({
	        add_sites_icon: function(data){
	            //console.log('add site icon helper', this, data);

	            var img = ( this.favicon ? '<img src="'+ this.favicon +'" />' : '' );

	            return new Handlebars.SafeString( '<span class="icon">'+ img +'</span>' );
	        },
	        add_sites_header: function( data ){
	            //console.log('add_site_header helper', data, this);

	            var text = "Search site";

	            if( data.sites.length > 1 ){
	                text = data.sites.length + ' search sites';
	            }

	            text += ' detected!';

	            return text;
	        }
   	    }, function ( fn, name ) {
	    	//register the helper for use in handlebars templates
	    	Handlebars.registerHelper( name, fn );
	    });

		return View;
	});

})();