console.log('hello temp boot');

/*jshint white:false, camelcase:false */
// Bt.require.config({
// 	baseUrl: '/src'
// });

//try{
	// Bt.require([
	// 	'require',
	// 	'./config',
	// 	'./platform/browser',
	// 	'./platform/events'
	// ], function ( require ) {
		
	// 	

	// 	console.log('boot loaded in the actual file?');

	// });

	// var nativeRequire = require;

	// Bt.require([
	// 	'require'
	// ], function ( require ) {
		
	// 	console.log('boot loaded in the actual file?', typeof require, require );

	// });


// } catch ( err ) {
// 	throw err.stack;
// }


(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /*jshint strict: false*/

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function") {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    // } else {
    //     Q = definition();
    }

})(function(){

	

	var config = require( _PATH + 'config.js');

	console.log('boot loaded in the actual file?', config, typeof require, require );

});