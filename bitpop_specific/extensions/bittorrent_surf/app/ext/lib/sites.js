(function(){
    
    define([
        'require',
        'underscore',
        'sandbox_helpers',
        'app_helpers',
        'parser',
        'config',
        //'settings',
        'q'
    ], function () {

        var _bt      = require('sandbox_helpers'),
            //settings = require('settings'),
            config   = require('config'),
            Parser   = require('parser'),
            KEY      = 'sites',
            // detected = {},
            // added    = {},
            // declined = {},
            // skip     = {},
            dont_check = [
                'about:',
                'chrome://',
                'chrome-devtools://',
                'google.',
                'search.yahoo.',
                'yahoo.',
                'bing.'
            ],

            parser_observer = null, //set in init
            Sites     = null,
            Tabs      = null,
            Message   = null,
            to_inject = null, //source code for inject script var'ed here
            inited    = false,
            observer,
            my        = {};

        //private methods

        var init = function () {
                if ( !inited ) {
                    inited = true;

                    //getting manifest info is a special case for storage.  
                    //it is loaded to run this sandbox tab, so don't need
                    //to listen for any reset events to get data right away
                    var manifest = _sandbox.storage.load('sources').get('manifest');

                    //set some 'globals' -ish
                    Message = _sandbox.message;
                    observer = _sandbox.observer.load('sites');
                    //start the parser
                    Parser.init(); //could make this an observer event
                    parser_observer = _sandbox.observer.load('parser');

                    to_inject = manifest.cscripts.inject;

                    Sites = _sandbox.storage.load('sites', {
                        defaults: {
                            added:    {
                                archive: {
                                    data: {
                                        favicon: "http://www.archive-it.org/static/icons/logo_IA.png",
                                        hidden_els: {output : 'json', rows : '50', page : '1', 'fl[]' : 'identifier,title'},
                                        param: 'q',
                                        url: 'http://archive.org/advancedsearch.php'
                                    },
                                    time: _bt.getTimestamp()
                                },
                                btfc: {
                                    data: {
                                        //favicon: config.data_path + "app/img/16x16-bt-icon-purple.png",
                                        favicon: "../img/16x16-bt-icon-purple.png",
                                        // t = term, nr = number of results, th = threshold
                                        hidden_els: {},
                                        type: 'GET',
                                        url: config.app.btfc_url[ config.env ]
                                    },
                                    time: _bt.getTimestamp()
                                }
                            },
                            detected: {},
                            declined: {},
                            skipped:  {},
                            defaults: {
                                google: {
                                    data: {
                                        favicon: null,
                                        hidden_els: {},
                                        param: 'q',
                                        url: 'http://www.google.com/search'                                    
                                    },
                                    time: _bt.getTimestamp()
                                },
                                bing: {
                                    data: {
                                        favicon: null,
                                        hidden_els: {},
                                        param: 'q',
                                        url: 'http://www.bing.com/search'
                                    },
                                    time: _bt.getTimestamp()
                                },
                                yahoo: {
                                    data: {
                                        favicon: null,
                                        hidden_els: {},
                                        param: 'p',
                                        url: 'http://search.yahoo.com/search'
                                    },
                                    time: _bt.getTimestamp()
                                }
                            }
                        }
                    }).on('reset', notify_detected ); //push any detected sites to notifications

                    Tabs = _sandbox.tabs.init();

                    bind_events();

                    //temp clear sites while developing
                    // Sites.clear();

                    console.log('sites init', Tabs, Sites );
                }
            },

            bind_events = function () {
                Tabs.observer.on( 'ready', on_tab_ready );

                Message.on('html', on_injected );

                parser_observer.on('rejected', on_rejected);
                parser_observer.on('detected', on_detected);
                parser_observer.on('added', on_added);

                //Popup sends load to reset sites collection
                observer.on('load', send);
                //if user does surf:reset, send the sites again when Sites resets
                Sites.on('reset', send);

                observer.on('enable', on_added);
                observer.on('disable', on_disabled);
            },

            // on_load = function () {
            //     //observer.trigger('reset', { added: get_enabled(), declined: get_disabled() });
            //     observer.trigger('reset', get() );
            // },

            on_rejected = function ( opts ) {
                console.error('site rejected in sites.js');
                skip( opts.key, opts.silent );
            },

            on_detected = function ( opts ) {
                detect( opts.key, opts.search, opts.silent );
            },

            on_added = function ( opts ) {
                console.error('on_added in sites.js', opts);
                add( opts.key );
            },

            on_disabled = function ( opts ) {
                console.error('on site disabled',opts);

                disable( opts.key );
            },

            send = function () {
                observer.trigger('reset', get() );
            },

            //called on Sites storage reset.  trigger detected event so notifications get pushed out
            notify_detected = function ( sites ) {
                //clear out 'skip key from sites (legacy from alpha)'
                //migrates skip key from alpha
                if ( _.isObject( sites.skip ) ) {
                    Sites.set({ skipped: sites.skip }).remove('skip').save();
                }

                _.each( sites.detected, function ( site, key ) {
                    observer.trigger( 'detected', site.data );
                });
                //also trigger observer on default sites
                observer.trigger( 'defaults', sites.defaults );
            },

            disable = function ( key ) {
                console.error('disable site in sites.js', key );

                var defaults = get_defaults();

                for ( var k in defaults ) {
                    if ( k === key ) {
                        return disable_default( key, defaults );
                    }
                }

                var declined = Sites.get('declined');

                //look through different buckets to find site
                _.each( ['detected', 'added'], function ( name ) {

                    var bucket = Sites.get( name ),
                        site = bucket[ key ];

                    if ( site ) {
                        delete bucket[ key ];
                        declined[ key ] = site;
                        observer.trigger( 'disabled', site.data );
                    }
                });

                Sites.save();
                send();
            },

            disable_default = function ( key ) {
                console.error('disable defaults in sites.js', key );

                var added = Sites.get('added'),
                    site = added[ key ];

                if ( site ) {
                    delete added[ key ];
                }

                //set default engine to null
                Sites.save();
                
                send();

                observer.trigger( 'disabled', site.data );
            },

            skip = function ( key, silent ) {
                console.error('skip site', key, silent);
                Sites.get('skipped')[ key ] = {
                    time: _bt.getTimestamp()
                };
                Sites.save();
            },

            //takes site from detected or removed and puts it in added
            add = function ( key ) {
                console.error('add in sites.js', key);

                var defaults = get_defaults();

                for ( var k in defaults ) {
                    if ( k === key ) {
                        return add_default( key, defaults );
                    }
                }

                var added = Sites.get('added');

                //look through different buckets to find site
                _.each( ['detected', 'declined'], function ( name ) {

                    var bucket = Sites.get( name ),
                        site = bucket[ key ];

                    if ( site ) {
                        delete bucket[ key ];
                        added[ key ] = site;
                        console.error('found site to add.  triggering', site);
                        observer.trigger( 'enabled', site.data );
                    }
                });

                Sites.save();
                send();
            },

            //deals with adding a default search site
            add_default = function ( key, defaults ) {
                var added = Sites.get('added');

                //first delete any other default sites out of the added
                _.each( _.keys( defaults ), function ( name ) {
                    if ( added[ name ] ) {
                        delete added[ name ];
                    }
                });

                //then add it into the added
                var site = _bt.clone( defaults[ key ] );
                console.log('adding default site', site, defaults );

                added[ key ] = _.clone( site );
                //set the persistent setting
                //settings.set({ default_engine: key }).save();
                observer.trigger( 'enabled', site.data );

                Sites.save();
                send();
            },

            detect = function ( key, site, silent ) {
                console.error('detect in sites.js', key, site, silent);
                //remove site from skip list
                var skipped = Sites.get('skipped');
                delete skipped[ key ];

                Sites.get('detected')[ key ] = {
                    time: _bt.getTimestamp(),
                    data: site
                };

                if ( !silent ) {
                    send();
                    observer.trigger( 'detected', site );
                }
                Sites.save();
            },

            //decides if site should be checked
            on_tab_ready = function ( id ) {
                var tab = Tabs.get( id );
                console.error('tab ready in sitesjs');
                if ( tab && should_check( tab.url ) ) {
                    //console.log('THIS TAB SHOULD BE CHECKED, SO INJECT THE SCRIPT', id, tab);
                    //"skip" the site so that it doesn't get unnecessarily checked before this check finishes
                    skip( _bt.getBasePath( tab.url ) );
                    tab.inject( to_inject );
                }
            },

            //sends the event to the parser to initiate the site detection check
            on_injected = function ( data, source ) {
                //source from an injected script looks like tab_{tab_id}_{this_worker_name}
                var id = source.split('_')[1],
                    tab = Tabs.get( id );

                if ( tab ) {
                    parser_observer.trigger('check', {
                        url: tab.url,
                        html: data.html,
                        favicon: tab.favicon,
                        key: _bt.getBasePath( tab.url )
                    });
                }
                //console.error( 'got injected page data', data, tab );
            },
            //give it a url.  checks if the site has been checked already
            should_check = function ( url ) {
                if ( !url ) {
                    return false;
                }

                var key = url.getBasePath(),
                    site;

                //don't check search engines
                for ( var i=0,len=dont_check.length; i<len; i++ ) {
                    if ( key.indexOf( dont_check[i] ) === 0 ) {
                        return false;
                        break;
                    }
                }

                //check added, detected, and skip objects
                if( Sites.get('added')[ key ] !== undefined ){
                    return false;
                } else if ( site = Sites.get('detected')[ key ] && !_bt.isExpired( site ) ) {
                    //route it to sites detected
                    return false;
                } else if ( site = Sites.get('declined')[ key ] && !_bt.isExpired( site ) ) {
                    //route it to sites declined
                    return false;
                } else if ( site = Sites.get('skipped')[ key ] && !_bt.isExpired( site ) ) {
                    return false;
                }            

                return true;
            },

            get = function () {
                return Sites.get();
            },

            get_enabled = function () {
                return Sites.get('added');
            },

            get_disabled = function () {
                return Sites.get('declined');
            },

            get_defaults = function () {
                return _bt.clone( Sites.get('defaults') );
            };

        _.extend( my, {
            init: init,
            should_check: should_check,
            observer: observer,
            get: get,
            get_enabled: get_enabled,
            get_defaults: get_defaults,
            add: add
        });

        //temp exposure
        window._sites = my;

        return my;

    });

})();
