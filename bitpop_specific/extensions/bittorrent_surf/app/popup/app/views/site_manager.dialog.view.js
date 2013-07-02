(function(){

	define([
		'require',
		'backbone',
		'handlebars',
		'dialog.view',
		'sandbox_helpers'
	], function (require) {
		//required components
		var Dialog = require('dialog.view'),
			_bt = require('sandbox_helpers');

		//app constructor
		var View = Dialog.extend({
			
            id: 'site_manager',

            events: {
            	'change .switch_input': 'toggle_site',
            	'change [name="search_engine"]' : 'on_default_engine_change',
            	'click #site_manager .cancel': 'cancel'
            },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );

                this.bind_events();

				// this.render();

				
				console.log('initialize site manager dialog view');
			
			},

			bind_events: function () {
				//TODO:  only call render when dialog is open
				this.collection.on( 'reset', this.render, this );
				this.app.on( 'dialog:close', this.clear_focus, this );
			},

		    //sets a class of focused on site element associated with site id.  called from notifications on_action_click
		    focus: function( id ){
		        this.$dialog.find('[data-id="'+ id +'"]').closest('li').addClass('focused');
		    },

		    clear_focus: function(){
		        this.$dialog.find('.focused').removeClass('focused');
		    },

			toggle_site: function ( e, triggered ) {
				console.error('toggle site');

		        var me = $(e.currentTarget),
		            id = me.data('id');

		        //default engine is special
		        if ( id === 'search_default' ) {
		        	id = this.$dialog.find('[name="search_engine"]:radio:checked').val();
		        }

		        //toggle the fake switch
		        this.toggle_switch( me );

		        if( me.is(':checked') ){
		            this.collection.enable( id );
		            _bt.track( 'dialog', 'enable_site', this.dialogs.current, null );
		        } else {
		        	this.collection.disable( id );
		            _bt.track( 'dialog', 'disable_site', this.dialogs.current, null );
		        }

				console.error('toggle site', me.data('id') );
			},

			//toggles the fake switch on or off
			toggle_switch: function ( input ) {
				var fake = input.siblings('.switch');
				//toggle the class on checked status
				fake.toggleClass( 'checked', input.is(':checked') );
			},

		    //when the radio select is changed for the default engine
		    on_default_engine_change: function ( e, triggered ) {
		        var me = $( e.currentTarget ),
		            val = me.val();
		        
		        //remove checked on all engine radios
				this.$dialog.find('[name="search_engine"]').removeAttr('checked');		        
		        //me.prop('checked', true);
		        me.attr({ checked: 'checked' });

		        console.log( 'user clicked to change default engine', triggered, val );

		        if ( !triggered ) {
		        	//user interacted. turn the default engine on no matter what.
		        	console.error('not auto triggered.  send it', val);
		        	//save the engine in settings
		        	this.app.settings.set({ default_engine: val }).save();
		        	//and set the switch toggle to on ( don't care if it is already )
		        	//and to push down to core
		        	this.$dialog.find('#search_default').attr({ checked: 'checked' }).trigger('change', true);
		        } else {

		        }
		    },

		    //renders selected default engine radio from settings value
		    //and toggles the switch if a default engine was set aside when resetting the collection
			render_default_engine: function () {
				var settings = this.app.settings.get(), //get the settings
					default_engine = this.collection.default_engine, //get the default engine
					input = this.$dialog.find('#search_default');

				//correctly set the input to on or off
				default_engine ? input.attr({ checked: 'checked' }) : input.removeAttr('checked');
				//toggle the css switch correctly
				this.toggle_switch( input );
				//trigger change on radio select for the different engines to flip the switch the right way
				this.$dialog.find('[name="search_engine"][value="'+settings.default_engine+'"]').trigger('change', true);
				//console.error('render default engine', default_engine, this.$dialog.find('[name="search_engine"]') );
			},

			render: function () {
				console.error('sites view render');

				var html = Handlebars.templates.site_manager( { sites: this.collection.toJSON() } );
				this.$dialog.html( html );

				// Rebinds events.  Backbone method
				this.delegateEvents();

				this.render_default_engine();

				this.app.trigger('render');

				return this;
			}
		});


    	//HANDLEBARS HELPERS
	    _.each({
	        site_enabled: function ( site ) {
	            //console.error('site_enabled helper', site, this);
	            return ( this.enabled ? 'checked' : '');
	        },
	        get_site_name: function ( url ) {
	            console.log('get site name', url);
	            switch ( url ) {
	            	case 'archive' :
	            		return 'Internet Archive';
	            	case 'btfc' :
	            		return 'BitTorrent Featured Content'
	            }

	            return url.capitalize();
	        }
	    }, function ( fn, name ) {
	    	//register the helper for use in handlebars templates
	    	Handlebars.registerHelper( name, fn );
	    });


		return View;
	});

})();