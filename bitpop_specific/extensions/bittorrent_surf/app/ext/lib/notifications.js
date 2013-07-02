(function () {

	define([
		'require',
		'underscore',
		'config',
        'sandbox_helpers'
	], function ( require ) {

		var config = require('config'),
            _bt = require('sandbox_helpers'),
            types = config.app.notifications,
			observer = null, //set in init
			Tabs = null, //set in init
            Popup = null, //set in init
			notifications = [],
			max_length = 20,
            current_url = '',
			my = {};


		//Private methods
		var initialize = function () {
				observer = _sandbox.observer.load('notifications');
                Tabs = _sandbox.tabs.init();			
                Popup = _sandbox.popup;

                //bind events
                Tabs.observer.on('current', set_current_url );
                observer.on('load', send );
                observer.on('resolve', on_resolve );
                observer.on('update', on_update );
                observer.on('remove', on_remove );

                send = _.throttle( send, 300 );

            	console.error('notifications init', observer, config);
			},

			clear = function () {
				notifications = [];
				compressed = [];
				send();
			},

			push = function ( data, opts ) {
                var item = data;
                //set time
                _.extend({
                    resolved:   false,
                    seen:       false,
                    alert_seen: false
                }, item );

                item.id         = item.id         || _bt.generateGuid();
                item.img        = item.img        || get_icon_image( item.type );
                item.name       = item.name       || 'event name';
                item.action     = item.action     || 'event action';
                item.timestamp  = item.timestamp  || _bt.getTimestamp(); //right now
                item.resolved   = item.resolved   || false;
                item.seen       = item.seen       || false;
                item.alert_seen = item.alert_seen || false;
                
                //add a priority to the message that we define
                //higher number means higher priority
                if( !item.priority ){
                  switch ( item.type ) {
                    case types.DOWNLOAD_COMPLETE :
                      item.priority = 70;
                      break;
                    case types.DOWNLOAD_FAILED :
                      item.priority = 30;
                      break;
                    case types.SEARCH_SITE_ADDED :
                    case types.SEARCH_SITE_DECLINED :
                    case types.SEARCH_SITE_ADD_FAIL :
                      item.priority = 30;
                      //remove any notifications associated with this site
                      remove( item.id );
                      break;
                    case types.SEARCH_SITE_DISCOVERED :
                      item.priority = 90;
                      break;
                    case types.AUTHORIZE_PAIRING :
                      item.priority = 100;
                      break;
                    case types.DOWNLOAD_STARTED :
                      item.priority = 30;
                      break;
                    case types.CLIENT_AUTHORIZED :
                      item.priority = 1;
                      break;
                    default : 
                      item.priority = 0;
                      break;
                  }
                }

                notifications.push( item );

                //keep the max length steady
                while ( notifications.length > max_length ){
                  notifications.shift();
                }

                console.warn('PUSH NOTIFICATION', item.type, item.id);

                if ( !opts || !opts.silent ) {
                    send();
                }
			},

			send = function (  ) {
                console.error('SEND NOTIFICATIONS');

                //old was:
                //send_current_url();
                //process();  //all that collapsing jazz
                //update_badge();
                //send_notifications();

                update_badge();

                observer.trigger('reset', get() );
			},

            get_icon_image = function ( type, ct ) {
                var src  = null,
                  path = 'app/img/',
                  base = 'bt0_icon';

                if ( _config.browser === 'safari' ) {
                    base = 'surf_icon_safari';
                }

                  console.error('get_icon_img', base, _config);

                switch ( type ) {
                    case types.SEARCH_SITE_DISCOVERED :
                        src = path + base + '_add.png';
                        break;

                    case types.AUTHORIZE_PAIRING :
                        src = path + base + '_auth.png';
                        break;

                    default :
                        if( ct > 9 ) ct = '9+';
                        src = ( !ct ? path + base +'.png' : path + base + '_' + ct + '.png' );
                        break;
                }

                console.log('get icon image', src, type, path );

                return src;
            },

			get = function ( id ) {
				return ( id ? get_by_id( id ) : notifications );
			},

			get_by_id = function ( id ) {
				var notification;
				for ( var i=0, len=notifications.length; i<len; i++ ) {
					if ( notifications[ i ].id === id ) {
						notification = notifications[ i ];
						break;
					}
				}
				return notification;
			},

			get_by_type = function ( type ) {
				return _.filter( notifications, function ( el ){
					return el.type === type;
				});
			},

			get_unresolved = function ( min_priority ) {
				if ( !min_priority ) { min_priority = 0; }
				return _.filter( notifications, function ( el, i, arr ) {
					return !el.resolved && el.priority >= min_priority;
				});
			},

            //hold ids for default engines
            default_engines = [],
            //allows other modules to set what the default engines are.
            set_default_engines = function ( arr ) {
                default_engines = arr;
            },
            //removes notification from array
			remove = function ( id ) {
                console.error('remove notification by id', id);
                if ( !id ) { return; }
                
                var is_engine = _.contains( default_engines, id ), //remove any notification matching default engine keys if id is one of them
                    //get where the notifications are in the array
                    indices = notifications.reduce( function( ret, el, i, arr ){
                    if( el.id === id || ( is_engine && _.contains( default_engines, el.id ) ) ) {
                        ret.push( i );
                    }
                    return ret;
                }, []);
                _.each( indices, function( i ) {
                    notifications.splice( i, 1);
                });
            },

            //used to update a notification.  change is an object with attributes to override
			update = function ( id, changes, opts ) {
                var notification = get( id );

                console.error('update notification', id, changes, opts, arguments, notification );

                if ( notification ) {
                    notification.timestamp = _bt.getTimestamp();

                    if ( changes ) {
                        for ( var k in changes ) {
                            if ( typeof notification[ k ] !== 'undefined' ) {
                                notification[ k ] = changes[ k ];
                            } else {
                                console.error('not setting *'+ k + '* in notification because key doesn\'t exist', notification );
                            }
                        }
                    }
                } else {
                  console.error('notification not found', id);
                  return false;
                }

                if( !opts || !opts.silent ){
                  send();
                }
            },

            //resolves a notification by type or just all of them
            resolve_all = function( type, silent ){
                //resolve by type string, array of type strings, or all
                type = _bt.makeArray( type );

                _.each( type, function ( _type ){
                    _.each( notifications, function( el ) {
                        if ( !_type || el.type === _type ) {
                            el.resolved = true;
                            if ( !silent ) {
                                //console.log('I AM setting seen', !silent );
                                el.seen = true;
                            // } else {
                            //     console.log('not setting seen');
                            }
                        }
                    });
                });

                console.error( 'resolve all', type, silent);

                send();
            },

            on_resolve = function ( type, silent ) {
                //right now just pass to resolve_all
                resolve_all.apply( this, arguments );
            },

            on_update = function () {
                update.apply( this, arguments );
            },

            on_remove = function () {
                remove.apply( this, arguments );
            },

            set_current_url = function ( tab_id ) {
                console.log('on_current_tab ', tab_id );
                var tab = Tabs.get( tab_id );

                //only set if different
                if ( tab && tab.url && tab.url.getBasePath() !== current_url ) {
                    current_url = tab.url.getBasePath();
                    console.error('set_current_url', current_url );
                    //send the current url
                    observer.trigger('url', current_url );
                    update_badge();
                }

            },

			//sets the proper badge
			update_badge = function () {
				//get only non_resolved
				var unresolved = get_unresolved( 50 ),
					//sort by priority
					type = notifications.sort( function ( a, b ) {
                        return b.priority - a.priority;
                    }),
                    badge;

                //then map to type
                type = _.map( type, function ( el ) {
                    return el.type;
                });

                type = type.shift();

                // //case for detected sites to not show plus badge if not on site that matches detected site's url
                // if( type === types.SEARCH_SITE_DISCOVERED ){
                //     //we need all of the detected events
                //     //so we can check them against the current url
                //     var urls = get_by_type( type ).map(function(el){ return el.id });
                    
                //     if( urls.indexOf( current_url ) < 0 ) {
                //         type = null;
                //     }
                //     //console.error('URLS', urls, urls.indexOf( current_url ));
                // }          

                badge = get_icon_image( type, unresolved.length );

                console.log('update badge', type, badge);

                //tell popup to set badge
                Popup.set_icon( badge );
			};

		//Public Methods
		_.extend( my, {
			init:    initialize,
			clear:   clear,
            push:    push,
            remove:  remove,
            set_default_engines: set_default_engines
		});

		return my;

	});

})();

/**
 *  NOTIFICATION EVENTS - ( OLD NOTES FROM SURF ALPHA )
 *
 *  Event Types:                  Display:
 *    download complete:            list & widget icon
 *    download failed:              list & widget icon
 *    search-site name added:       list & widget notification div
 *    search-site addition fail:    list & widget notification div
 *    search-site discovered:       list & widget icon
 *
 *  Elements:
 *    list icon:                for presentation in list
 *    widget icon:              for presentation in browser chrome
 *    event link:               triggers widget view change
 *    timestamp:                displays in list only
 *    notifications icon badge
 */

/*
 types = {
    DOWNLOAD_COMPLETE:    'download_complete',
    DOWNLOAD_FAILED:    'download_failed',
    DOWNLOAD_STARTED:       'download_started',
    SEARCH_SITE_ADDED:      'search_site_added',
    SEARCH_SITE_DECLINED:   'search_site_declined',
    SEARCH_SITE_ADD_FAIL:   'search_site_add_fail',
    SEARCH_SITE_DISCOVERED: 'search_site_discovered',
    AUTHORIZE_PAIRING:      'pairing_requested',
    CLIENT_AUTHORIZED:      'client_authorized'
 }
*/