//helpers to be run in an environment where window and document surely exist.  i.e. NOT IN THE CORE
define([
	'require',
	'underscore',
	'helpers/functional',
	'helpers/torrent',
	'helpers/string',
	'helpers/time',
	'helpers/gui',
	'helpers/url'
], function () {

	var helpers = {};

	_.extend( helpers, require('helpers/functional') );
	_.extend( helpers, require('helpers/torrent') );
	_.extend( helpers, require('helpers/string') );
	_.extend( helpers, require('helpers/time') );
	_.extend( helpers, require('helpers/gui') );
	_.extend( helpers, require('helpers/url') );
	
	//the track function needs to init the bench observer if it has not already been inited
	var bench_observer = null,
		init_bench_observer = function () {
			bench_observer = _sandbox.observer.load('bench');
		};

	_.extend( helpers, {
		get_name: function () {
			return document.title.toLowerCase();
		},

		//track helper function to be used with bench module
		//very simple function to call on_track in bench module, wherever it may live.
		//auto inits the observer if the worker needs to track something.
		track: function ( category, action, label, value ) {
			//init the bench observer if it hasn't yet been inited
			if ( !bench_observer ) { init_bench_observer(); }
			console.error('sandbox_helper TRACK IS noop', category, action, label, value );
			bench_observer.trigger('track', category, action, label, value);
		}
	});

	return helpers;
});
