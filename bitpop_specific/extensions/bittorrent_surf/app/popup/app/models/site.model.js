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
        var Site = Backbone.Model.extend({
            initialize: function()
            {
                if(!this.get('favicon'))
                {
                    this.set({ 'favicon': config.data_path + 'app/img/icon_favicon.png' })
                }

                this.typeChanged()

                this.on('change:type', this.typeChanged, this)
            
                console.error('init site model', this, arguments);

            },

            typeChanged: function()
            {
                this.set('enabled', this.get('type') === 'added')
            }
        });

        return Site;
    });

})();