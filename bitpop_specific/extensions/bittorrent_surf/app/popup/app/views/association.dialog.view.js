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
			
            id: 'association',

            events: {
            	'click #association .primary': 	'on_save'
            },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );
				
				console.log('initialize association dialog view', arguments, this, this.app.settings.get() );
			
			},

			// open: function () {
   //              Dialog.prototype.open.apply( this, arguments );
   //              this.render();
			// },

			on_save: function ( e ) {
				var associate = this.$dialog.find('#set_association').is(':checked'),
					remember  = this.$dialog.find('#remember_association').is(':checked');

				// e.preventDefault();
				// e.stopPropagation();

		  		console.error('on_save association', associate, remember );

		  		//remove the association notification
		  		this.app.collections.notifications.observer.trigger( 'remove', 'association' );
		  		//save the settings
		  		this.app.settings.set({
		  			associate: associate,
		  			remember_association: remember
		  		}).save();
		        
		        this.close();
			},

			render: function () {
				var html = Handlebars.templates.association_dialog( this.app.settings.get() );
				this.$dialog.html( html );
				//pre-select the default engine
				//this.$dialog.find('input[value="'+this.app.settings.get('default_engine')+'"]').attr({ checked: 'checked' });
			}
		});


        //HANDLEBARS HELPERS
        _.each({
        	//takes value and adds 'checked="checked"' if value is true or null, nothing if false
            set_checked: function ( val ) {
            	return ( val || _.isNull( val ) ? 'checked="checked' : '' );
            }
        }, function ( fn, name ) {
            //register the helper for use in handlebars templates
            Handlebars.registerHelper( name, fn );
        });

		return View;
	});

})();