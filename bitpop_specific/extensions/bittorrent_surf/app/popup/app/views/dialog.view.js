(function(){

	define([
		'require',
		'backbone',
		'sandbox_helpers'
	], function (require) {
		//required components
		var _bt = require('sandbox_helpers');

		//app constructor
		var View = Backbone.View.extend({
			
			el: '#dialogs',

			//dialog element to hold rendered html
			dialog: null,
			$dialog: null,

			id: null, //set by extended view

			initialize: function ( opts ) {
				this.dialogs = opts.parent.parent;
				this.app = opts.parent.app;

				this.create();

				//might want to hold off on this one.  wait to render on open...
				//will leave for now while I set all of this up.
				// if ( this.render ) {
				// 	this.render();
				// }

				//console.log('initialize dialog view', arguments, this);
			},

			close: function () {
				//console.log('close dialog', this.id );
				//this.$dialog.hide();
				this.dialogs.close();
			},

			cancel: function () {
				console.error('CANCEL', this, this.id );
		        _bt.track( 'dialog', 'cancel', this.id, null );

		        this.close();
			},

			open: function () {
				console.error('dialog instance open');

				if ( this.render ) {
					this.render();
				}

				_bt.track( 'dialog', 'open', this.id );

				//if ( this.$dialog ) {
				this.$dialog.show();
				// } else {
				// 	throw "dialog has not yet been rendered: " + this.id;
				// }

			},

			create: function () {
				//jquery friendly el for dialog
				this.$dialog = $('<div />', { id: this.id }).addClass('dialog');
				//vanilla dom el
				this.dialog = this.$dialog[ 0 ];
				//drop the dialog in the dialogs container
				this.$dialog.appendTo( this.$el );
			}

		});

		return View;
	});

})();