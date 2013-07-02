(function(){
	define([
		'require',
        'q',
		'backbone',
		'templates',
		'app.view',
		'tip.view',
		'toolbar.view',
		'torrents.view',
		'torque_settings.model',
		'config',
		'dialogs.view',
        'sites.collection',
        'search.collection',
        'torrents.collection',
        'search.view',
        'sandbox_helpers',
        'notifications.collection'
	], function (require) {
		//required components
		var Q = require('q'),
			_bt = require('sandbox_helpers'),
			Backbone = require('backbone'),
            App_View = require('app.view'),
            Tip_View = require('tip.view'),
            Toolbar_View = require('toolbar.view'),
            Torrents_View = require('torrents.view'),
			Dialogs_View = require('dialogs.view'),
			Search_View = require('search.view'),
            Sites_Collection = require('sites.collection'),
            Torrents_Collection = require('torrents.collection'),
            Notifications_Collection = require('notifications.collection'),
            Search_Collection = require('search.collection'),
            Torque_Settings = require('torque_settings.model'),
			config = require('config'),
			//weird path issues to work out before deployment
			data_path = ( config.is_ff() ? '../../' : config.data_path );

		// data_path var is for remote_assets.  if this extension is loading code remotely, use that path
		if ( _config.source === 'remote' ) {
			data_path = _config.app.remote_src[ _config.env ] + _config.version + '/';
		}

		//app constructor
		var App = Backbone.Model.extend({
			
			views: {},
			collections: {},
			settings: null, //set in init.  sandbox extension_storage module
			torque_settings: null,

			observer: null, //set in init.  loads popup observer

			clipboard: null, //set in init.  loads clipboard observer.  trigger( 'copy', someText ) to copy.

			//app view tracks this because it is super useful
		    _metaKey_down: false,
		    _ctrlKey_down: false,
		    _shiftKey_down: false,

		    //used to set the order of dialogs user must complete on first run
		    first_run: {
		        'true':         -1,     //if the stored value is true, this starts the onboarding process
		        'surf:welcome': -1,
		        //'surf': -1, //just a test for getting all the commands working
		        //'surf:credits': 1666,    //  -1 is for.ev.er.  any positive number is the time in ms
		        'surf:engines': -1,     //  the value for the key is how long to display the dialog for
		    	'surf:associate': -1
		    },

		    commands: {
		        'surf': {
		            desc: 'Displays Surf Commands',
		            title: 'Surf Commands',
		            url: data_path + 'app/popup/remote_assets/commands/commands.html',
		            cls: 'commands'
		        },
		        // 'surf:help': {
		        //     desc: 'Displays Surf Help',
		        //     title: 'Surf Help',
		        //     url: 'http://maxgif.com',
		        //     cls: 'help'
		        // },
		        // 'surf:credits': {
		        //     desc: 'Displays Surf Credits',
		        //     title: 'Surf Credits',
		        //     url: data_path + 'app/popup/remote_assets/credits/credits.html',
		        //     cls: 'credits'
		        // },
		        'surf:welcome': {
		            desc: 'Displays Welcome Screen',
		            title: 'Welcome to BitTorrent Surf',
		            icon: data_path + 'app/img/bt0_icon_32.png',
		            // url: 'https://s3.amazonaws.com/btsurf/welcome/welcome.html',
		            url: data_path + 'app/popup/remote_assets/welcome/welcome.html',
		            //url: 'welcome/welcome.html',
		            cls: 'welcome'
		        },
		        // 'surf:notes': {
		        //     desc: 'Displays Surf Release Notes',
		        //     title: 'Surf Release Notes',
		        //     url: 'http://reuters.com',
		        //     cls: 'notes'
		        // },
		        // 'surf:eula': {
		        //     desc: 'Displays Surf Release Notes',
		        //     title: 'Surf Release Notes',
		        //     url: 'http://nasa.gov',
		        //     cls: 'eula'
		        // },
		        'surf:engines': {
		            desc: 'Change Default Search Engine'
		        },
		        'surf:associate': {
		            desc: 'Change .Torrent and Magnet Link Association.'
		        },		        
		        // 'surf:clear-sites': {
		        //     desc: 'Clears Surf Search Sites'
		        // },
		        // 'surf:clear-rss': {
		        //     desc: 'Clears RSS Profile'
		        // },
		        'surf:reset': {
		            desc: 'Resets Surf to Defaults'
		        },
		        //featured content query command
		        ///surf:BTFC-indie
		        'surf:BTFC-': {
		            desc: 'Advanced Query on BitTorrent Featured Content'
		        }
		    },


			initialize: function ( sandbox ) {

				//this.sandbox = sandbox;
				this.observer = _sandbox.observer.load('popup');
                //listen to clipboard observer
                this.clipboard = _sandbox.observer.load('clipboard');

                // this.throttled_render = _.throttle( _.bind( this.on_render, this ), 100 );
                this.throttled_render = this.on_render;

                this.bind_events();

				var first = this.setup_collections();
                first.done( _.bind( this.setup_views, this ) );
                first.done( _.bind( this.setup_settings_dependent_views, this ) );
				//this.setup_views();

				console.log('initialize popup app', typeof $, typeof _, this, arguments);
			
			},

            bind_events: function () {
		        this.on('command', this.do_command, this );
		        this.on('onboard:progress', this.on_onboard_progress, this );

		        //this.settings.on('change:first_run', this.on_first_run, this );

                this.on('render', this.throttled_render, this);          
            },

            $body: $('body'),

            on_render: function () {
                this.$body.trigger('resize');
            },

			setup_collections: function () {
                var dfd = Q.defer();

                //set settings to extension storage instance
                //resolve the promise when the data has come in
                //for anything else that relies on it
				this.settings = _sandbox.storage.load('settings', {
					wait: 300,
		            defaults: config.app.settings_defaults
		        }).on( 'reset', function () {
                    console.error('settings reset', arguments );
                    dfd.resolve();
                }).on('change:first_run', _.bind( this.on_first_run, this ) );

		        this.torque_settings = new Torque_Settings( {}, { app: this } );

		        this.collections = {
                    sites:          new Sites_Collection([], { app: this }),
                    notifications:  new Notifications_Collection([], { app: this }),
                    search: 		new Search_Collection([], { app: this }),
                    torrents: 		new Torrents_Collection([], { app: this })
		        };

                return dfd.promise;
			},

			setup_views: function () {
				_.extend( this.views, {
					app: 		new App_View({ app: this }),
					tip: 		new Tip_View({ app: this }),
					// dialogs: 	new Dialogs_View({ app: this }),
					toolbar: 	new Toolbar_View({ app: this, collection: this.collections.search }),
					search: 	new Search_View({ app: this, collection: this.collections.search }),
					torrents: 	new Torrents_View({ app: this, collection: this.collections.torrents })					
				});
				//trigger reset on search collection to populate dependent views
				this.collections.search.trigger('reset');

				// _.defer( _.bind( this.on_first_run, this ) );

                this.trigger('render');
			},

			setup_settings_dependent_views: function () {
				_.extend( this.views, {
					// app: 		new App_View({ app: this }),
					// tip: 		new Tip_View({ app: this }),
					dialogs: 	new Dialogs_View({ app: this })
					// toolbar: 	new Toolbar_View({ app: this, collection: this.collections.search }),
					// search: 	new Search_View({ app: this, collection: this.collections.search }),
					// torrents: 	new Torrents_View({ app: this, collection: this.collections.torrents })					
				});

				_.defer( _.bind( this.on_first_run, this ) );

				this.trigger('render');
			},

			//copy function to alias clipboard trigger 'copy'
			copy: function ( text ) {
				this.clipboard.trigger('copy', text);
			},

		    do_command_timeout: null,

		    //do_command: function ( command, onboarding ) {
		    do_command: function ( command, options ) {

		        //check for btfc-taxonomy query first
		        var btfc_query;
		        if ( command.indexOf('surf:BTFC-') === 0 ) {
		            btfc_query = command.replace('surf:BTFC-', '');
		            command = 'surf:BTFC-';
		        }

		        var opts = this.commands[ command ] || this.commands[ 'surf' ];
		        //if the command is not recognized, bring up that table of commands

		        if ( this.do_command_timeout ) {
		            clearTimeout( this.do_command_timeout );
		        }

		        console.log('do command', command, opts, this);


		        if ( opts && opts.url ) {
		            this.views.dialogs.get('remote_asset').load( opts );
		            this.views.dialogs.open('remote_asset');
		        } else {

		            switch ( command ) {

		                case 'surf:engines' :
		                    console.error('do surf:engines command!', command, opts, options );
		                    this.views.dialogs.open('engines');
		                    break;

		                case 'surf:reset' :
		                    _bt.track( 'search', 'history', 'clear', null );
		                    this.observer.trigger('reset');
		                    break;

		                case 'surf:BTFC-' :
		                    console.error('BTFC COMMAND', btfc_query );

		                    _bt.track('recommendation', 'genre_query', btfc_query, null )

		                    //args are: 1) query, 2) cached, 3) btfc_adv
		                    this.collections.search.search( btfc_query, false, true );
		                    // Bt.msg.send( Bt.events.SEARCH_SITES, {
		                    //     query: btfc_query,
		                    //     cached: false,
		                    //     //bittorrent featured content advanced search
		                    //     btfc_adv: true //sets up special search of only bittorrent featured content
		                    // }, 'ext');

		                    break;

		                case 'surf:associate' :
		                    this.views.dialogs.open('association');
		                	break;

		                default :
		                    console.error('something went wrong in do_command', command, opts, command.indexOf('surf:BTCF-'));
		            }
		        }

		        if ( options && options.hide && options.hide > -1 ) {
		            console.error('set up the timeout to hide the dialog');

		            this.do_command_timeout = setTimeout( _.bind( function(){
		                if ( this.views.dialogs.is_onboarding === command ) {
		                    this.views.dialogs.close();
		                }
		            }, this ), options.hide );
		        }
		    },

		    on_onboard_progress: function ( completed ) {
		        console.warn('on onboard progress', completed);
		        this.settings.set({ first_run: completed }).save();
		        //Bt.msg.send(Bt.events.SET_SETTING, { key: 'first_run', value: completed });
		    },

		    on_first_run: function () {
		    	var val = this.settings.get('first_run');

		        console.log('settings change:first_run', val );

		        var command = false,
		            order = this.first_run,
		            found = false;

		        //first_run now an object keyed by strings.  so, if we want to match a 
		        //boolean, convert it to a string, cause I'm all trip equals all the time
		        if ( typeof val === 'boolean' )
		            val = val.toString();

		        //loops through to find the current one, then one more time to get the next
		        for ( var cmd in order ) {
		            if ( ! found ) {
		                if ( cmd === val ) {
		                    found = true;
		                }
		            } else {
		                command = cmd;
		                break;
		            }
		        }

		        if ( command ) {
		            this.views.dialogs.is_onboarding = command;
		            this.do_command( command, {
		                onboarding: true,
		                hide: order[ command ]
		            });
		        } else {
		            if ( val !== 'false' ) {
		                this.views.dialogs.is_onboarding = false;
		                this.on_onboard_progress( false );
		            }
		        }

		    }
		});

		return App;
	});

})();