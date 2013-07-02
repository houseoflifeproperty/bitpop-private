(function ( global ){

    define([
        'require',
        'q',
        'underscore',
        'jquery',
        'sandbox_helpers',
        'sjcl'
    ], function ( require ) {

        var my =                {},
            _ =                 require('underscore'),
            _bt =               require('sandbox_helpers'),
            $ =                 require('jquery'),
            sjcl =              require( 'sjcl' ),
            config =            _config,
            storage =           null, //set in init
            observer =          null, //set in init
            popup_observer =    null, //set in init
            gaq_observer =      null, //set in init
            inited =            false,

            stat_event_name =   'ToolbarLog',  //wanted to change this to "Surf" but think it will be easier on stats team to keep it the same

            timeout_time =      50,
            // checkin_time =      10, // # of seconds between daily checkin.
            // checkin_interval =  5, //# of seconds between send dau function, i.e. try to send the stat every hour, but only succeed once per day
            checkin_time =      86400, // # of seconds between daily checkin.
            checkin_interval =  3600, //# of seconds between send dau function, i.e. try to send the stat every hour, but only succeed once per day

            _gaq_alive =        false,

            base_stat =         null,
            TBS =               config.app.TBS,
            TBV =               config.app.TBV,
            TBN =               config.app.TBN; // 2 +  denotes surf

        //Private methods
        var initialize = function () {
                if ( !inited ) {
                    inited = true;

                    //load storage module
                    storage = _sandbox.storage.load('bench');
                    storage.on('reset', on_storage_loaded);


                    //start up core gaq pubsub
                    gaq_observer = _sandbox.observer.load('gaq');
                    //listen for it's alive
                    gaq_observer.on('alive', set_gaq_alive);
                    //fall back to 20 seconds for module to boot up before 
                    //assuming that core code hasn't updated yet and therefore
                    //need to go ahead and assume gaq is alive and should send the event
                    _.delay( set_gaq_alive, 20000 );
                    //shake hands with gaq core module to see if it is alive
                    gaq_shake();

                    //start up bench pubsub
                    observer = _sandbox.observer.load('bench');
                    //listen for track commands
                    observer.on('track', on_track);

                    //start up popup module pubsub
                    popup_observer = _sandbox.observer.load('popup');
                    popup_observer.on('open', on_popup_open);
                    popup_observer.on('close', on_popup_close);

                    console.log('INITING BENCH');

                }

                return my;
            },

            set_gaq_alive = function () {
                _gaq_alive = true;
            },

            gaq_shake = function () {
                if ( !_gaq_alive ) {
                    console.error('gaq not yet alive', _track_queue.length );
                    gaq_observer.trigger('shake');
                    return _.delay( gaq_shake, 200 );
                }
            },

            on_storage_loaded = function () {
                if ( !_gaq_alive ) {
                    console.error('gaq not yet alive');
                    return _.delay( on_storage_loaded, 200 );
                } else {
                    console.log("BENCH STORAGE RESET");
                    //get the stat or make a new one
                    base_stat = get_stat();
                    //start daily checkins
                    checkin();
                    //the flush the track queue if necessary
                    flush_track_queue();
                }
            },

            generateID = function() {

                    function get32bitRandomNumber() {
                            if ( window.crypto && window.crypto.getRandomValues ) {
                                    var arr = new Uint32Array( 1 );
                                    window.crypto.getRandomValues( arr );
                                    return arr[0];
                            }
                            return Math.floor( Math.random() * ( 
                                        Math.pow( 2, 32 ) - 1 ));
                    }

                    var n = window.navigator;
                    data = "";
                    data += n.appName;
                    data += n.appVersion;
                    data += n.platform;
                    data += n.userAgent;
                    data += n.language !== undefined ? n.language : n.browserLanguage;
                    data += n.product;
                    data += n.vendor;
                    var plugins = window.navigator.plugins;
                    for ( var i=0,l=plugins.length; i<l; i++ ) {
                            data += plugins[i].name + ":" + plugins[i].filename;
                    }
                    var mts = window.navigator.mimeTypes;
                    for ( var i=0,l=mts.length; i<l; i++ ) {
                            data += mts[i].description + ":" + mts[i].type;
                    }
                    data += new Date().getTime();
                    data += get32bitRandomNumber();
                    return sjcl.codec.hex.fromBits( sjcl.hash.sha256.hash( data ));
            },

            //for stacking up track calls when module hasn't 
            //finished starting but the application still wants to track stuff.
            _track_queue = [],

            //function to flush out the queue
            flush_track_queue = function () {
                if ( _track_queue.length ) {
                    //these args were the args that came in from the track trigger
                    var args = _track_queue.shift();
                    on_track.apply( this, args );
                    //make this function limit how fast it flushes the queue and thus sends out requests.
                    //ie, call itself after a delay until the queue is empty
                    return _.delay( flush_track_queue, 500 );
                }
            },

            on_track = function ( category, action, label, value ) {
                //need to push anything to be tracked into a queue and then process them.
                //this will allow us to wait for the storage to be loaded before we can fire
                //off the initial startup events.

                //temp check for storage_loaded
                if ( !base_stat ) {
                    //not yet ready.  queue the args for when it is ready.
                    _track_queue.push( _.toArray( arguments ) );
                    return;
                }


                console.error('ON_TRACK', category, action, label, value );

                if( !category || !action ){
                    throw "both category and action are required for interaction analytics";
                    return;
                }
                if( typeof label === 'undefined' ) label = null;
                if( typeof value === 'undefined' ) value = null;

                var data = {
                        tb_category: category,
                        tb_action: action,
                        tb_label: label,
                        tb_value: value                
                    };

                track( data );
            },

            popup_open_time = 0, //measured in seconds

            on_popup_open = function () {
                //make sure storage has loaded
                if ( base_stat ) {
                    //keep track of when it was opened for on_popup_close
                    popup_open_time = _bt.getTimestamp();
                    //increment the total interacted times by 1
                    base_stat.popup_ct += 1;
                    //save the stat
                    persist_base_stat();

                    console.warn('ON BENCH POPUP OPEN', base_stat.popup_ct);
                }
            },
            on_popup_close = function () {
                //make sure storage has loaded
                if ( base_stat && popup_open_time ) {
                    var session_time = _bt.getTimestamp() - popup_open_time;

                    //reset popup_open_time
                    popup_open_time = 0;
                    //add this 'session' time to the base stat checking
                    base_stat.popup_open += session_time;
                    //save the stat
                    persist_base_stat();

                    console.warn('ON BENCH POPUP CLOSE', session_time, base_stat.popup_open);
                }
            },

            get_version = function () {
                return _sandbox.loader.get_manifest().meta.version;
            },

            get_stat = function () {
                return storage.get('stat') || make_base_stat();
            },

            //make stat puts a stat in local storage if one isn't there.
            //it creates a base statistic so that 
            //if one isn't there, then we will assume that the user has just installed the extension
            make_base_stat = function () {
                console.warn('make base stat');

                var stat = {
                    tbs: TBS,
                    tbv: TBV,
                    tbn: TBN,
                    sequenceID: 0,
                    uniqueID: generateID(),
                    ssb: 0,
                    //last checkin is used internally and should be deleted from object before send to bench
                    last_checkin: 0,
                    popup_ct: 0,
                    popup_open: 0,
                    installed: false
                };

                storage.set( 'stat', stat ).save();
                return storage.get( 'stat' );

            },

            //for daily checkins
            make_checkin_stat = function ( now ) {

                var stat = make_stat( now, stat_event_name ),
                    days_alive = ~~( stat.ssb / checkin_time ); // ~~( Number ) is faster than Math.floor( Number )

                stat.tb_category = 'alive';
                stat.tb_action   = get_version();
                stat.tb_label    = _config.browser;
                stat.tb_value    = days_alive;

                return stat;
            },

            make_ux_stat = function ( now ) {
                return make_stat( now, stat_event_name );
            },

            make_stat = function ( now, event_name ) {
                var stat = _bt.clone( base_stat );
                stat.eventName = event_name;
                stat.ssb = now - stat.ssb;
                delete stat.last_checkin;
                delete stat.popup_ct;
                delete stat.popup_open;
                delete stat.installed;

                return stat;
            },
            
            increment_base_stat = function ( now ) {
                if ( base_stat.ssb === 0 ){
                    base_stat.ssb = now;
                }
                //might need logic here for dealing with cookies/localstorage not enabled

                //update the sequenceID
                base_stat.sequenceID += 1;
                //save the stat
                persist_base_stat();
            },

            persist_base_stat = function () {
                storage.set( 'stat', base_stat ).save();
            },

            track_install = function ( now, event_category ) {
                var now = now || _bt.getTimestamp(),
                    stat;

                base_stat.installed = true;
                increment_base_stat( now ); //persists the base_stat.installed
                stat = make_ux_stat( now );
                stat.tb_category = event_category;
                stat.tb_action   = get_version();
                stat.tb_label    = _config.browser;
                stat.tb_value    = null;

                console.error( 'track install' );

                setTimeout( function(){
                    send( stat );
                }, get_random_time() );
            },

            track_daily_interactions = function ( key, now, category, action, label ) {

                var now = now || _bt.getTimestamp(),
                    ct, stat;

                //for the interaction tracking, send a similar but slightly different stat.
                ct = base_stat[ key ];
                //set the counter back equal to zero
                base_stat[ key ] = 0;
                //increment sequence and ssb on base stat
                increment_base_stat( now ); //increment_base_stat also persists any changes to the base stat, like the reset on the line above
                //make stat to send
                stat = make_ux_stat( now );
                //set the info to send
                stat.tb_category = category;
                stat.tb_action   = action;
                stat.tb_label    = label;
                stat.tb_value    = ct;

                //console.error('track daily interaction', arguments);
                //send it
                setTimeout( function(){
                    send( stat );
                }, get_random_time() );

            },

            get_random_time = function () {
                return ~~( Math.random() * 10000 * Math.random() * 10 / ( Math.random() * 10 ) );
            },

            checkin = function () {
                var now = _bt.getTimestamp();
                //console.log('checkin?', get_random_time() );

                //check if enough time has passed
                if ( now - base_stat.last_checkin >= checkin_time ){
                    //check if this is the install stat
                    if ( ! base_stat.installed ) {
                        track_install( now, 'install' );
                    } else {
                        track_daily_interactions( 'popup_ct', now, 'interacted', 'popup', null );
                        track_daily_interactions( 'popup_open', now, 'visible', 'popup', null );
                    }

                    //the _install global variable is reliably available in _config (the core context config)
                    if ( _config._install ) {
                        _config._install = false;
                        track_install( now, 'installed' );
                    }

                    //now for the checkin
                    //we are sending a checkin, so update that key
                    base_stat.last_checkin = now;
                    //increment sequence and ssb on base stat
                    increment_base_stat( now );
                    //make stat to send
                    var checkin_stat = make_checkin_stat( now );
                    //send it
                    send( checkin_stat );

                } else {
                    console.warn('last checkin not far enough away', now, base_stat.last_checkin, now - base_stat.last_checkin, checkin_time, checkin_interval );
                }

                //always reset the timeout.
                return setTimeout( checkin, checkin_interval * 1000 );
                //return setTimeout( function(){ checkin(); }, checkin_interval * 1000 );
            },

            send = function ( stat ) {
                var url = 'http://bench.utorrent.com/e',
                    b64_content = btoa( JSON.stringify( stat ) ),
                    options = {
                        dataType:   "jsonp",
                        url:        url,
                        data:       { i: stat.uniqueID, e: b64_content }
                    };

                //jsonp send it to bench
                $.ajax( options );
                //track the event in google analytics
                gaq_observer.trigger( 'track:event', stat );
                //track_gaq_event( stat );

                // Bt.ajax.sandbox.request_jsonp( options );

                // Bt.msg.send( Bt.events.GAQ_TRACK, stat, 'gaq' );

                //_.bind( console.info, console, 'STAT SENT', JSON.stringify( stat, null, 4 ), options )();

                console.info('STAT SENT', JSON.stringify( stat, null, 4 ), options );
            },

            // track_gaq_event = function ( data ) {
            //     _gaq.push([
            //         '_trackEvent',
            //         data.tb_category,
            //         data.tb_action,
            //         data.tb_label || null,
            //         data.tb_value || null
            //     ]);



            //     // var category =  data.tb_category,
            //     //     action =    data.tb_action,
            //     //     label =     data.tb_label || null,
            //     //     value =     data.tb_value || null,
            //     //     gaq_event = ['_trackEvent', category, action, label, value ];

            //     // _gaq.push( gaq_event );
            // },

            increment_interactions = function () {},

            track = function ( data ) {
                var now = _bt.getTimestamp();
                increment_base_stat( now );
                var ux_stat = make_ux_stat( now );
                _bt.extend( ux_stat, data );
                send( ux_stat );                
            };

        //self init because the _sandbox global has already been defined
        initialize();

        //Public Methods
        _.extend( my, {
            //init: initialize
        });

        return my;
    });

})( this );
