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
        var Suggestion = Backbone.View.extend({
            
            tagName: 'div',

            _suggestion: null,

            initialize: function ( opts ) {
                this.app = opts.app;
                //if there is a spelling suggestion, set it
                if ( opts.suggestion ) { this._suggestion = opts.suggestion; }

                this.bind_events();

                console.log('initialize suggestion view', this );

                this.render();
            },

            bind_events: function () {
                // if ( this.model ) {
                //     this.model.on('change', this.render, this);
                // }
            },

            destroy: function () {
                //COMPLETELY UNBIND THE VIEW
                this.undelegateEvents();

                this.$el.removeData().unbind(); 

                //Remove view from DOM
                this.remove();  
                Backbone.View.prototype.remove.call(this);
            },

            render: function () {
                console.warn('render suggestion view');
                var html;
                //var html;
                if ( !this.model ) {
                    //spelling suggestion
                    html = Handlebars.templates.suggestion({ spelling: this._suggestion });
                } else {
                    //btfc recommendation
                    html = Handlebars.templates.suggestion({ model: this.model.toJSON() });
                    _.defer( _.bind(function () {
                        this.$el.find('.suggestion').addClass('recommendation');
                    }, this ) );
                }
                //put the html in the $el
                this.$el.html( html );
            }
        });

        //HANDLEBARS HELPERS
        _.each({
            capitalize: function ( str ) {
                return _bt.capitalize( str );
            },
            get_first_genre: function ( data ) {
                console.log('get_first_genre', data, this);
                return data.model.recommended_genres[0];
            },
            get_first_genre_capitalized: function ( data ) {
                return _bt.capitalize( Handlebars.helpers.get_first_genre.apply( this, arguments ) );
            }
        }, function ( fn, name ) {
            //register the helper for use in handlebars templates
            Handlebars.registerHelper( name, fn );
        });
    
        return Suggestion;
    });

})();
