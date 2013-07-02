/*jshint white:false, camelcase:false */
//need to stash require into a global require so i can use it in the browser.ready to set up the proper config
// var global_require = require;
//document.write(( typeof Cc === 'undefined' && typeof addon === 'undefined' && !( typeof document !== 'undefined' && 'MozBoxSizing' in document.documentElement.style ) ? ( typeof chrome === 'undefined' ? 'safari' : 'chrome' ) : 'firefox' ));
// require.config({
// 	//base url is two levels up because all sandboxed workers live in /app/{name}/{name}.html
// 	baseUrl: '../../',
//     shim: {
//         underscore: {
//             exports: '_'
//         },
//         backbone: {
//             deps: [ 'underscore', 'jquery' ],
//             exports: 'Backbone'
//         },
//         jstorage: {
//             deps: [ 'jquery' ]
//         }
//     },
//     paths: {
//         config:                         './config',
//         local_config:                   './config.local',
//         app_config:                     './app/config.app',
//         events:                         './platform/events',
//         sandbox_helpers:                './sandbox/helpers.sandbox',
//         'sandbox.firefox':              './sandbox/firefox/sandbox.firefox',
//         'sandbox.chrome':               './sandbox/chrome/sandbox.chrome',
//         'message.sandbox.chrome':       './sandbox/chrome/message.sandbox.chrome',
//         'message.sandbox.firefox':      './sandbox/firefox/message.sandbox.firefox',
//         'browser.sandbox':              './sandbox/browser.sandbox',
//         'loader.sandbox':               './sandbox/loader.sandbox',
//         'extension_storage.sandbox':    './sandbox/extension_storage.sandbox',
//         'request.sandbox':              './sandbox/request.sandbox',
//         'observer.sandbox':             './sandbox/observer.sandbox',
//         'popup.sandbox':                './sandbox/popup.sandbox',
//         'tabs.sandbox':                 './sandbox/tabs.sandbox',
//         'extension_tabs.sandbox':       './sandbox/extension_tabs.sandbox',
//         'helpers/string':               './helpers/string',
//         'helpers/url':                  './helpers/url',
//         'helpers/time':                 './helpers/time',
//         jquery:                         './lib/jquery',
//         jstorage:                       './lib/jstorage',
//         q:                              './lib/q',
//         underscore:                     './lib/underscore.min',
//         backbone:                       './lib/backbone'
//     }
// });

define('require.config.sandbox', function () {

    return {
        //base url is two levels up because all sandboxed workers live in /app/{name}/{name}.html
        baseUrl: '../../',
        shim: {
            underscore: {
                exports: '_'
            },
            backbone: {
                deps: [ 'underscore', 'jquery' ],
                exports: 'Backbone'
            },
            jstorage: {
                deps: [ 'jquery' ]
            }
        },
        paths: {
            config:                         './config',
            local_config:                   './config.local',
            app_config:                     './app/config.app',
            events:                         './platform/events',
            sandbox_helpers:                './sandbox/helpers.sandbox',
            'sandbox.firefox':              './sandbox/firefox/sandbox.firefox',
            'sandbox.chrome':               './sandbox/chrome/sandbox.chrome',
            'sandbox.safari':               './sandbox/safari/sandbox.safari',
            'message.sandbox.chrome':       './sandbox/chrome/message.sandbox.chrome',
            'message.sandbox.safari':       './sandbox/safari/message.sandbox.safari',
            'message.sandbox.firefox':      './sandbox/firefox/message.sandbox.firefox',
            'message.sandbox.firefox.tab':  './sandbox/firefox/message.sandbox.firefox.tab',
            'browser.sandbox':              './sandbox/browser.sandbox',
            'loader.sandbox':               './sandbox/loader.sandbox',
            'extension_storage.sandbox':    './sandbox/extension_storage.sandbox',
            'request.sandbox':              './sandbox/request.sandbox',
            'observer.sandbox':             './sandbox/observer.sandbox',
            'popup.sandbox':                './sandbox/popup.sandbox',
            'tabs.sandbox':                 './sandbox/tabs.sandbox',
            'extension_tabs.sandbox':       './sandbox/extension_tabs.sandbox',
            'helpers/string':               './helpers/string',
            'helpers/url':                  './helpers/url',
            'helpers/time':                 './helpers/time',
            jquery:                         './lib/jquery',
            jstorage:                       './lib/jstorage',
            q:                              './lib/q',
            underscore:                     './lib/underscore.min',
            backbone:                       './lib/backbone'
        }
    };

});