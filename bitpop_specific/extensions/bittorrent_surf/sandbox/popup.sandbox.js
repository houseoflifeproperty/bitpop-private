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
        observer;

    //Private methods
    var initialize = function ( message ) {
            Message = message;

            my.observer = Observer.load('popup');

            console.log('sandboxed popup connector inited', Message, my);
        },

        //set popup attributes, currently ( icon ) and ( title, but not in ff )
        set = function ( prop, val ) {
            Message.send( Events.POPUP_SET, {
                k: prop,
                v: val
            });
        },

        //crucial that it works in all browsers
        set_icon = function ( path ) {
            set( 'icon', path );
        },

        //only works for chrome
        set_title = function ( path ) {
            set( 'title', path );
        };


    //Public methods
	_.extend( my, {
        init:       initialize,
        set_icon:   set_icon,
        set_title:  set_title
	});

	return my;
});