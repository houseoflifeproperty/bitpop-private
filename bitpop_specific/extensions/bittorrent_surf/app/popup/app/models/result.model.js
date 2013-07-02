//_sandbox.observer.load('search');
(function(){

    define([
        'require',
        'backbone',
        'config'
    ], function (require) {
        //required components
        var config = require('config');

        //app constructor
        var Result = Backbone.Model.extend({
            initialize: function () {
                this.checkFavicon()

                if(!this.get('duplicates'))
                {
                    this.set('duplicates', null)   
                }

                this.on('change:favicon', this.checkFavicon, this)
            },

            checkFavicon: function () {
                if(_.isEmpty(this.get('favicon')))
                {
                    this.set({ 'favicon': Handlebars.helpers.root() + 'img/icon_favicon.png' })
                }
            },

            shouldWait: function() {
                return !!this.get('wait')
            },

            isDuplicate: function() {
                return !!this.get('is_duplicate')
            }
        });

        return Result;
    });

})();
/*
console.log('hello search.model');

var Bt = Bt || {};
	Bt.Models = Bt.Models || {};


Bt.Models.Search = Backbone.Model.extend({
    initialize: function()
    {
        this.checkFavicon()

        if(!this.get('duplicates'))
        {
            this.set('duplicates', null)   
        }

        this.on('change:favicon', this.checkFavicon, this)
    },

    checkFavicon: function()
    {
        if(_.isEmpty(this.get('favicon')))
        {
            this.set({ 'favicon': 'img/icon_favicon.png' })
        }
    },

    shouldWait: function()
    {
        return !!this.get('wait')
    },

    isDuplicate: function()
    {
        return !!this.get('is_duplicate')
    }
});
*/