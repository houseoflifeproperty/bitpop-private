(function(){

    //app view holds logic and events for the search bar,
    //suggestions, and main buttons

    define([
        'require',
        'handlebars',
        'backbone',
        'sandbox_helpers'
        //'config'
    ], function (require, Handlebars) {
        var _bt = require('sandbox_helpers');
        //var config = require('config');

        //app constructor
        var Toolbar = Backbone.View.extend({
            
            el: '#toolbar',

            $search_button: null, //set after render in init

            search_history: [],

            $search_history: null, //set after render in init

            events: {
                'click #do-search button':      'on_search_submit',
                'keypress #do-search input':    'on_search_keypress',
                'input #do-search input':       'on_search_input',
                'click .js-clear-history':      'clear_history'
            },

            initialize: function ( opts ) {
                //var _this = this;

                this.app = opts.app;

                this.bind_events();
                this.render();

                this.$search_history = this.$el.find('#search_history > ul')
                this.$search_button = this.$el.find('#do-search button');
                this.$notifications_badge = this.$el.find('#notifications-badge');

                //this.on_search_reset();
                this.on_history();
                this.set_searching_indicator( this.collection._searching );

                console.log('initialize toolbar view', this.collection._searching );
            },

            bind_events: function () {
                //var _this = this;
                this.app.collections.notifications.on('reset', this.on_notifications_reset, this );
                this.app.collections.sites.on('reset', this.check_can_search, this );
                this.app.on('dialog:close', this.on_dialog_close, this );
                this.collection.on('searching', this.set_searching_indicator, this );
                this.collection.on('cached', this.set_cached_indicator, this );
                this.collection.on('reset', this.on_search_reset, this );
                this.collection.on( 'history', this.on_history, this );

                // this.collection.parser_observer.on('spellcheck', function ( data ) {
                //     _this.set_spell_suggestion( data.spelling );
                // });
            },

            on_search_reset: function () {
                console.error('search collection reset', arguments, this.collection._last_query );
            
                this.$el.find('#do-search input').val( this.collection._last_query );
            },

            on_notifications_reset: function(){
                //used to care about unresolved.  only unseen
                var unresolved = this.app.collections.notifications._raw_unresolved_length;
                //var unresolved = this.app.collections.notifications.where({ resolved: false }).length;

                unresolved = unresolved > 9 ? '9+' : unresolved;

                this.$notifications_badge.attr({ 'data-ct': unresolved }).text( unresolved );
            },

            // set_spell_suggestion: function ( suggestion, is_recommendation ) {
            //     console.error('set spell suggestion', data, arguments );
            //     console.log( 'SET SPELL SUGGESTION', suggestion);

            //     is_recommendation = is_recommendation || false;
            //     if ( !is_recommendation ) {
            //         this.setGenreSuggestions(null);
            //     }

            //     this.suggestion = suggestion;

            //     var el = $('#search_results').find('.suggestion');

            //     el.find('#label').text(
            //             is_recommendation ? 'You might like: ' : 'Did you mean: ');
            //     el.toggleClass('hidden', this.suggestion === null)
            //         .find('.text')
            //             .text(suggestion)
            //             .data('suggestion', suggestion);

            //     this.app.trigger('render')
            // },

            on_search_keypress: function (e){
                //console.log('search keypress', e.which, e);
                if( e.which === 13 ) {
                    //interaction statistics
                    _bt.track( 'toolbar', 'submit', 'keypress', ( !this.app._shiftKey_down ? 0 : 1 ) ); //track whether it was a cached query or not
                    this.submit_search( !this.app._shiftKey_down );  //holding shift ignores cached results and re-performs the search
                }
            },

            //used for paste, undo, and redo in the search query input
            on_search_input: function( e ) {
                var me = $(e.currentTarget),
                    query = me.val();
                //console.log('input', this.is_command( query ), this.get_command( query ), query, this.app.commands[ query.replace('/','') ] );
                //set url query indicator
                this.$search_button.toggleClass( 'download', this.is_download_link( query ) );
                //set url command indicator
                this.$search_button.toggleClass( 'command', this.is_potential_command( query ) );
            },

            //why?
            on_dialog_close: function () {
                this.$el.find('#do-search input').trigger('input');
            },

            //display an add-sites button over the query input if no sites are enabled
            check_can_search: function () {
                var enabled = this.app.collections.sites.where({ type: 'added' });

                this.$el.toggleClass('no-sites', !enabled.length );

                // console.error('CHECK CAN SEARCH', enabled.length );
            },

            on_search_submit: function(e){
                this.submit_search( false );

                _bt.track( 'toolbar', 'submit', 'button', false ); //tracks whether searching for query included looking in the cache.  when hitting the button, that is always false
            },

            submit_search: function( cached ){
                var query = $('#search_text').val();

                console.error('submit search', cached);

                if( this.is_download_link( query ) ) {
                    _bt.track( 'toolbar', 'attempt-add-torrent', null, null );      
                    this.app.collections.torrents.add_by_url( query );
                    $('#search_text').val('').trigger('input');
                    this.app.trigger('query:url', false );
                    return;
                } else if ( this.is_potential_command( query ) ) {
                    var command = this.get_command( query );
                    if ( this.is_command( command ) ) {
                        _bt.track( 'toolbar', 'command', command, null );
                    }
                    $('#search_text').val('').trigger('input');
                    this.app.trigger('command', command );            
                    return;
                }


                //this.app.collections.search._last_query = query;

                this.collection.search( query, cached );


                //this.app.views.search.clear()

                // Bt.msg.send( Bt.events.SEARCH_SITES, {
                //     query: query,
                //     cached: cached
                // }, 'ext');

                //this.app.collections.search.start_search_timer();
            },

            is_potential_command: function ( str ) {
                return str.indexOf('/') === 0;
            },

            is_command: function ( str ) {
                return !!this.app.commands[ str ];
            },

            get_command: function ( str ) {
                var ret = false;
                if ( this.is_potential_command( str ) ) {
                    ret = str.replace('/','');
                }
                return ret;
            },

            is_download_link: function( str ){
                //if( ( query.indexOf('://') > -1 && query.indexOf('.torrent') > -1 ) || query.indexOf('urn:btih') > -1 ) {
                return ( str.indexOf('://') > -1 || str.indexOf('urn:btih') > -1 );
            },

            set_cached_indicator: function( is_cached ){
                is_cached ?
                    this.$search_button.addClass('cached') :
                    this.$search_button.removeClass('cached');
            },

            set_searching_indicator: function( is_searching ){
                console.log('set searching indicator', is_searching );
                is_searching === 'primary' ?
                    this.$search_button.addClass('searching') :
                    this.$search_button.removeClass('searching');
            },

            on_history: function () {
                this.$search_history.html( Handlebars.templates.history({ history: this.collection._history }) );
            },

            clear_history: function ( e ) {
                e.preventDefault();

                this.collection.observer.trigger('clear');
                
                //interaction statistics
                _bt.track( 'toolbar', 'history', 'clear', null );

            },

            render: function () {
                var html = Handlebars.templates.toolbar();
                this.$el.html( html );
            }
        });

        //HANDLEBARS HELPERS
        // _.each({
        //  root: function () {
     //            //weird data path issues need to be resolved before deployment
     //            return ( config.is_ff() ? '../../' : config.data_path ) + 'app/';
        //      //return config.data_path + 'app/';
        //  }
        // }, function ( fn, name ) {
        //  //register the helper for use in handlebars templates
        //  Handlebars.registerHelper( name, fn );
        // });

    
        return Toolbar;
    });

})();