//used to act as an event observer constructor for other modules,
//and handles the message passing to listening workers
define([
	'require',
	'helpers/functional',
    'events',
    'router',
    'underscore',
	'config'
], function ( require ) {

	var _bt       = require('helpers/functional'),
        Events    = require('events'),
        Router    = require('router'),
        config    = require('config'),
        _         = require('underscore'),
		my 	      = {};

    var instances = {};

    //private methods
    var initialize = function () {
            var router_observer = load('router');
            Router.set_observer( router_observer );

            Router.on( Events.SUBSCRIBE, on_subscribe );
            Router.on( Events.UNSUBSCRIBE, on_unsubscribe );
            Router.on( Events.PUBLISH, on_publish );
        },
        //subscribe comes in as messages from workers
        on_subscribe = function ( msg ) {
            //console.log('observer on_subscribe', msg);

            var event = msg.data.event,
                name = msg.data.name,
                target = msg.worker,
                instance = get( name );

            if ( !instance && !event ){
                //need to create the instance here
                create( name );
                return;
            }

            if ( instance && event ) {
                //subscribe to event on observer instance
                instance.subscribe( event, target );
            }

        },

        on_unsubscribe = function ( msg ) {
            //console.log('observer unsubscribe', msg );
            var event = msg.data.event,
                name = msg.data.name,
                target = msg.worker,
                instance = get( name );

            if ( instance ) {
                instance.unsubscribe( event, target );
            }

        },

        on_publish = function ( msg ) {
            //console.error('on publish in core', msg);

            var payload = msg.data,
                name = payload.shift(),
                instance = get( name );

            if ( instance ) {
                instance.trigger.apply( instance, payload );
            }
        },

        publish = function ( target, payload ) {
            //payload is instance name,
            //  followed by observed event,
            //  followed by any number of additional
            //  arguments as JSON-serializable data,
            Router.send( target, Events.PUBLISH, payload );

            //console.log('publish', target, payload );
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
    //auto registers itself
    var Observer = function ( _name ) {
        this.name = _name;
        this.listeners = {};

        if ( !instances[ _name ] ) {
            instances[ _name ] = this;
        } else {
            throw "Observer with name '" + _name + "' already exists.";
        }
    };

    Observer.prototype = {
        subscribe: function ( event, target ) {
            //console.log('observer subscribe');
            //create space in listeners for event if not exist
            if ( !this.listeners[ event ] ) { this.listeners[ event ] = {}; }
            //create space for handlers if not exist
            if ( !this.listeners[ event ][ target ] ) { 
                this.listeners[ event ][ target ] = ( target === 'core' ? [] : true ); 
            }
        },

        unsubscribe: function ( event, target ) {
            if ( this.listeners[ event ] ) {
                delete this.listeners[ event ][ target ];
            }
        },

        //  parameter as arguments to handlers on other side of router.
        //  extra data must be JSON-serializable
        //  { instance }.trigger( 'eventName', arg_1, arg_2, ..., arg_n );
        trigger: function ( event ) {
            var targets = this.listeners[ event ];
            //console.log('observer trigger', this.name, event, this.listeners, targets );
            if ( targets && !_.isEmpty( targets ) ) {
                for ( var target in targets ) {
                    var args = _.toArray( arguments );
                    //local trigger
                    if ( target === 'core' ) {
                        //shift out event name
                        args.shift();
                        _.each( this.listeners[ event ][ 'core' ], function ( el ) {
                            el.fn.apply( el.ctx, args );
                        });
                    } else {
                        //put in name of instance for message to worker
                        args.unshift( this.name );
                        publish( target, args );
                    }

                }
            }

            return this;
        },

        //on and off for local core usage
        on: function ( event, handler, scope ) {
            //makes space for handler
            this.subscribe( event, 'core' );
            var ctx = scope || this;
            this.listeners[ event ][ 'core' ].push({
                fn: handler,
                ctx: ctx
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
                if ( this.listeners[ event ][ 'core' ] ) {
                    //only finds first match for handler
                    _.each( this.listeners[ event ][ 'core' ], function ( el, i, arr ) {
                        if ( handler === el.fn ) {
                            arr.splice( i, 1 );
                            return false;
                        }
                    });                    
                }

                if ( !this.listeners[ event ][ 'core' ].length ) {
                    all = true;
                }
            } else {
                all = true;
            }

            if ( all ) {
                this.unsubscribe( event, 'core' );
            }
            
            return this;
        }        
    };

    initialize();

	//Public methods
	_.extend( my, {
		//Observer: Observer
        load: load
    });

	return my;

});