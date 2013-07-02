console.log('hello main');

//Require the Components object
const { Cc,Ci,Cu,Cr,Cm } = require('chrome');
//useful stuff about me... Bender!  ( well... Extension! )
const Unload = require('unload');
const self = require("self");
//sub-script loader to pull in shared libraries between extensions
const { loadSubScript } = Cc['@mozilla.org/moz/jssubscript-loader;1'].getService(Ci.mozIJSSubScriptLoader);
//Panel for loading frames to be rendered
const Panel = require('panel');
//need to watch and create tabs
const Tabs = require('tabs');
//page worker for loading iframes
const PageWorker = require("page-worker");
//page mod for injecting scripts into extension tab
const PageMod = require('page-mod');
//clipboard module for copying text to clipboard
const Clipboard = require('sdk/clipboard');
//some normal stuff we would want in the global environment
const timers        = require('timers');
const setTimeout    = timers.setTimeout;
const clearTimeout  = timers.clearTimeout;
const setInterval   = timers.setInterval;
const clearInterval = timers.clearInterval;
//const { XMLHttpRequest } = require("api-utils/xhr");
const { XMLHttpRequest } = require("xhr");
//storage
const SS = require('simple-storage');

//ToolbarButton
const TBB = require('toolbarbutton');

console.log( 'self.id?', self.id, self.data.url('app/img/bt0_icon.png') );

//spoof a window.
var window, document, navigator, location, btoa, atob; 
window    = require("sdk/window/utils").getMostRecentBrowserWindow();
document  = window.document;
navigator = window.navigator;
location  = window.location;
btoa      = window.btoa;
atob      = window.atob;

//console.log( 'btoa?', typeof window.btoa )

//console.log( 'self.id?', self.id, typeof TBB );

//loadSubScript( self.data.url( 'platform/firefox/require-shim.js' ) );
//loadSubScript( self.data.url( 'lib/bt.require.js' ) );
loadSubScript( self.data.url( 'lib/r.js' ) );

//explicitly define module paths
loadSubScript( self.data.url( 'platform/firefox/require.config.firefox.js' ) );


//loadSubScript( self.data.url( 'platform/firefox/temp-boot.js' ) );
loadSubScript( self.data.url( 'boot.js' ) );
//console.log('boot.js loaded?');

