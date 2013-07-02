define([
    'config',
    'popup',
    'underscore'
], function () {

    var config = require('config'),
        _ = require('underscore'),
        Popup = require('popup'); //tbb exists whether popup has been inited or not

    console.log('hello safari load fn');

    return function ( id, dir, needs_plugin ) {

        // scope ( this ) is the frames object in loader.js
        var src = config.data_path + dir + '/' + id + '/' + id + '.html',
            that = this;

        //needs_plugin === true => needs access to plugin
        //safari does some weird stuff.  it won't load plugins for use if page is not rendered/shown
        //these are background workers, so we need to trick safari to 'render' it and thus give us access to the plugins
        //http://blog.saypatata.com/2011/10/how-to-load-npapi-plugin-inside-safari.html
        //NOTE:  YOU CAN ONLY DO THIS WITH ONE WORKER, BECAUSE OTHERWISE THE RENDERINGS BLOCK EACH OTHER
        if ( needs_plugin ) {
            var tbb = Popup.get_tbb(),
                encoded_opts = btoa( JSON.stringify({
                    popover: true
                }) );

            //add encoded opts to source
            src = src + '?' + encoded_opts;

            //deferring operations because we could have multiple plugin 
            //modules being loaded real fast and we need to get the order of
            //tricking safari to render them right.
            _.defer(function () {
                if ( tbb.popover ) {
                    tbb.popover.contentWindow.safari.self.hide();
                    tbb.popover = null;
                }
                console.error('creating', id, tbb, tbb.popover);
                that[ id ] = safari.extension.createPopover( id, src, 0, 0 );
                tbb.popover = that[ id ];
                tbb.showPopover();
            });
            _.defer(function () {
                console.error('hiding', id, tbb.popover)
                tbb.popover.hide();
            });

        } else {
            //sandboxed, load like normal iframe
            //_.defer(function () {
                that[ id ] = document.createElement('iframe');
                that[ id ].src = src;
                that[ id ].name = id;
                document.body.appendChild( that[ id ] );
            //});

        }

    }

});