(function(){

	define([
		'require',
		'backbone',
		'handlebars',
		'dialog.view',
		'config',
		'timeago',
		'sandbox_helpers'
	], function (require) {
		//required components
		var Dialog = require('dialog.view'),
			_bt = require('sandbox_helpers'),
			config = require('config'),
			Dialogs;

		//app constructor
		var View = Dialog.extend({
			
            id: 'notifications',

		    action_pre: 'on_',
		    min_priority: 75, //minimum priority of notification to trigger auto open

		    events: {
		        'click .list li a': "on_action_click",
                'click #notifications .cancel': 'on_cancel'
		    },

			initialize: function ( opts ) {
                Dialog.prototype.initialize.apply( this, arguments );

                //set an alias for dialogs view
                Dialogs = this.dialogs;

                this.bind_events();
				//this.render();

				console.log('initialize notifications dialog view');

				this.on_auto_open = _.defer( _.bind( this.on_auto_open, this ));

				var _this = this;
				_.defer(function () {
					_this.collection.trigger('reset');
				});
			
			},

			bind_events: function () {
		        //this.collection.on('reset', this.render, this);
		        this.collection.on('auto_open', this.on_auto_open, this);
			},

            //this open function overrides the Dialog view base class's open function
            open: function () {
                //call base class open, cause it has been overridden
                Dialog.prototype.open.apply( this, arguments );
                //resolve all the notifications
                this.collection.resolve_all( true ); //true denotes silent
            },

            on_cancel: function () {
                console.error('notifications dialog cancel');
                this.collection.resolve_all( false );
                this.cancel();
            },

		    on_action_click: function( e, triggered ){
		        //console.log('on action click', this, $(this), e );

		        //action based on data-type and data-data on anchor element
		        var a_data = $(e.currentTarget).data(),
		        	//look for matching type function, prefixed with 'action_'
		        	fn_str = this.get_method( a_data.type );

                console.log('on action click', a_data, fn_str, $(e.target), e );

		        //error if handler doesn't exist
		        if ( !_.isFunction( this[ fn_str ]  ) ){
		            console.error('handler does not exist:', fn_str );
		            _bt.track('notification', 'click', a_data.type, 0); //0 denotes function did not exist to call
		        } else {
		            _bt.track('notification', 'click', a_data.type, 1); //1 denotes function existed to call
		            this[ fn_str ]( a_data.data, a_data.id );
		            
                    //this function is also called by the alert view, 
                    //so when we do that we pass in a boolean so that we
                    //don't prematurely resolve all the notifications
                    if ( !triggered ) {
                        this.collection.resolve_all( false );
                    }
                }
		    },

		    //automatically opens a dialog for notifications with a priority higher than certain number
		    //  this is a handler for an event that is triggered in the collection on reset
		    on_auto_open: function () {
		        var model = this.collection.highest_priority;
		        
		        if( !model ) return false;

		        //check if the priority is higher than the minimum priority to open the dialog
		        if( model.get('priority') < this.min_priority )
		            return;

		        var type = model.get('type');

		        // if( type !== config.app.notifications.SEARCH_SITE_DISCOVERED ){
		        // 	console.warn('AUTO OPEN NOT DISCOVERED', Dialogs.current, Dialogs)
		        //     // if( this.app.collections.sites.detected ) {
		        //     if( Dialogs.current === 'add_sites' ) {
		        //     	Dialogs.close();
		        //     }
		        // }

		        //var fn_str = this.get_method( a_data.type );
		        this[ this.get_method( type ) ]( model.get('data'), model.id );
		    },

		    on_search_site_discovered: function( data, id ){
		        var that = this;
		        //sanity check that there are sites left in detected.
		        //there can be a notification auto_open triggered right before 
		        //the last site in the detected array is removed.  This
		        //opens up an empty dialog... and for some reason doesn't hide the main ui.
	        	if ( that.app.collections.sites.detected.length ) {
			        Dialogs.open('add_sites', data, id);
			    }
		    },

		    on_search_site_declined: function( data, id ){
		        var _this = this;

		        Dialogs.open('site_manager', data, id);
                setTimeout( function() {
                    Dialogs.get('site_manager').focus( id );
                }, 0 );
                //this.app.views.sites.tabs.declined.trigger('click');  
		        // if( data.length ){
		        //     _.each( data, function(el){
		        //         _this.app.views.sites.focus( el.id );
		        //     });
		        // }
		    },

		    on_search_site_added: function( data, id ){
		        var _this = this;
		        //console.log('on_search_site_added action click', data, id);
		        
                Dialogs.open('site_manager', data, id);
                setTimeout( function() {
                    Dialogs.get('site_manager').focus( id );
                }, 0 );
		    },

            on_association: function () {
                //console.log('on association auto open!', arguments, !Dialogs.is_onboarding );
                if ( !Dialogs.is_onboarding ){
                    Dialogs.open('association');
                }
            },

		    on_pairing_requested: function( data, id ){
		        Dialogs.open('authorize-pairing', data, id);
		    },

		    on_client_authorized: function( data, id ){
		        console.warn('on_client_authorized does nothing');
		    },

		    on_download_complete: function( data, id ){
		        //this.focus_torrents( 'completed', data );
                var _this = this;
		        this.app.views.dialogs.close();
                setTimeout( function () {
                    _this.app.collections.torrents.trigger( 'focus', data );
                }, 0 );
            },

		    on_download_started: function( data, id ){
		        var _this = this;
                //this.focus_torrents( 'downloading', data );
		        this.app.views.dialogs.close();
                setTimeout( function () {
                    this.app.collections.torrents.trigger( 'focus', data );
                }, 0 );		    },

		    //returns string for associated on_*notification_type*
		    get_method: function( type ){
		        return this.action_pre + type;
		    },

			render: function () {
                console.log('notifications render');
				var html = Handlebars.templates.notifications_dialog({ notifications: this.collection.toJSON() });
				this.$dialog.html( html );
				$("time.timeago").timeago();
				this.app.trigger('render');
			}
		});

    	//HANDLEBARS HELPERS
	    _.each({
	        notification_icon: function(notification){
	            //console.error('icon helper', this, notification);
	            var img = ( this.img ? '<img class="icon16" src="'+ this.img +'" />' : '' ),
	                grouped = ( this.data && this.data.length && this.data.length > 1 ? ' grouped' : '');

	            return new Handlebars.SafeString( '<span class="type '+ this.type + grouped + '">'+ img +'</span>' );
	        },

	        notification_link: function(notification){
	            var title = _bt.getNotificationTip( this.data );

	            var block = '<span class="event">' +
	                            '<a data-id=\''+this.id+'\' data-type=\''+ this.type +'\' data-resolved=\''+ this.resolved +'\' data-data=\''+ JSON.stringify( this.data ) +'\' data-tip=\''+ title +'\'>'+ this.name + ' ' + this.action +': '+title+'</a>' +
	                        '</span>';

	            return new Handlebars.SafeString( block );
	        },
	        notification_time: function(notification){
	            var block = '<span class="time">' +
	                            this.timestamp +
	                        '</span>';

	            return new Handlebars.SafeString( block );
	        },
	        iso_date: function(timestamp) {
	            var date = JSON.parse(JSON.stringify(new Date(timestamp * 1000)))
	            return date.replace('.000Z', 'Z')
	        },
	        resolved_class: function( notification ){
	            return ( this.seen ? 'resolved' : 'unresolved' );
	        }
   	    }, function ( fn, name ) {
	    	//register the helper for use in handlebars templates
	    	Handlebars.registerHelper( name, fn );
	    });

		return View;
	});

})();

