(function(){

    //app view holds logic and events for the search bar,
    //suggestions, and main buttons

    define([
        'require',
        'handlebars',
        'backbone',
        'sandbox_helpers',
        'config'
    ], function (require, Handlebars) {
        var config = require('config'),
            _bt = require('sandbox_helpers'),
            Tabs;

        //app constructor
        var AppView = Backbone.View.extend({
            
            el: 'body',

            events: {
                'click .js-toggle-expandable': 'toggle_expandable',
                'click .js-open-dialog':       'open_dialog',
                'click .js-link-search':       'link_search',
                'click .js-genre-search':      'link_genre_search',
                'click .js-toggle-menu':       'toggle_menu',
                'click .js-open-tab':          'open_tab',
                'click .js-menu-action':       'on_menu_action_click'
            },

            initialize: function ( opts ) {
                //tap into sandboxed tabs module to open tabs
                Tabs = _sandbox.tabs;
                Tabs.init();

                this.app = opts.app;

                //set the menu actions object
                this.menu_actions = {
                    clear_completed_downloads: _.bind( this.on_clear_completed_downloads, this )
                };

                this.bind_events();
                this.render();

                console.log('initialize popup app view', typeof $, typeof _, this, arguments);
            
            },

            bind_events: function () {
                this.el.addEventListener('keydown', _.bind( this.on_key_up_down, this) );
                this.el.addEventListener('keyup', _.bind( this.on_key_up_down, this) );

                this.el.addEventListener('mouseover', _.bind( this.on_mouseover, this ) );
                this.el.addEventListener('mouseout', _.bind( this.on_mouseout, this ) );
            },

            on_menu_action_click: function( e ){
                var me = $(e.currentTarget), 
                    action = me.data().action;

                this.menu_actions[ action ]();

                _bt.track( 'menu', 'click', action, null );
            },

            on_clear_completed_downloads: function(){
                console.error('on_clear_completed_downloads');

                _.each( this.app.views.torrents.torrent_views, function( view, id ){
                    if( view.$el.hasClass('completed') )
                        view.$el.find('.remove').trigger('click');
                });
            },

            on_key_up_down: function( e ) {
                this.app._metaKey_down =    e.metaKey;
                this.app._ctrlKey_down =    e.ctrlKey;
                this.app._shiftKey_down =   e.shiftKey;
                // console.log( e.which, e.metaKey, e.ctrlKey, e.shiftKey );

                //  META/CTRL AND SHIFT KEYS DOWN
                if ( ( this.app._metaKey_down || this.app._ctrlKey_down ) && this.app._shiftKey_down ) {
                    if ( e.which === 85 ) {
                        _sandbox.extension_tabs.open({
                            name: 'popup'
                            // foo: 'bar',
                            // baz: [ 1, 2, 3, [4, 5, 6] ]
                        });
                    } else if ( e.which === 220 ) {
                        this.app.torque_settings.open_webui();
                    }
                }
            },

            open_dialog: function ( e ) {
                e.preventDefault();
                var me = $(e.currentTarget),
                    dialog = me.data('dialog');

                console.log('js open dialog', dialog );
                this.app.views.dialogs.open( dialog );
            },

            toggle_expandable: function ( e ) {
                e.preventDefault();
                var me = $(e.currentTarget);
                console.log( 'toggle expandable', me );
                me.closest('.expandable').toggleClass('open');
                this.app.trigger('render');
            },

            toggle_menu: function ( e ) {
                e.preventDefault()
                var that = this,
                    me = $(e.currentTarget),
                    menu = me.siblings('.menu'),
                    action = 'hide';

                console.error('toggle menu');

                if( menu.hasClass('hidden') ) {
                    action = 'show';

                    $('body').one('click', function(e) {
                        that.hide_menu(menu)
                    });
                }

                menu.toggleClass('hidden')

                //interaction analytics
                _bt.track(
                    'menu',
                    action, //hide or show
                    me.parent().attr('id'), //some reference to which menu it was
                    null
                );
            },

            hide_menu: function ( el ) {
                $(el).addClass('hidden')
            },

            open_tab: function ( e ) {
                e.preventDefault()
                var me = $(e.currentTarget),
                    url = me.attr('href');

                if ( this.app._ctrlKey_down || this.app._metaKey_down ) {
                    Tabs.open( url, false, false );
                } else {
                    Tabs.open( url, true, true );
                }
                // //opens a tab, current says open it in the currently open tab,
                // //false for a new tab
                // //active says make newly opened tab active if not current
                // open = function ( url, current, active ) {
            },

            link_search: function ( e ) {
                e.preventDefault();
                var me = $(e.currentTarget),
                    suggestion = me.data('suggestion');

                $('#search_text').val( suggestion );

                //interaction analytics
                //see if this is the suggestion view
                var sugg = me.closest('.suggestion');
                if ( sugg.length && sugg.hasClass('recommendation') ) {
                    //spell check and recommendation share the same view.
                    //we add a recommendation class to it if it is a btfc recommendation
                    _bt.track('recommendation', 'name_click', null, null )
                } else {
                    _bt.track(
                        'menu',
                        'link_search', //hide or show
                        //label is a reference to which menu/link type it was
                        ( !sugg.length ?
                            //not a suggestion 
                            'search_history' :
                            'spell_check'
                        ),
                        null
                    );
                }

                //this.app.views.search.setSpellSuggestion(null)

                this.app.views.toolbar.submit_search( true );
            },

            link_genre_search: function ( e ) {
                e.preventDefault();
                var me = $(e.currentTarget),
                    type = me.data('type')

                $('#search_text').val( type )

                _bt.track('recommendation', 'genre_click', null, null )
                // _bt.track('recommendation', 'genre_click', type, null )

           //      //interaction analytics
           //      _bt.track(
           //          'menu',
           //          'genre_search', //hide or show
                    // null, //can we set this to the genre itself?
           //          null
           //      );

                this.app.views.toolbar.submit_search( true )
            },

            find_tip: function( el, max_travel ) {

                var i = 0,
                check_el = function() {
                    i++;

                    if( this.dataset.tip ){
                        return {
                            el: this,
                            tip: this.dataset.tip
                        };
                    } else if ( i <= max_travel && this.parentElement ) {
                        return check_el.call( this.parentElement );
                    } else {
                        return false;
                    }
                };

                return check_el.call( el );
            },

            on_mouseover: function( e ) {
                //console.error('on over', e, $(e.target), $(e.srcElement), $(e.currentTarget) );
                var found = this.find_tip( e.target, 5 ); //number is how many parent nodes up to check for tip
                //console.log( 'found', found );
                if (found)
                    this.app.trigger('tip:show', found.tip, $(found.el).offset(), e);
            },

            on_mouseout: function( e ) {
                //console.log('body hover off', e.target.dataset.tip, e);
                this.app.trigger('tip:hide');
            },

            render: function () {
                var html = Handlebars.templates.app();
                this.$el.html( html );
                this.app.trigger('render');

            }
        });

        //HANDLEBARS HELPERS
        _.each({
            root: function () {
                //weird data path issues need to be resolved before deployment
                return _config.data_path + 'app/';
                //return config.data_path + 'app/';
            }
        }, function ( fn, name ) {
            //register the helper for use in handlebars templates
            Handlebars.registerHelper( name, fn );
        });

    
        return AppView;
    });

})();