(function () {

	define([
		'require',
		'q',
		'config',
		'scraper',
        'download_urls',
        'sandbox_helpers',
		'btapp' //btapp exposes global Btapp.  also requires jquery, underscore, and backbone
	], function ( require ) {

        // Nesting the toJSON function for models && collections 
        // whose attributes contain nested models or collections...
        // This provides entirely serializable data that can be passed over a message
        _.extend( Backbone.Model.prototype, {
            toDeepJSON : function( options ){
                var ret = this.toJSON();

                _.each( ret, function( val, key ){
                    if ( val instanceof Backbone.Model || val instanceof Backbone.Collection )
                        ret[key] = val.toDeepJSON();
                });

                return ret;
            }
        });

        _.extend( Backbone.Collection.prototype, {
            toDeepJSON : function( options ){
                return this.map(function(model){
                    return model.toDeepJSON(options);
                });
            }
        });


		var my = {},
            _bt = require('sandbox_helpers'),
            download_urls = require('download_urls'),
            config = require('config'),
			inited = false, //only init once
			app = null, //set in module init.  holds TorqueApp instance
            extension_settings = null, //set in module init.  holds Extension_Storage instance
			scraper = require('scraper');

		//Btapp instance constructor
        var TorqueApp = Btapp.extend({
            _connect_options: {
                // If we use the same mime type here as is made available by the basic plugin,
                // web apps would lose access to it...so we use our custom version. Chrome bug?
                // mime_type: 'application/x-bittorrent-torquechrome',
                // mime_type: ( _config.browser === 'safari' ? 
                mime_type: ( _config.browser === 'safari' ? 
                    'application/x-bittorrent-torque' :
                    'application/x-bittorrent-torquechrome' ),
                // Note:  this mime_type makes no difference in this worker, 
                //  because we aren't connecting with the plugin.  However, we send this 
                //  object to the plugin worker to tell it what product to connect to, 
                //  and the plugin worker needs the mime type there.

                // // Wanna pair to a local client?  why not try thse options instead?
                // product: 'uTorrent',
                pairing_type: 'native',
                product: 'Torque',
                plugin: false
            },

            observer: null, //set in module init
            
            _scraper: null, //set in instance init

            initialize: function () {
                Btapp.prototype.initialize.apply( this, arguments );

                console.error('init torque app', _config, config );

                //debounce the reconnect calls
                this.reconnect = ( function(){
                    var _this = this,
                        debounced_reconnect = _.debounce( 
                        //the function
                        function(){
                            //check if client is installed ( user could have uninstalled it )
                            //check if the client is running and start it up if it isn't
                            console.log('inside debounced reconnect');
                            if ( _this.is_connected ) {
                                _this.is_connected = false;
                                _this.disconnect();
                            }
                            
                            //_bt.track('torque', 'connection', 'reconnect', null );
                            _this.connect_with_plugin();
                            // _this.connect( _this._connect_options );
                        },
                        //bounce time
                        1000,
                        //immediate
                        true
                    );

                    return function(){
                        console.log('calling debounced reconnect');
                        debounced_reconnect();
                    }
                }).call( this );


                //check_seeding_completed was fired on the sync event,
                //which happens OFTEN, so throttle it down to something reasonable.
                this.check_seeding_completed = _.throttle( _.bind( this.check_seeding_completed, this ), 3000 );

                this.bind_events();
                this.bind_messages();

                //init the scraper
                this._scraper = scraper.init( this );

                //assures connection.
                // example case:  user turns on extension, and uTorrent is running in the background.
                // windows box pops up ( do you want to allow torque access to your computer? )
                // hit no:  if no other product is running, then btapp rechecks again and reinitializes client, no need for user interaction.
                // if there is another product running ( like uTorrent, etc... ), then check_version_success is called and clears the timeout that continually checks for torque
                // so, we want to force a reconnect after a certain time if this condition has occurred.
                this.assure_connect_timeout = setTimeout( _.bind( this.assure_connect, this ), this.assure_connect_time );

            },

            bind_events: function () {
                var _this = this;

                // this.on( 'all', console.log, console );
                this.live('os', _.bind( this.on_os_ready, this ) );

                this.on( 'pairing:authorize', this.on_pairing_authorize, this );
                this.on( 'client:connected', this.on_client_connected, this);

                //torrent collection ready.  bind listeners on the list
                this.on( 'add:torrent', this.on_torrents, this);

                //single torrent updating
                this.live('torrent *', function( torrent ){
                    torrent.live('properties', function(properties){
                        //console.log('properties live');
                        properties.on('change', _.bind( _this.on_torrent_properties_change, _this, torrent.id ) );
                        properties.on('change:completed_on', function(){
                            torrent.trigger('complete', torrent);
                        });
                    });
                });

                //settings are alive
                this.live('settings', function ( settings ) {
                    settings.on('change', _this.on_load_torque_settings, _this );
                });

                //check seeding completed and assure connect
                this.on('client:query', this.before_sync, this);
                this.on( 'sync', this.on_sync, this );
                //this.on( 'sync', this.check_seeding_completed, this );

            },
            
            bind_messages: function () {
                //for handshake with plugin app
                this.observer.on('alive', _.bind( this.on_plugin_worker_alive, this ) );
                this.observer.on('connected', _.bind( this.on_plugin_worker_connected, this ) );
                this.observer.on('torrents:load', _.bind( this.on_load_torrents, this ) );
                this.observer.on('torrent:add_url', _.bind( this.on_action_add_by_url, this ) );
                this.observer.on('torrent:remove', _.bind( this.on_action_remove, this ) );
                this.observer.on('torrent:open', _.bind( this.on_open_folder, this ) );
                this.observer.on('torrent:pause', _.bind( this.on_action_pause, this ) );
                this.observer.on('torrent:start', _.bind( this.on_action_start, this ) );
                this.observer.on('settings:load', _.bind( this.on_load_torque_settings, this ) );
                this.observer.on('settings:set_dl_dir', _.bind( this.on_select_download_dir, this ) );
                //other settings
                extension_settings.on('change:associate', _.bind( this.on_change_associate, this ) );
                //webui open
                this.observer.on('webui:open', _.bind( this.on_open_webui, this ) );
            },


            //last sync checks that the client has not hung
            last_sync_request:      0,
            unresponsive_time:      10000,  // value in milliseconds: max of 20 seconds between sync to determine if client has hung
            hung_time:              60000, //value in milliseconds to determine if client is unresponsive
            check_sync_timeout:     null, //store timeout here to clear and stuff.
            assure_connect_timeout: null, //store timeout for making sure the client has connected here.
            assure_connect_time:    15000,  //time for assure connect timeout
            is_connected:           false, //set to true when client:connected event fires.  used to autodisconnect/reconnect if user says no to installing torque

            on_sync: function () {
                this.check_seeding_completed();
                this.last_sync_request = 0;
            },

            before_sync: function( url, args ){
                this.last_sync_request = _bt.getTime();
            },

            on_client_connected: function ( port, key ) {
                console.log( 'client has connected', port, key );

                this.is_connected = true;

                this.continuously_check_sync();
            },

            //time elapsed is the time since last sync request
            //TODO - bench this
            //this will hit if a client has crashed ( unresponsive_time )
            // OR if client has hung ( hung_time )
            on_client_unresponsive: function( time_elapsed ){
                console.error('CLIENT IS UNRESPONSIVE', time_elapsed);

                //_bt.track('torque', 'connection', 'unresponsive', time_elapsed );

                //reconnect (auto checks for client installation and starts it up)
                this.reconnect();

                if( this.last_sync_request > 0 && time_elapsed > this.hung_time ){
                    //client has hung
                    this.on_client_hung( time_elapsed );
                    //this.trigger('client:hung', time_elapsed );
                }
            },

            //client has hung ( not crashed ).  bench the point, and show users dialog on how to restart the client
            on_client_hung: function( time_elapsed ){
                console.error('CLIENT HAS HUNG', time_elapsed);

                //_bt.track('torque', 'connection', 'hung', time_elapsed );

            },

            continuously_check_sync: function(){
                clearTimeout( this.check_sync_timeout );

                var now = _bt.getTime();

                if( this.last_sync_request > 0 && now - this.last_sync_request > this.unresponsive_time ){
                    //client has hung
                    this.on_client_unresponsive( now - this.last_sync_request );
                    //this.trigger('client:unresponsive', now - this.last_sync_request );
                }

                //call yourself
                this.check_sync_timeout = setTimeout( _.bind( this.continuously_check_sync, this ), this.unresponsive_time );
            },

            assure_connect: function(){
                clearTimeout( this.assure_connect_timeout );

                if( !this.is_connected ) {
                    console.error('assure_connect, not connected, reconnecting');

                    this.reconnect();

                    this.assure_connect_timeout = setTimeout( _.bind( this.assure_connect, this ), this.assure_connect_time );

                    return;
                }

                console.error('assure_connect, client has connected');
            },

            //ASSOCIATION BASED LOGIC
            // Right now we can only 'steal' the file association based on whether the user has given us permission
            // or not
            on_os_ready: function ( os ) {
                this.on_change_associate( extension_settings.get('associate') );
            },

            on_change_associate: function ( associate ) {
                var os = this.get('os');

                if ( associate && os && os.set_association ) {
                    os.set_association();
                }
                // console.error('ASSOCIATION CHANGED', arguments, os );
            },

            //END ASSOCIATION BASED LOGIC

            //OPEN WEBUI
            on_open_webui: function () {
                console.error('GOT MESSAGE TO OPEN WEBUI', this.get('settings').toJSON(), this );

                //don't open if client not connected
                // find a better way of getting the local port number
                // this is only temporary
                if ( this.client && this.client.url ) {

                    var settings = this.get('settings'),
                        u = settings.get('webui.username'),
                        p = settings.get('webui.password'),
                        port = settings.get('bind_port'),
                        url = 'http://'+u+':'+p+'@'+'127.0.0.1:'+port+'/gui',
                        open_webui = function () {
                            _sandbox.tabs.open( url, false, true );
                        };


                    //enable webui if not previously enabled
                    if ( !settings.get('webui.enable') ) {
                        settings.save({ 'webui.enable': 1 }).done( open_webui );
                    } else {
                        open_webui();
                    }

                    //get the main marts of the url we need
                    // var url = this.client.url.split('/').slice( 0, 3 ),
                    //add in the url credentials
                    // url[2] = u+':'+p+'@' + url[2];
                    // //add webui endpoint
                    // url.push('gui');
                    //open new tab to address and make it active
                    // _sandbox.tabs.open( url.join('/'), false, true );
                    // //opens a tab, current says open it in the currently open tab,
                    // //false for a new tab
                    // //active says make newly opened tab active if not current
                    // open = function ( url, current, active ) {
                }
            },


            //runs when add:torrents is ready, thus the instance has access to torque's torrents
            on_torrents: function ( torrent_list ) {
                //console.log('add:torrent', torrent_list, torrent_list.toDeepJSON(), this );
                console.log('add:torrent', 'TORRENTS READY IN APP.JS', torrent_list, torrent_list.toDeepJSON() );

                //bind listeners to torrent list
                torrent_list.on('add', this.on_torrent_added, this);
                //torrent_list.on('change', this.on_torrent_change, this);
                torrent_list.on('complete', this.on_torrent_complete, this);
                torrent_list.on('remove', this.on_torrent_removed, this);

                //Bt.msg.send( Bt.events.TORRENTS_READY, null );
                _.defer(_.bind( function(){
                    // torrent_list.each( function( torrent ) {
                    //     console.warn('EACH TORRENT', torrent);
                    // });
                    this.on_load_torrents();
                    //Bt.msg.send( Bt.events.TORRENTS_READY, torrent_list.toDeepJSON() );
                }, this) );
            },


            on_load_torrents: function () {
                var torrents = this.get('torrent'),
                    data = ( torrents ? torrents.toDeepJSON() : [] );

                this.observer.trigger('torrents:ready', data );
            },

            on_open_folder: function( torrent_id ){
                var torrent = this.get('torrent').get( torrent_id );
                if( torrent ){
                    torrent.open_containing();
                }
            },

            on_select_download_dir: function () {  
                var _this = this;

                _bt.track('torque', 'settings', 'change_download_directory' );

                this.browseforfolder( function ( folder ) {
                    _bt.track('torque', 'settings', 'download_directory_changed', null );
                    //Bt.msg.send(Bt.events.SET_SETTING, { key: 'dir_active_download', value: folder, trigger: true })
                    //that.set_torque_settings({ 'dir_active_download': folder, 'dir_active_download_flag': true })
                    _this.get('settings').save({ 'dir_active_download': folder, 'dir_active_download_flag': true })
                });
            },

            on_load_torque_settings: function(  ){
                var settings = this.get('settings');
                if( !settings ) {
                    //console.error('load torque settings.  NOT READY', JSON.stringify( data, null, 4 ) );
                    return _.delay( _.bind( this.on_load_torque_settings, this ), 250 );
                }
                //console.error('READY!  load torque settings.', JSON.stringify( settings, null, 4 ) );
                this.observer.trigger('settings:changed', settings.toJSON() );
            },

            on_action_add_by_url: function ( url, name ) {
                var add = this.get('add');

                download_urls.add( url, true );

                if ( add && _.isFunction( add.torrent ) ) {

                    // If it's a magnet link save it's link text
                    // as a temporal name while the magnet link
                    // is being resolved
                    if ( name && url.indexOf('magnet:') === 0 ) {
                        // Remove dn attribute if it's already there
                        url = url.replace(/dn=[^&]+&?/i, '')

                        url += (url.indexOf('?') < 0 ? '?' : '&')
                        url += 'dn=' + encodeURIComponent(name)
                    }

                    console.warn('adding url', url)

                    add.torrent({
                        url: url
                    }).then( _.bind( function ( status ) {
                        if( status !== 'success' ){
                            console.error('ADD FAIL', status, url);
                            this.observer.trigger( 'torrent:add_fail', url );
                            _bt.track('torque', 'torrent', 'add_fail', 1 ); //1 to denote add.torrent function existed, but torrent couldn't be added
                            
                        } else {
                            //console.error('TORRENT ADD BY URL SUCCESS' );
                            // _bt.track('torque', 'torrent', 'add', null );
                            _bt.track('download', 'started', null, null);
                        }
                    }, this ) );

                } else {
                    console.error('ADD TORRENT FAILED', add, this );

                    _bt.track('torque', 'torrent', 'add_fail', 0 ); //0 to denote add.torrent function didn't exist
                }
            },

            on_action_remove: function( id, delete_data ){
                var torrent = this.get('torrent').get( id );

                console.error('on_action_remove torrent', id, delete_data );

                if( torrent && delete_data ){
                    
                    //remove ( 3 ) deletes everything.
                    torrent.remove( 3 );
                    console.error('torrent + DATA removed', torrent, id, this.get('torrent') );
                    _bt.track('torque', 'torrent', 'remove', 3 ); //3 to denote torrent existed to remove, and removed data

                } else if ( torrent ) {
                    torrent.remove()
                    console.error('torrent removed', torrent, id, this.get('torrent') );
                    _bt.track('torque', 'torrent', 'remove', 1 ); //1 to denote torrent existed to remove

                }else{
                    console.error('no torrent to remove', id, this.get('torrent') );
                    _bt.track('torque', 'torrent', 'remove', 0 ); //0 to denote torrent didn't exist to remove
                }
            },

            on_action_pause: function( id ){
                var torrent = this.get('torrent').get( id );
                if( torrent ){
                    torrent.pause()
                    console.error('torrent paused', torrent, id, this.get('torrent') );
                    _bt.track('torque', 'torrent', 'pause', 1 ); //1 to denote torrent existed to pause
                }else{
                    console.error('no torrent to pause', id, this.get('torrent') );
                    _bt.track('torque', 'torrent', 'pause', 0 ); //0 to denote torrent didn't exist to pause
                }
            },

            on_action_start: function( id ){
                var torrent = this.get('torrent').get( id );
                if( torrent ){
                    torrent.unpause()
                    console.error('torrent unpaused', torrent, id, this.get('torrent') );
                    _bt.track('torque', 'torrent', 'start', 1 ); //1 to denote torrent existed to start
                }else{
                    console.error('no torrent to unpause/start', id, this.get('torrent') );
                    _bt.track('torque', 'torrent', 'start', 0 ); //0 to denote torrent didn't exist to start
                }
            },

            on_torrent_added: function ( torrent, collection, i ) {
                //console.error('on_add_torrent', arguments);                
                var torrent_data = torrent.toDeepJSON(),
                    entry = download_urls.get( torrent_data.properties.uri ),
                    user_added = ( !!entry );
                    //user_added = ( entry && entry !== torrent_data.id.toUpperCase() );

                //     entry = Bt.download_urls.get( torrent_data.properties.uri ),
                //     user_added = ( entry && entry !== torrent_data.id.toLowerCase() );

                if ( entry ) {
                    if ( user_added ) {
                        //console.log('entry and user_added');
                        download_urls.add( torrent_data.properties.uri, torrent_data.id );
                    }
                } else {
                    console.log('no entry');
                    download_urls.add( torrent_data.properties.uri, torrent_data.id );
                }

                console.log('torrent added', torrent.get('id'), user_added, entry );

                this.observer.trigger( 'torrent:added', torrent_data, user_added );

                //Bt.msg.send( Bt.events.TORRENT_ADDED, torrent_data, 'ext' );
            },
            
            on_torrent_complete: function ( torrent ) {
                //console.error('on_torrent_complete', arguments);
                if( torrent.get('properties') && torrent.get('properties').get('completed_on') ) {
                    //Bt.msg.send( Bt.events.TORRENT_COMPLETED, { id: torrent.id } );  //change this to use a { id: torrent.id }
                    this.observer.trigger('torrent:completed', torrent.toDeepJSON() );
                    // _bt.track('torque', 'torrent', 'complete', null );
                    _bt.track('download', 'complete', null, null );
                }
            },

            on_torrent_removed: function ( torrent, collection, i ) {
                console.error('on_torrent_removed', arguments);
                download_urls.remove_by_hash( torrent.id );

                this.observer.trigger('torrent:removed', torrent.toDeepJSON() );
            },

            //only send changed values to popup
            on_torrent_properties_change: function( torrent_id, model, changed ){
                var to_send = {};
                for( var k in changed.changes ){
                    to_send[ k ] = model.get( k );
                }
                //console.log('on_properties_change', torrent_id, model, changed, JSON.stringify( to_send, null, 4 ));

                //this.check_seeding_completed( torrent_id );

                this.observer.trigger('torrent:properties', torrent_id, to_send);

                // Bt.msg.send( Bt.events.UPDATE_TORRENT_PROPERTIES, {
                //     id: torrent_id,
                //     changes: to_send
                // }, 'popup');
            },

            //for the seed timer setting in the settings dialog
            check_seeding_completed: function () {
                var torrents = this.get('torrent');

                //console.error( 'check_seeding_completed', torrents, this );

                if ( !torrents ) { return false; }

                torrents.each( this.torrent_check_seeding_completed, this );

            },

            //for each torrent's seed timer setting in the settings dialog
            torrent_check_seeding_completed: function ( torrent ) {
                var current_time, max_ratio, max_time, should_stop,
                    settings =      extension_settings.get(),
                    properties =    torrent.get('properties');

                // Only check if completed and status is active (downloading or seeding)
                //      status: http://www.utorrent.com/community/developers/webapi
                //      if status & 1 => not started => stopped.
                if ( properties.get('completed_on') > 0 && ( properties.get('status') & 1 ) ) {
                    should_stop = false;
                    //console.log('completed && running', torrent.id, properties.get('name'), properties.get('status'), !(properties.get('status') & 1),  torrent.get('properties').toJSON() );

                    if ( settings.seed_type === 'time' ) { //seed timer is time
                        current_time =  _bt.getTimestamp();
                        // If more than 6 hours seed forever
                        max_time = ( settings.seed_time > ( 360 ) ? -Infinity : current_time - ( settings.seed_time * 60 ) ); // Settings saved in minutes
                        should_stop = ( properties.get('completed_on') < max_time );
                    } else { //percentage
                        max_ratio = settings.seed_percentage / 100;
                        should_stop = ( properties.get('ratio') / 1000 >= max_ratio );
                    }

                    if ( should_stop ) {
                        //console.error('SHOULD STOP', torrent.id, torrent );
                        torrent.stop();
                    } else {
                        //console.log('SHOULD NOT YET STOP', torrent.id, properties.get('name'), settings.seed_type, properties.get('completed_on'), max_time, max_ratio, properties.get('ratio') / 1000 );
                        // // on_properties_change: function( torrent_id, model, changed ){
                        //  passing in the model as null because I am not passing in any changes, 
                        //  so model doesn't get accessed
                        this.on_torrent_properties_change( torrent.id, null, { changes: {} } );
                        //console.log('completed triggering change on properties', torrent.id);
                    }
                }                

                //console.log('torrent check seeding completed', torrent.id, properties.get('status'), !(properties.get('status') & 1),  torrent.get('properties').toJSON() );
            },

            on_pairing_authorize: function () {
                console.log('torque sandbox pairing authorize', arguments);
            },

            //publish event to priveleged btapp worker to start up with the plugin
            connect_with_plugin: function () {
                //make sure plugin worker is alive
                this._alive = false;
                this.shake_hands();
            },
            //_alive for knowing when plugin worker is alive
            _alive: false,
            //handshake with plugin app.
            shake_hands: function () {
                if ( !this._alive ) {
                    console.log('shake hands');
                    this.observer.trigger('shake');
                    _.delay( _.bind( this.shake_hands, this ), 200 );                        
                } else {
                    console.log('torque apps shook hands successfully.');
                }
            },

            on_plugin_worker_alive: function () {
                console.log('alive');
                this._alive = true;
                //clone the options to connect with in the priveleged app worker
                var connect_options = _bt.clone( this._connect_options );
                //tell priveleged app worker to use the plugin
                connect_options.plugin = true;
                delete connect_options.pairing_type;
                //send connect options to priveleged app worker.
                this.observer.trigger('connect', connect_options );
            },

            on_plugin_worker_connected: function ( key ) {
                console.log( 'on_plugin_worker_connected', key, arguments );
                jQuery.jStorage.set( this._connect_options.product + '_pairing_key', key);
                this.connect( this._connect_options );
            }

        });


		//Module Private Methods
		var initialize = function () {
			if ( !inited ) {
				inited = true;
                //set a callback for the settings reset event
                var on_settings_reset = function () {
                    console.error('settings reset in torque.app', arguments );

                    //init the download urls in case it hasn't been inited yet
                    download_urls.init();
                    //setup app's observer
                    TorqueApp.prototype.observer = _sandbox.observer.load('app');
                    //construct the instance
                    app = new TorqueApp();

                    //init the scraper, and give it the instance

                    //make the plugin app start up torque and that jazz
                    app.connect_with_plugin();

                    //unbind this cause i only want it to happen once
                    extension_settings.off( 'reset', on_settings_reset );                 
                };
                //load the extension settings instance
                extension_settings = _sandbox.storage.load('settings', {
                    wait: 300,
                    defaults: config.app.settings_defaults
                }).on( 'reset', on_settings_reset );

			}

			return app;
		};

		//Public Methods
		_.extend( my, {
			init: initialize
		});

		return my;
	});

})();
