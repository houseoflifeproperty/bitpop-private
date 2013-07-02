(function(){

	define([
		'require',
		'backbone',
		'engines.dialog.view',
		'association.dialog.view',
		'add_site.dialog.view',
        'notifications.dialog.view',
        'settings.dialog.view',
        'add_sites.dialog.view',
        'pairing.dialog.view',
        'remote_asset.dialog.view',
        'site_manager.dialog.view'
	], function (require) {
		//required components
		var Engines_View =          require('engines.dialog.view'),
            Add_Site_View =         require('add_site.dialog.view'),
            Association_View =      require('association.dialog.view'),
            Site_Manager_View =     require('site_manager.dialog.view'),
            Notifications_View =    require('notifications.dialog.view'),
            Settings_View =         require('settings.dialog.view'),
            Add_Sites_View =        require('add_sites.dialog.view'),
            Remote_Asset_View =     require('remote_asset.dialog.view'),
            Pairing_View =          require('pairing.dialog.view');

		//app constructor
		var Dialogs = Backbone.Model.extend({
			
			initialize: function ( data, opts ) {
				this.app = opts.app;
				this.parent = opts.parent; //reference to dialogs view

				this.setup();

				console.log('initialize dialogs model', arguments);
			
			},

			//sets up and tracks the different dialog views
			setup: function () {
				this.set({
					engines:            new Engines_View({ parent: this, collection: this.app.collections.sites }),
					association:        new Association_View({ parent: this }),
					add_site:           new Add_Site_View({ parent: this, collection: this.app.collections.search }),
                    site_manager:       new Site_Manager_View({ parent: this, collection: this.app.collections.sites }),
                    settings:           new Settings_View({ parent: this }),
                    add_sites:          new Add_Sites_View({ parent: this, collection: this.app.collections.sites }),
                    pairing:            new Pairing_View({ parent: this }),
                    remote_asset:       new Remote_Asset_View({ parent: this }),
                    notifications:      new Notifications_View({ parent: this, collection: this.app.collections.notifications })
				});
			},

			setup_views: function () {

			},

			bind_events: function () {

			},

			bind_messages: function () {

			}
		});

		return Dialogs;
	});

})();