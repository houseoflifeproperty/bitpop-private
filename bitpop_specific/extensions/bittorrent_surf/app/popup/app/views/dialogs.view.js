(function(){

	define([
		'require',
		'backbone',
		'dialogs.model'
	], function (require) {
		//required components
		var Dialogs_Model = require('dialogs.model');

		//app constructor
		var View = Backbone.View.extend({
			
			model: null, //set in init

			current: false,
		    //used to track if dialogs are being auto-shown in onboarding process
			is_onboarding: '',

			initialize: function ( opts ) {
				this.app = opts.app;

				//setup dialogs model, which loads all the views
				this.model = new Dialogs_Model( null, { app: this.app, parent: this });

				this.$main = $('.main');

				//this.render();

				console.log('initialize dialogs view');
			
			},

            //shortcut to return view from dialogs model
            get: function ( key ) {
                return this.model.get( key );
            },

			close: function () {
                console.log('dialogs close', this.is_onboarding, this.current );

                //if we are in the onboarding process, then notify application that a step has been completed
                if ( this.is_onboarding ) {
                    this.app.trigger('onboard:progress', this.is_onboarding );
                }

                //close the remote iframe if it is open
                if ( this.current === 'remote_asset' ) {
                    this.app.views.dialogs.model.get('remote_asset').unload();
                }

				//hide all dialogs and show main container
				this.$main.removeClass('dialog')
					.find('.dialog').hide();

				this.current = null;

		        this.app.trigger('dialog:close');
				this.app.trigger('render');
			},

			open: function ( name, data, id ) {
				//console.error(' DIALOGS VIEW OPEN', arguments, this.model.toJSON() );
				console.log(' DIALOGS VIEW OPEN', name );

				//clear focus
				// need to write these in
				// this.app.views.torrents.clear_focus();
				// this.app.views.sites.clear_focus();
				//close alerts
		        // this.app.views.alert.hide();


				// //close all other dialogs
				// _.each( this.model.toJSON(), function ( view, name ) {
				// 	//console.log(name, view);
				// 	view.close();
				// });

				//hide main container and all other dialogs
				this.$main.addClass('dialog')
					.find('.dialog').hide();

				this.current = name;

				//open this dialog
				this.get( name ).open( data, id );

				this.app.trigger('render');
			}

			// render: function () {
			// 	console.log('render dialogs view');
			// }
		});

		return View;
	});

})();