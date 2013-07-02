define([
	'require',
	'q',
    'events',
    'observer.sandbox',
    'underscore'
], function ( require ) {
	

	var Q             = require('q'),
        _             = require('underscore'),
        Events        = require('events'),
        Observer      = require('observer.sandbox'),
        Message       = null, //set in init
        my            = {},
        inited        = false,
        active_id     = null,
        observer;

    //module logical vars
    var tabs = {};

    //Private methods
    var setup = function ( message ) {
            Message = message;

            //console.log('sandboxed tab_pages connector setup', Message, my);
        },

        initialize = function () {
            if ( !inited ) {
                inited = true;

                my.observer = Observer.load('tabs');

                //console.log('sandboxed tab_pages connector inited');

                //get all tabs that are currently instantiated in the core
                Message.on( Events.LOAD_TABS, on_load );
                Message.send( Events.LOAD_TABS, null, 'core' );

                //make a new local tab instance when the core creates one
                my.observer.on( 'create', make );
                //remove any instantiated tabs when the core removes one
                my.observer.on( 'remove', on_remove );
                //update data on a specific tab
                my.observer.on( 'update', on_update );
                //update data on a specific tab
                my.observer.on( 'active', on_active );
            }

            return my;
        },

        on_update = function ( tab_data ) {
            //console.log('sandbox tabs observer ON_UPDATE', tab_data );

            var tab = get( tab_data.id );
            if ( tab ) {
                tab.update( tab_data );
            } else {
                throw "sandbox tab doesn't exist to update: " + tab_data.id;
            }

        },

        on_remove = function ( tab_data ) {
            //console.log('sandbox tabs observer ON_REMOVE', tab_data );

            var tab = get( tab_data.id );
            if ( tab ) {
                tab.destroy();
            
                console.log( 'tab destroyed.  # remaining: ', _.keys( tabs ).length );
            } else {
                throw "sandbox tab doesn't exist to remove: " + tab_data.id;
            }
            return;
        },

        on_active = function ( tab_id ) {
            active_id = tab_id;
            my.observer.trigger( 'current', active_id );
        },

        on_load = function ( data ) {
            //console.log('sandbox tabs on_load', data );

            _.each( data, make );
        },

        //creates new tab instance
        make = function ( tab_data ) {
            //console.log('make sandbox tab');
            new Tab( tab_data );
        },
        //returns a tab instance
        get = function ( id ) {
            return tabs[ id ];
        },
        get_active = function () {
            return get( active_id );
        },

        //opens a tab, active says open it in the currently open tab,
        //false for a new tab
        //active says make newly opened tab active if not current
        open = function ( url, current, active ) {
            //console.log('sandboxed tabs open tab', url, current);
            Message.send( Events.OPEN, _.toArray( arguments ), 'core');
        };


    //Tab instance constructor
    var Tab = function ( tab_data ) {
        //set the data
        this.update( tab_data );

        tabs[ this.id ] = this;

        //console.log('new sandbox tab!', this);
    };

    Tab.prototype = {
        update: function ( tab_data ) {
            //console.log('update sandbox tab instance');
            _.extend( this, tab_data );
            if ( this.id === active_id ) {
                my.observer.trigger( 'current', this.id );
            }
        },
        inject: function ( src ) {
            //console.warn('sandbox inject script on tab', this, src );

            Message.send( Events.INJECT, {
                id:  this.id,
                src: src
            }, 'core' );
        },
        destroy: function () {
            delete tabs[ this.id ];
        }
    };

    //Public methods
	_.extend( my, {
        init:       initialize,
        setup:      setup,
        get:        get,
        get_active: get_active,
        open:       open
	});

	return my;
});