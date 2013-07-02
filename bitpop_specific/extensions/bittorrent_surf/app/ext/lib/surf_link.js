(function(){
    
    define([
        'require',
		'underscore'
    ], function () {

        var Tabs      = null,
            Message   = null,
            inited    = false,
			to_inject = null,
            app_observer  = null,
            my        = {};

        //private methods

        var init = function () {
                if ( !inited ) {
                    inited = true;
                    var manifest = _sandbox.storage.load('sources').get('manifest');

                    //set some 'globals' -ish
                    Message = _sandbox.message;
                    Tabs = _sandbox.tabs.init();
					to_inject = manifest.cscripts.link;
					app_observer = _sandbox.observer.load('app');

                    bind_events();
                    console.error('surf-link init', Tabs);
                }
            },

            bind_events = function () {
                Tabs.observer.on( 'ready', on_tab_ready );
                Message.on('sl:dlfc', on_add_fc_download );
            },

			//decides if site should be checked
            on_tab_ready = function ( id ) {
                var tab = Tabs.get( id );
				if ( tab.url && tab.url.match(/(https?:\/\/)?(127.0.0.1|10.0.2.2):8000\/link\/.*/)) {
					tab.inject( to_inject );
				}
            },

            on_add_fc_download = function ( data, source ) {
                console.error( 'Got content download request from surf-link', data );
				app_observer.trigger('torrent:add_url', data.content.torrent, 
						data.content.title );
            };

        _.extend( my, {
            init: init
        });

        //temp exposure
        window._surf_link = my;

        return my;

    });


})();
