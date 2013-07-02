define([

], function () {

    return {
        paths: {
            //jquery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min'

            handlebars:   './app/lib/handlebars',
            templates:    './app/popup/templates/templates',
            timeago:      './app/lib/timeago',

            //models
            app:                      './app/popup/app/models/app.model',
            'dialogs.model':          './app/popup/app/models/dialogs.model',
            'site.model':             './app/popup/app/models/site.model',
            'notification.model':     './app/popup/app/models/notification.model',
            'result.model':           './app/popup/app/models/result.model',
            'torrent.model':          './app/popup/app/models/torrent.model',
            'torque_settings.model':  './app/popup/app/models/torque_settings.model',

            //collections
            'sites.collection':             './app/popup/app/collections/sites.collection',
            'notifications.collection':     './app/popup/app/collections/notifications.collection',
            'search.collection':            './app/popup/app/collections/search.collection',
            'torrents.collection':          './app/popup/app/collections/torrents.collection',

            //views
            'app.view':                     './app/popup/app/views/app.view',
            'tip.view':                     './app/popup/app/views/tip.view',
            'alert.view':                   './app/popup/app/views/alert.view',
            'torrents.view':                './app/popup/app/views/torrents.view',
            'torrent.view':                 './app/popup/app/views/torrent.view',
            'toolbar.view':                 './app/popup/app/views/toolbar.view',
            'search.view':                  './app/popup/app/views/search.view',
            'suggestion.view':              './app/popup/app/views/suggestion.view',
            'result.view':                  './app/popup/app/views/result.view',
            'dialog.view':                  './app/popup/app/views/dialog.view',
            'dialogs.view':                 './app/popup/app/views/dialogs.view',
            'engines.dialog.view':          './app/popup/app/views/engines.dialog.view',
            'association.dialog.view':      './app/popup/app/views/association.dialog.view',
            'add_site.dialog.view':         './app/popup/app/views/add_site.dialog.view',
            'site_manager.dialog.view':     './app/popup/app/views/site_manager.dialog.view',
            'notifications.dialog.view':    './app/popup/app/views/notifications.dialog.view',
            'settings.dialog.view':         './app/popup/app/views/settings.dialog.view',
            'add_sites.dialog.view':        './app/popup/app/views/add_sites.dialog.view',
            'pairing.dialog.view':          './app/popup/app/views/pairing.dialog.view',
            'remote_asset.dialog.view':     './app/popup/app/views/remote_asset.dialog.view'
        },
        shim: {
            handlebars: {
                exports: 'Handlebars'
            },
            templates: {
                deps: [ 'handlebars' ]
            },
            timeago: {
                deps: [ 'jquery' ]
            }
        }
    };

});