(function(){
	//collection is search.collection
	define([
		'require',
		'backbone',
		'dialog.view'
	], function (require) {
		//required components
		var Dialog = require('dialog.view');

		//app constructor
		var View = Dialog.extend({
			
            id: 'add_site',

            events: {
            	'click #add_site .cancel': 'cancel',
            	'click #add_site .primary': 'on_add_site',
            	'keypress #site-url': 'on_input_keypress'
            },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );


				// this.render();

				
				console.log('initialize add site dialog view', arguments, this);
			
			},

			on_input_keypress: function ( e ) {
				//console.error('input keypress', e.which);

				if ( e.which === 13 ) {
					this.$dialog.find('.primary').trigger('click');
				}
			},

			on_add_site: function ( e ) {
				e.preventDefault();

				var url = this.$dialog.find('#site-url').val();
				//console.error('on_add_site', url);

				if ( url ) {
					this.collection.attempt_add_site( url );
					this.close();
				}
			},

			render: function () {
				var html = Handlebars.templates.add_site_dialog();
				this.$dialog.html( html );
			}
		});

		return View;
	});

})();