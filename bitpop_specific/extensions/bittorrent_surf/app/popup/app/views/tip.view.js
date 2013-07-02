(function(){

	define([
		'require',
		'backbone'
	], function (require) {
		//required components

		//app constructor
		var Tip = Backbone.View.extend({
				el: '#tooltip',

				events: {
					//'click' : 'on_click'
				},

				initialize: function( opts ){
					this.app = opts.app;
					delete opts.app;
					this.bind_events();

					console.log('init tooltip view');
				},

				bind_events: function(){
					this.app.on('tip:show', this.on_tip_show, this);
					this.app.on('tip:hide', this.on_tip_hide, this);
				},

				position: function( pos ){
					var body_w = this.app.views.app.$el.outerWidth(),
						body_h = this.app.views.app.$el.outerHeight(),
						tt_w = this.$el.outerWidth(),
						tt_h = this.$el.outerHeight(),
						adj_w = 16,
						adj_h = 24,
						top = 0,
						left = 0;

					//console.log( 'w', pos.left, tt_w, body_w );
					//console.log( 'h', pos.top, tt_h, body_h );

					//calculate left
					if ( pos.left + tt_w + adj_w < body_w ) {
						left = pos.left + adj_w;
					} else {
						left = pos.left - tt_w + adj_w;
					}

					//calculate top
					if ( pos.top + tt_h + adj_h < body_h ) {
						top = pos.top + adj_h;
					} else {
						top = pos.top - tt_h;
					}

					this.$el.css({
						top: top,
						left: left
					});
				},

				timeout: null,
				delay_time: 500,
				is_showing: false,

				on_tip_show: function( text, pos, evt ) {
					//console.log( 'tip:show', text, { el: el }, evt );

					clearTimeout( this.timeout );

					this.timeout = setTimeout(
						_.bind( function(){
							this.$el.html( text );

							this.position( pos );

							this.$el.show();

							this.is_showing = true;
						}, this ), 
					
						this.delay_time
					);

				},

				on_tip_hide: function() {
					//console.log( 'tip:hide');
					if ( this.timeout )
						clearTimeout( this.timeout );
					if( this.is_showing )
						this.$el.hide().css({ top: 0, left: 0 });
				},

				render: function(){

				}
		});

		return Tip;
	});

})();

/*
var Bt = Bt || {};
	Bt.Views = Bt.Views || {};

Bt.Views.Tip = Backbone.View.extend({
	el: '#tooltip',

	events: {
		//'click' : 'on_click'
	},

	initialize: function( opts ){
		this.app = opts.app;
		delete opts.app;
		this.bind_events();
		this.bind_messages();

		console.log('init alert view');
	},

	bind_events: function(){
		this.app.on('tip:show', this.on_tip_show, this);
		this.app.on('tip:hide', this.on_tip_hide, this);
	},

	bind_messages: function(){},

	position: function( pos ){
		var body_w = this.app.views.app.$el.outerWidth(),
			body_h = this.app.views.app.$el.outerHeight(),
			tt_w = this.$el.outerWidth(),
			tt_h = this.$el.outerHeight(),
			adj_w = 16,
			adj_h = 24,
			top = 0,
			left = 0;

		//console.log( 'w', pos.left, tt_w, body_w );
		//console.log( 'h', pos.top, tt_h, body_h );

		//calculate left
		if ( pos.left + tt_w + adj_w < body_w ) {
			left = pos.left + adj_w;
		} else {
			left = pos.left - tt_w + adj_w;
		}

		//calculate top
		if ( pos.top + tt_h + adj_h < body_h ) {
			top = pos.top + adj_h;
		} else {
			top = pos.top - tt_h;
		}

		this.$el.css({
			top: top,
			left: left
		});
	},

	timeout: null,
	delay_time: 500,
	is_showing: false,

	on_tip_show: function( text, pos, evt ) {
		//console.log( 'tip:show', text, { el: el }, evt );

		clearTimeout( this.timeout );

		this.timeout = setTimeout(
			_.bind( function(){
				this.$el.html( text );

				this.position( pos );

				this.$el.show();

				this.is_showing = true;
			}, this ), 
		
			this.delay_time
		);

	},

	on_tip_hide: function() {
		//console.log( 'tip:hide');
		if ( this.timeout )
			clearTimeout( this.timeout );
		if( this.is_showing )
			this.$el.hide().css({ top: 0, left: 0 });
	},

	render: function(){

	}
});

(function(){
    //HANDLEBARS HELPERS
    var handlebar_helpers = {
        // alert_icon: function(notification){
        //     console.log('icon helper', this, notification);

        //     var img = ( this.img ? '<img src="'+ this.img +'" />' : '' ),
        //     	grouped = ( this.data && this.data.length && this.data.length > 1 ? ' grouped' : '');

        //     return new Handlebars.SafeString( '<span class="icon icon24 '+ this.type + grouped + '"><span class="line"></span>'+ img +'</span>' );
        // },
        // alert_text: function(notification){
        //     var block = '<span class="text">' +
        //                     Bt.Helpers.capitalize( this.action ) + ' ' + this.name.toLowerCase() +
        //                 '</span>';

        //     return new Handlebars.SafeString( block );
        // },
        // alert_title: function(notification){
        // 	return new Handlebars.SafeString( Bt.Helpers.getNotificationTip( this.data ) );
        // }

    };

    for ( var name in handlebar_helpers ){
        Handlebars.registerHelper( name, handlebar_helpers[ name ]);
    }
    
})();
*/