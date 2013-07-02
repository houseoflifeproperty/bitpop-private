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
			
            id: 'engines',

            events: {
            	'click #engines .primary': 	'on_save',
            	'click #engines .cancel': 	'cancel' //cancel is on dialog view prototype
            },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );


				//this.render();

				
				console.log('initialize engines dialog view', arguments, this, this.app.settings.get() );
			
			},

			on_save: function ( e ) {
				var engine = this.$dialog.find('input:radio:checked').val();
				console.error('save engines select', engine);
		        this.collection.enable( engine );

		        this.close();
			},

			// on_cancel: function ( e ) {
			// 	console.error('cancel engines select');
			// 	this.cancel();
			// },

			render: function () {
				var html = Handlebars.templates.engines_dialog();
				this.$dialog.html( html );
				//pre-select the default engine
				this.$dialog.find('input[value="'+this.app.settings.get('default_engine')+'"]').attr({ checked: 'checked' });
			}
		});

		return View;
	});

})();