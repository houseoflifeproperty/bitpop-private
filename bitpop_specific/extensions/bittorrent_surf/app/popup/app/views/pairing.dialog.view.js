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
			
            id: 'authorize-pairing',

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );


				// this.render();

				
				console.log('initialize pairing dialog view', arguments, this);
			
			},

			render: function () {
				//don't think this uses a template
				//this.$dialog.html( html );
			}
		});

		return View;
	});

})();