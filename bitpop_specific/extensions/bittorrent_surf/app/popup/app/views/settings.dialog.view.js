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
			
            id: 'settings',

            model: null, //set in init

            observer: null, //set in init

            events: {
            	'click .js-select-download-dir': 'set_download_directory',
            	'click #settings .cancel': 'cancel',
            	'change #settings input': 'on_settings_changed'
            },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );

                this.model = this.app.torque_settings;

                this.observer = _sandbox.observer.load('app');

                this.bind_events();

                this.render();

				console.log('initialize settings dialog view', arguments, this, this.app.settings.get() );
			
			},

			bind_events: function () {
				//this.model.on( 'change', _.bind( this.render, this) );

		        this.app.settings.on('change:seed_percentage', _.bind( this.seed_percentage_changed, this) );
		        this.app.settings.on('change:seed_time', _.bind( this.seed_time_changed, this ) );
		        this.app.settings.on('change:seed_type', _.bind( this.seed_type_changed, this) );
		        this.app.settings.on('change:associate', _.bind( this.associate_changed, this) );

		        this.model.on('change:download_directory', this.on_download_directory_changed, this);

			},

			set_download_directory: function () {
				this.observer.trigger('settings:set_dl_dir');
			},

			on_settings_changed: function ( e, triggered ) {

		        var me = $(e.currentTarget);
		        var value = me.val();

		        console.log('settings_changed', me.attr('id'), triggered);

		        switch(me.attr('id'))
		        {
		            case 'seed_time':
		                $('#seed_time_text').text( get_seed_time_text( value ) );
		                break

		            case 'seed_percentage':
		                $('#seed_percentage_text').text(value + '%')
		                break

		            case 'seed_type_percentage':
		            case 'seed_type_time':
		                $('.seed-option').addClass('hidden');
		                $('#' + me.data('options')).removeClass('hidden');
		                break

		            case 'set_association_setting' :
		            	value = !!me.attr('checked');
		            	break;
		        }

				if ( !triggered ) {
					console.warn('NOT FROM SETTING_CHANGED, SENDING');
            		//Bt.msg.send(Bt.events.SET_SETTING, { key: me.attr('name'), value: value })
					this.app.settings.set( me.attr('name'), value ).save();
				}
			},

		    on_download_directory_changed: function( torque_settings, val, changes ){
		        var val = this.model.get('download_directory');
		        console.log('dialogs.on_download_directory_changed', val);
		        this.setting_changed('dir_active_download', val);
		    },

		    seed_percentage_changed:function(){
		    	var val = this.app.settings.get('seed_percentage');
		        this.setting_changed('seed_percentage', val)
		    },

		    seed_time_changed: function () {
		    	var val = this.app.settings.get('seed_time');
		        this.setting_changed('seed_time', val)
		    },

		    seed_type_changed: function () {
		    	var val = this.app.settings.get('seed_type');
		        this.setting_changed('seed_type_' + val, true)
                $('.seed-option').addClass('hidden');
                $('#seed_' + val +'_options' ).removeClass('hidden');
		    },

		    associate_changed: function () {
		    	var val = this.app.settings.get('associate');
		    	this.setting_changed( 'set_association_setting', val );
		    },

		    setting_changed: function( key, val ){
		        var el = $('#' + key);

		    	console.log('setting_changed', key, val, el );

		        if(el.attr('type') === 'checkbox' || el.attr('type') === 'radio') {
		            el.prop('checked', val).trigger('change', true)
		        } else {
		            el.val( val ).trigger('change', true);
		        }

		        //this.app.checkCanSearch()        
		    },

			render: function () {
				//var html = Handlebars.templates.settings_dialog( { torque: this.model.toJSON(), surf: this.app.settings.get() } );
				var html = Handlebars.templates.settings_dialog();
				this.$dialog.html( html );

				this.render_settings();

				console.error('render application settings', this.app.settings.get() );
			},

			render_settings: function () {
                //defer triggered changes until event handlers have been set up
                _.defer( _.bind( function () {
                	//temp to auto open while working on it.
	                //this.app.views.dialogs.open( 'settings' );

	                //trigger change on anything that needs to be rendered from settings
					this.model.trigger('change:download_directory');
					this.app.settings.trigger('change:seed_type');
					this.app.settings.trigger('change:seed_percentage');
					this.app.settings.trigger('change:seed_time');
					this.app.settings.trigger('change:associate');
				}, this) );
			}
		});

		var get_seed_time_text = function ( time_in_minutes ) {
	            var value = time_in_minutes,
	            	result = '',
	            	minutes = (value % 60),
	            	hours = Math.floor(value / 60);

	            if ( hours > 0 ) {
	                result += hours + ' hour' + (hours > 1 ? 's' : '');
	            }
	            if ( minutes > 0 ) {
	                result = result.replace(/\shours?/, 'h ');
	                result += minutes + ' minutes';
	            }
	            if ( value > 360 ) {
	                result = 'Forever';
	            }
	            if ( minutes === 0 && hours === 0 ) {
	                result = 'None';
	            }
	            return result;
			};

		// //HANDLEBARS HELPERS
  //       _.each({

  //       }, function ( fn, name ) {
  //           //register the helper for use in handlebars templates
  //           Handlebars.registerHelper( name, fn );
  //       });

		return View;
	});

})();