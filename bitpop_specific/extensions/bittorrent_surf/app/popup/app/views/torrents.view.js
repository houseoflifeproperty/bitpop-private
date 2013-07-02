(function(){

    //app view holds logic and events for the search bar,
    //suggestions, and main buttons

    define([
        'require',
        'handlebars',
        'backbone',
        'sandbox_helpers',
        'alert.view',
        'torrent.view',
        'config'
    ], function (require, Handlebars) {
        var _bt = require('sandbox_helpers'),
            Torrent_View = require('torrent.view'),
            Alert_View = require('alert.view'),
            config = require('config');
        
        //app constructor
        var Torrents = Backbone.View.extend({
            el: '#torrent_content',

            $torrents: null, //set in init after template rendering

            torrent_views: {}, //holds instantiated views for individual torrents

            alert: null, //set in init, holds alert view

            initialize: function( opts ){
                var _this = this;

                this.app = opts.app;
                delete opts.app;
                //this.collection = new Bt.Collections.Torrents();

                //create the static elements
                this.$el.html( Handlebars.templates.torrents() );

                this.$torrents = this.$el.find('#torrents');

                this.app.trigger('render');

                //make an alert view
                this.alert = new Alert_View({
                    el: '#torrent_content .alert_container',
                    types: [
                        config.app.notifications.DOWNLOAD_COMPLETE,
                        config.app.notifications.DOWNLOAD_FAILED,
                        config.app.notifications.DOWNLOAD_STARTED
                    ],
                    app: this.app
                });

                console.error('initialize torrents view');

                this.bind_events();

                _.defer(function () {
                    _this.collection.trigger('reset');
                });
            },

            bind_events: function(){
                this.collection.on( 'reset',  this.on_reset,  this );
                this.collection.on( 'add',    this.on_add,    this );
                this.collection.on( 'remove', this.on_remove, this );

                //change will be handled in the torrent view
                this.collection.on('change', this.render, this);

                this.collection.on('focus', this.on_focus, this);

                this.app.on('dialog:close', this.clear_focus, this );

            },

            on_remove: function( model ){
                var view = this.torrent_views[ model.id ];
                if( view ){
                    view.destroy();
                } else {
                    console.error('NO TORRENT VIEW TO DESTROY', model, view, this.collection, this);
                }

                this.render();
                this.app.trigger('render');
            },

            focus_timeout: null,
            focus_timeout_time: 5000,

            on_focus: function( data, timeout ) {
                console.error('ON FOCUS', data, timeout );

                if( this.focus_timeout )
                    clearTimeout( this.focusTimeout );

                var top = 10000000;
                //make sure data is iterable
                data = _bt.makeArray( data );
                //iterate over the torrents
                _.each( data, 
                    _.bind( function( el ){
                        //sometimes that hash string is wrapped in quotes.  get rid of them.
                        hash = el.id.replace('"', '').replace('"', '');
                        //focus the torrent.  function returns it's $el
                        var $view_el = this.focus( hash ),
                            //get the position.  #torrents is now position: relative ( or should be, if it's not )
                            pos = $view_el.position();
                        //we want to focus on the first one to come into view
                        if( pos.top < top ) top = pos.top;
                    }, this) 
                );

                //scroll the torrents container to the usable position
                this.$torrents.scrollTop( top );

                if ( timeout )
                    this.focus_timeout = setTimeout( _.bind( function(){
                        this.clear_focus();
                    }, this), this.focus_timeout_time );
            },

            focus_torrents: function( data ) {
                var top = 10000000;
                //make sure data is iterable
                data = _bt.makeArray( data );
                //iterate over the torrents
                _.each( data, 
                    _.bind( function( el ){
                        //sometimes that hash string is wrapped in quotes.  get rid of them.
                        hash = el.id.replace('"', '').replace('"', '');
                        //focus the torrent.  function returns it's $el
                        var $view_el = this.focus( hash ),
                            //get the position.  #torrents is now position: relative ( or should be, if it's not )
                            pos = $view_el.position();
                        //we want to focus on the first one to come into view
                        if( pos.top < top ) top = pos.top;
                    }, this) 
                );

                //scroll the torrents container to the usable position
                this.$torrents.scrollTop( top );
            },

            focus: function( id ){
                //console.error('focus', id, this.torrent_views);
                var view = this.torrent_views[ id ].$el;
                view.addClass('focused');
                return view;
            },

            clear_focus: function(){
                _.each( this.torrent_views, function( view ){
                    view.$el.removeClass('focused');
                });
            },

            on_add: function( model ){
                //console.log('torrent collection ADD', model, collection);
                console.log('torrent collection ADD', model.id);

                this.torrent_views[ model.id ] = new Torrent_View({ model: model, torrents: this });
                
                this.render();

                this.app.trigger('render');

            },

            on_reset: function(){
                var _this = this;

                console.log('torrents view collection reset', arguments );

                //unbind and destroy all individual torrent views
                for ( var k in this.torrent_views ){
                    this.torrent_views[ k ].destroy();
                    delete this.torrent_views[ k ];
                }

                // this.toggle_empty( !this.collection.length );

                //create a view for each torrent in the collection
                this.collection.each( this.on_add, this );
                
                this.render();

                this.app.trigger('render');
            },

            toggle_empty: function ( show_as_empty ) {
                if ( ! show_as_empty ) {
                    $('#torrent_content .message').addClass('hidden');
                    this.$torrents.removeClass('hidden');
                } else {
                    $('#torrent_content .message').removeClass('hidden')
                    this.$torrents.addClass('hidden');
                }
            },

            render: function(){
                // $('#torrent_content .message').addClass('hidden')
                //console.warn('render torrents view app', this.app, $('#torrent_content').attr('class'))

                // this.toggle_empty( !this.$torrents.children().length );
                this.toggle_empty( !this.collection.length );

                // if ( this.$torrents.children().length > 0) {
                //     $('#torrent_content .message').addClass('hidden');
                //     this.$torrents.removeClass('hidden');
                // } else {
                //     $('#torrent_content .message').removeClass('hidden')
                //     this.$torrents.addClass('hidden');
                // }

            }
        });
    
        return Torrents;
    });

})();
