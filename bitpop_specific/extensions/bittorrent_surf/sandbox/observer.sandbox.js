define([
	'require',
	'helpers/functional',
	'q',
    'events',
    'underscore'
], function ( require ) {
	

	var _bt           = require('helpers/functional'),
		Q             = require('q'),
        _             = require('underscore'),
        Events        = require('events'),
        Message       = null, //set in init
        my            = {},
        instances     = {};

    //Private methods
    var initialize = function ( message ) {
            Message = message;

            Message.on( Events.PUBLISH, on_publish );

            console.log('sandboxed observer inited', Message);
        },
        
        on_publish = function ( payload, source ) {
            var name = payload.shift(),
                instance = get( name );

            //console.error( 'on Published payload', payload, source );

            if ( instance ) {
                //make the trigger silent ( which means local );
                payload.unshift( true );
                instance.trigger.apply( instance, payload );
            }
        },

        load = function ( name ) {
            return get( name ) || create( name );
        },

        get = function ( name ) {
            return instances[ name ];
        },

        create = function ( name ) {
            return new Observer( name );
        };

    //Constructor
    var Observer = function ( _name ) {
        this.name = _name;
        this.listeners = {};  //place to store callback handlers for events

        if ( !instances[ _name ] ) {
            instances[ _name ] = this;
        } else {
            throw "Observer with name '" + _name + "' already exists.";
        }

        //send subscribe to core
        Message.send( Events.SUBSCRIBE, {
            name: _name
        }, 'core' );
    };

    Observer.prototype = {
        on: function ( event, handler, scope ) {
            if ( !this.listeners[ event ] ) { this.listeners[ event ] = []; }
            var ctx = scope || this;
            this.listeners[ event ].push({
                fn: handler,
                ctx: ctx
            });
            Message.send( Events.SUBSCRIBE, {
                name: this.name,
                event: event
            });            
            return this;
        },

        //unsubscribe a handler for an event
        //no handler arg unsubscribes all handlers from event
        //sending message unsubscribes all handlers for this event
        //TODO - give option to just turn off a single handler
        off: function ( event, handler ) {
            var all = false;

            if ( handler && _.isFunction( handler ) ) {
                if ( this.listeners[ event ] ) {
                    //only finds first match for handler
                    _.each( this.listeners[ event ], function ( el, i, arr ) {
                        if ( handler === el.fn ) {
                            arr.splice( i, 1 );
                            return false;
                        }
                    });                    
                }

                if ( !this.listeners[ event ].length ) {
                    all = true;
                }
            } else {
                all = true;
            }

            if ( all ) {
                delete this.listeners[ event ];
                //send unsubscribe in core observer module
                Message.send( Events.UNSUBSCRIBE, {
                    name: this.name,
                    event: event
                });
            }
            return this;
        },

        //event plus additional data
        //trigger publishes to the core
        // or it triggers handlers in this worker
        trigger: function ( silent, event ) {
            //console.error( 'instance trigger', arguments );
            //trigger handlers in this worker if local,
            if ( _.isString( silent ) ) {
                //publish to core
                var payload = _.toArray( arguments );
                payload.unshift( this.name );
                Message.send( Events.PUBLISH, payload, 'core');
            } else {
                //this is silent, which means we trigger the handlers in this worker
                var handlers = this.listeners[ event ];
                if ( handlers && handlers.length ) {
                    var payload = _.toArray( arguments ).slice( 2, arguments.length );
                    _.each( handlers, function( handler ) {
                        handler.fn.apply( handler.scope, payload );
                    });
                };
            }
        }
    };

    //Public methods
	_.extend( my, {
        init: initialize,
        load: load
	});

	return my;
});