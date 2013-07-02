define(function() {
	var nativeFilter = 	Array.prototype.filter,
		nativeForEach = Array.prototype.forEach,
		nativeBind = 	Function.prototype.bind,
		slice = 		Array.prototype.slice,
		toString = 		Object.prototype.toString,
		ctor = 			function () {}, // Reusable constructor function for function prototype setting.
		breaker = 		{};

	var functional = {
		//compares two objects and returns an object only outlining the differences between the two
		changes: function( new_obj, old_obj ) {			
			var changes = {
				new_values: {},
				old_values: {}
			};
			//iterate through new values
			for ( var k in new_obj ) {
				if ( new_obj[ k ] !== old_obj[ k ] ) {
					changes.new_values[ k ] = new_obj[ k ];
					if ( typeof old_obj[ k ] !== 'undefined' ) {
						changes.old_values[ k ] = old_obj[ k ];
					}
				}
			}
			//then pass over old values
			for ( var k in old_obj ) {
				//check that we haven't made this comparison already
				if ( changes.new_values[ k ] ) continue;
				if ( old_obj[ k ] !== new_obj[ k ] && typeof old_obj[ k ] !== 'undefined' ) {
					changes.old_values[ k ] = old_obj[ k ];
				}
			}
			//console.log('functional.changes', new_obj, old_obj, changes );
			return changes;
		},

		// Create a function bound to a given object (assigning `this`, and arguments,
		// optionally). Binding with arguments is also known as `curry`.
		// Delegates to **ECMAScript 5**'s native `Function.bind` if available.
		// We check for `func.bind` first, to fail fast when `func` is undefined.
		bind: function ( func, context ) {
			var bound, args;
			if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
			if (!functional.isFunction(func)) throw new TypeError;
			args = slice.call(arguments, 2);
			return bound = function() {
				if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
				ctor.prototype = func.prototype;
				var self = new ctor;
				var result = func.apply(self, args.concat(slice.call(arguments)));
				if (Object(result) === result) return result;
				return self;
			};
		},

		// Delays a function for the given number of milliseconds, and then calls
		// it with the arguments supplied.
		// Ripped from underscore
		delay: function(func, wait) {
			var args = Array.prototype.slice.call(arguments, 2);
			return setTimeout(function(){ return func.apply(null, args); }, wait);
		},

		//implementation of underscores debounce:
		// Returns a function, that, as long as it continues to be invoked, will not
		// be triggered. The function will be called after it stops being called for
		// N milliseconds. If `immediate` is passed, trigger the function on the
		// leading edge, instead of the trailing.
		debounce: function( func, wait, immediate ) {
			var timeout, result;
			return function () {
				var context = this, args = arguments;
				var later = function () {
					timeout = null;
					if ( !immediate ) result = func.apply(context, args);
				};
				var callNow = immediate && !timeout;
				clearTimeout( timeout );
				timeout = setTimeout( later, wait );
				if ( callNow ) result = func.apply( context, args );
				return result;
			};
		},

		//implementation of underscore's throttle method
		// Returns a function, that, when invoked, will only be triggered at most once
		// during a given window of time.
		throttle: function ( func, wait ) {
			var context, args, timeout, throttling, more, result;
			var whenDone = functional.debounce(function(){ more = throttling = false; }, wait);
			return function () {
				context = this; args = arguments;
				var later = function () {
					timeout = null;
					if ( more ) {
						result = func.apply( context, args );
					}
					whenDone();
				};
				if ( !timeout ) timeout = setTimeout( later, wait );
				if ( throttling ) {
					more = true;
				} 
				else {
					throttling = true;
					result = func.apply( context, args );
				}
				whenDone();
				return result;
			};
		},

		each: function(obj, iterator, context) {
			if (nativeForEach && obj.forEach === nativeForEach) {
				obj.forEach(iterator, context);
			} 
			else if (obj.length === +obj.length) {
				for (var i = 0, l = obj.length; i < l; i++) {
					if (iterator.call(context, obj[i], i, obj) === breaker) 
						return;
				}
			} 
			else {
				for (var key in obj) {
					if (this.has(obj, key)) {
						if (iterator.call(context, obj[key], key, obj) === breaker) 
							return;
					}
				}
			}
		},

		filter: function(obj, iterator, context) {
			var results = [];
			if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
			this.each(obj, function(value, index, list) {
				if (iterator.call(context, value, index, list)) results[results.length] = value;
			});
			return results;
		},

		// Shortcut function for checking if an object has a given property directly
		// on itself (in other words, not on a prototype).
		has: function(obj, key) {
			//return obj.hasOwnProperty.call(key);
			return obj.hasOwnProperty(key);
		},

		// json-stringify to json parse returns new copy of object, as long as it 
		// has no functions
		clone: function( inp ){
			if( typeof inp === 'undefined' )
				return undefined;
			return JSON.parse( JSON.stringify( inp ) );
		},

		// extend new object upon old object.
		// changes original object
		// usage: this.extend( originalObject, newObject )
		extend: function( o, n ){
			for( var k in n )
				o[ k ] = n[ k ];
			return o;
		},

		//turns a string into an array for iterative-based functions
		makeArray: function( inp ){
			inp = Array.isArray( inp ) ? inp : [ inp ];
			return inp;
		}

	};

	// Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
	functional.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
		functional['is' + name] = function(obj) {
			return toString.call(obj) == '[object ' + name + ']';
		};
	});

	return functional;
});
