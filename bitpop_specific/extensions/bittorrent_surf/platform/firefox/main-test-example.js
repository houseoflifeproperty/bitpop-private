console.log('hello main-test-example');

//Require the Components object
const { Cc,Ci,Cu,Cr,Cm } = require('chrome');
//useful stuff about me... Bender!  ( well... Extension! )
const self = require("self");
//sub-script loader to pull in shared libraries between extensions
const { loadSubScript } = Cc['@mozilla.org/moz/jssubscript-loader;1'].getService(Ci.mozIJSSubScriptLoader);
//page worker for loading iframes
const PageWorker = require("page-worker");
//some normal stuff we would want in the global environment
const timers        = require('timers');
const setTimeout    = timers.setTimeout;
const clearTimeout  = timers.clearTimeout;
const setInterval   = timers.setInterval;
const clearInterval = timers.clearInterval;
//const { XMLHttpRequest } = require("api-utils/xhr");
const { XMLHttpRequest } = require("xhr");

const SS = require('simple-storage');

//spoof a window.
var window, document, navigator, location; 
window    = require("sdk/window/utils").getMostRecentBrowserWindow();
document  = window.document;
navigator = window.navigator;
location  = window.location

console.log( 'self.id?', self.id );

// var window_context = {
// 	window: window,
// 	document: document,
// 	navigator: navigator,
// 	exports: undefined
// };

loadSubScript( self.data.url( 'lib/jasmine.js' ) );
//loadSubScript( self.data.url( 'lib/jasmine-html.js' ) );
loadSubScript( self.data.url( 'lib/jasmine-console-reporter.js' ) );
//var jasmine = require('jasmine');

//loadSubScript( self.data.url( 'platform/firefox/require-shim.js' ) );
//loadSubScript( self.data.url( 'lib/bt.require.js' ) );
loadSubScript( self.data.url( 'lib/r.js' ) );

//explicitly define module paths
loadSubScript( self.data.url( 'platform/firefox/require.config.firefox.js' ) );

//output jasmine tests to console
//http://stackoverflow.com/questions/7157999/output-jasmine-test-results-to-the-console

        describe("Basic Suite", function() {
            it("Should pass a basic truthiness test.", function() {
                expect(true).toEqual(true);
            });
            
            it("Should fail when it hits an inequal statement.", function() {
                expect(1+1).toEqual(3);
            });
        });
        
        describe("Another Suite", function() {
            it("Should pass this test as well.", function() {
                expect(0).toEqual(0);
            });
        });


jasmine.getEnv().addReporter(new jasmine.ConsoleReporter(console.log));
//jasmine.getEnv().addReporter(new jasmine.TrivialReporter());

jasmine.getEnv().execute();  


// //loadSubScript( self.data.url( 'platform/firefox/temp-boot.js' ) );
// loadSubScript( self.data.url( 'boot.js' ) );
// console.log('boot.js loaded?');

