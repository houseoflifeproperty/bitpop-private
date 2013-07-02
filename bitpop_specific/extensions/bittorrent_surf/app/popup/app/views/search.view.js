(function(){

    //app view holds logic and events for the search bar,
    //suggestions, and main buttons

    define([
        'require',
        'handlebars',
        'backbone',
        'sandbox_helpers',
        'alert.view',
        'result.view',
        'suggestion.view',
        'config'
    ], function (require, Handlebars) {
        var _bt = require('sandbox_helpers'),
            Result_View = require('result.view'),
            Alert_View = require('alert.view'),
            Suggestion_View = require('suggestion.view'),
            config = require('config');

        //app constructor
        var Search = Backbone.View.extend({
            
            el: '#search_results',

            results: [], //hold result views

            $results_el: null, //set in init

            $empty: null, //set in init

            _suggestion: null, //holds the suggestion view

            $suggestion: null, //set in init

            alert: null, //set in init, holds alert view

            initialize: function ( opts ) {
                this.app = opts.app;

                //render the handlebars static template
                this.$el.html( Handlebars.templates.search() );

                this.render();
                this.$empty = this.$el.find( '#no_results' );
                this.$results_el = this.$el.find( '.content' );
                this.$suggestion = this.$el.find( '#suggestion' );

                //make an alert view
                this.alert = new Alert_View({
                    el: '#search_results .alert_container',
                    types: [
                        config.app.notifications.SEARCH_SITE_ADDED,
                        config.app.notifications.SEARCH_SITE_DECLINED,
                        config.app.notifications.ATTEMPT_ADD_SITE,
                        config.app.notifications.SEARCH_SITE_ADD_FAIL,
                        config.app.notifications.SEARCH_COMPLETE,
                        config.app.notifications.SCRAPE_COMPLETE,
                        config.app.notifications.SEARCH_START,
                        config.app.notifications.CLIP
                    ],
                    app: this.app
                });

                this.bind_events();

                console.log('initialize search view');
            },

            bind_events: function () {
                var _this = this;
                this.collection.on('reset', this.on_collection_reset, this );
                this.collection.on('add', this.on_add, this );
                this.collection.on('sort', this.on_sort, this );
                this.collection.on('all', this.render, this );
                // this.app.collections.notifications.on('reset', this.on_notifications_reset, this);
                // this.app.on('dialog:close', this.on_dialog_close, this );
                // this.collection.on('searching', this.set_searching_indicator, this);
                // this.collection.on('cached', this.set_cached_indicator, this );
                this.collection.on('recommendations', this.on_recommendations, this );
                this.collection.parser_observer.on('spell', function ( spelling, query ) {
                    _this.set_suggestion( spelling, false );
                });
            },

            set_suggestion: function ( suggestion, is_recommendation ) {
                console.error('set_suggestion', arguments);

                if ( !is_recommendation ) {
                    //this is a spelling suggestion.  it overrides any btfc recommendations
                    //so, destroy them if they are there;
                    this._suggestion && this._suggestion.destroy();
                
                    this._suggestion = new Suggestion_View({
                        app: this.app,
                        suggestion: suggestion
                    });

                    //put the suggestion's el in the $suggestion container
                    this.$suggestion.append( this._suggestion.$el );

                } else if ( suggestion ) {
                    //make sure the suggestion is not a spellcheck suggestion 
                    if ( this._suggestion && !this._suggestion.model ) { 
                        console.warn('SUGGESTION EXISTS AND IT IS A SPELLCHECK SUGGESTION');
                        return;
                    }
                    //check that the suggestion view showing is 
                    //not already showing for this exact same model
                    if ( this._suggestion && this._suggestion.model === suggestion ) {
                        //same suggestion, get out of this because it is already showing
                        return;
                    } else if ( this._suggestion ) {
                        //if it isn't, destroy it.
                        this._suggestion.destroy();
                    }
                    //there is no spellcheck suggestion
                    //suggestion arg is the model... make sure it is there
                    //console.warn('GOT RECOMMENDATION SUGGESTION');
                    this._suggestion = new Suggestion_View({
                        app: this.app,
                        model: suggestion
                    });

                    //put the suggestion's el in the $suggestion container
                    this.$suggestion.append( this._suggestion.$el );
                }
            },

            on_recommendations: function ( recommendations ) {
                this.set_suggestion( recommendations[ 0 ], true );
            },

            on_collection_reset: function () {
                var results = this.collection.models;

                //delete any old views
                this.destroy_views();

                //this.$empty.hide();
                results.length ? this.$empty.hide() : this.$empty.show();

                //create the views
                this.collection.each( this.on_add, this );

                console.warn('search view collection reset', results, results.length, this.$empty, this.collection );

            },

            destroy_views: function () {
                //first, destroy result views
                var len = this.results.length;
                while ( len ) {
                    this.results.pop().destroy();
                    len--;
                }
                //next, destroy any suggestion views
                this._suggestion && this._suggestion.destroy();
                this._suggestion = null;
            },

            on_add: function ( result ) {
                this.$empty.hide();
                var view = new Result_View({ model: result, app: this.app, parent: this });
                this.results.push( view );
                //console.log('on_add result', result.get('id') );
            },

            on_sort: function ( result, index ) {
                console.log('on_sort', index );

                this.collection.each( function( model ) {
                    //console.log('each model', model, this);
                    model.view.put_in_place();
                }, this);
            },

            render: function () {
                this.app.trigger('render');
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

    
        return Search;
    });

})();