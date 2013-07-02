//_sandbox.observer.load('search');

(function(){

	define([
		'require',
		'backbone',
		'config',
		'notification.model'
	], function (require) {
		//required components
		var Notification = require('notification.model'),
			config = require('config');

		//app constructor
		var Notifications = Backbone.Collection.extend({
			
			model: Notification,

			current_url: '',

			highest_priority: null,
			newest: null,

			observer: null, //set in init when global _sandbox is ready

			_raw_unresolved_length: 0,
			_min_priority: 50, //min priority used to show a number badge for notification

			//array of arrays that gets turned into obj/dict.  first el is key, second is value
			// icons: [
			// 	[ config.app.notifications.SEARCH_SITE_DISCOVERED, 'icon_search_add.png'],
			// 	[ config.app.notifications.SEARCH_SITE_ADDED, 'icon_search_add.png'],
			// 	[ config.app.notifications.SEARCH_SITE_DECLINED, 'icon_minus_w.png'],
			// 	[ config.app.notifications.SEARCH_SITE_ADD_FAIL, 'icon_notification_alert.png'],
			// 	[ config.app.notifications.ATTEMPT_ADD_SITE, 'icon_searching.gif'],
			// 	[ config.app.notifications.DOWNLOAD_FAILED, 'icon_notification_alert.png'],
			// 	[ config.app.notifications.DOWNLOAD_COMPLETE, 'icon_check_w.png'],
			// 	[ config.app.notifications.CLIP, 'icon_check_w.png'],
			// 	[ config.app.notifications.DOWNLOAD_STARTED, 'icon_plus_w.png']
			// ],

			initialize: function ( data, opts ) {
				this.app = opts.app;
				this.observer = _sandbox.observer.load('notifications');

				//debounce auto open
				//this.auto_open = _.debounce( _.bind( this.auto_open, this ), 200 );

				//this.set_default_icons();
				this.bind_events();

				//trigger ext to send notifications
				this.observer.trigger('load');

				console.log('init notifications collection');
				//Bt.msg.send( Bt.events.GET_SITES, {});
			},

			bind_events: function(){
				this.on( 'reset', this.auto_open, this );
				this.observer.on( 'reset', _.bind( this.process, this ) );
				this.observer.on( 'url', _.bind( this.set_current_url, this ) );
			},

			//bound to collection's reset event.
			// processes notifications for the highest priority unresolved notification
			auto_open: function( collection ){
				//console.log('notification.collection auto_open')
				var unresolved = this.where({ resolved: false }),
					newest = _.sortBy( unresolved, function ( el ) { 
						//bitwise NOT ( ~ ) works like this: 
						// 	~foo === -( foo + 1 )
						//it's fast and it works perfectly for sorting 
						//big numbers ( like a timestamp ) in reverse
						return ~el.get('timestamp')
					}),
					priority = _.sortBy( unresolved, function ( el ) {
						//bitwise NOT ( ~ ) works like this: 
						// 	~foo === -( foo + 1 )
						//it's fast and it works perfectly for sorting 
						//big numbers ( like a timestamp ) in reverse
						return ~el.get('priority');
					});

				console.warn('notification.collection auto_open', priority.length, newest.length, priority , this.toJSON() );

				this.highest_priority = priority.length ? priority[0] : null;
				this.newest = newest.length ? newest[0] : null;
				this.trigger('auto_open');
			},

			//compare a models url to the current notifications url
		    current_url_in_sites_model: function( model ){
		        var urls = _.map( model.get('data'), function( el ){
		            return el.url;
		        });
		        //console.error('current urls?!?!?', urls);
		        return _.include( urls, this.current_url );
		    },

			//callback for observer 'url'
			set_current_url: function ( url ) {
				this.current_url = url;
			},

			// //convert icons array to object
			// set_default_icons: function(){
			// 	var obj = {};
			// 	_.each( this.icons, function( el ){
			// 		obj[ el[0] ] = el[1];
			// 	});
			// 	this.icons = obj;
			// },

			// get_img: function( type ){
			// 	console.error('get_img', type);
			// 	return '/app/img/' + this.icons[ type ];
			// },

			resolve_all: function( silent ){
		        console.warn('notifications.collection.resolve_all, silent: ', !!silent );

		        //trigger resolve, arg1 = type, arg2 = silent
		        //type:null resolves all
		        //if silent is false, it sets seen to true in the notifications view
		        this.observer.trigger('resolve', null, !!silent );
			},

			//callback for observer 'reset'
			process: function ( data ) {
				console.log('notifications process, # of notifications: ', data.length );
				var _this = this;
				//reset raw unresolved length
				this._raw_unresolved_length = 0;
				//loop through them to set the raw unresolved length
		        _.each( data, function(el){
		        	if( !el.resolved && el.priority >= _this._min_priority ) {
		        		_this._raw_unresolved_length++;
		        	}
		        });
				this.reset( data );
			},

			//auto sorts the notifications as they come in
			comparator: function( a, b ){
				//console.error('comparing', a, b, a.get('type'), a.get('priority'), b.get('type'), b.get('priority') );

				// var resolved_a = a.get('resolved'),
				// 	resolved_b = b.get('resolved')

				// //not resolved go higher
				// if( resolved_a && !resolved_b ) {
				// 	return 1;
				// } else if ( resolved_b && !resolved_a ) {
				// 	return -1;
				// }

				// //if same, then sort by priority
				// var priority_a = a.get('priority'),
				// 	priority_b = b.get('priority');

				// if ( priority_a !== priority_b ){
				// 	return priority_b - priority_a;
				// } else {
					//last, if priority is same, sort by timestamp
					var time_a = a.get('timestamp'),
						time_b = b.get('timestamp');

					return time_b - time_a;
				// }

			}
		});

		return Notifications;
	});

})();