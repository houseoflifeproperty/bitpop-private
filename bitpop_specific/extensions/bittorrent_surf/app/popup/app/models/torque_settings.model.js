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
        var Torque_Settings = Backbone.Model.extend({

            observer: null, //set in init, listens to 'app'

            initialize: function( attributes, options ){
                this.app = options.app;
                delete options.app;

                this.observer = _sandbox.observer.load('app');

                this.bind_events();
                this.bind_messages();

                console.log('Torque SETTINGS MODEL INIT', this, attributes);

                //send message to fetch settings
                this.observer.trigger('settings:load');
                //Bt.msg.send( Bt.events.LOAD_TORQUE_SETTINGS, null, 'app' )
            }, 

            bind_events: function(){
                this.on('change', function( model, val, changes ){
                    console.log('TORQUE SETTINGS CHANGE', this.toJSON(), this.app.settings.get() );
                }, this);
            },

            bind_messages: function(){
                this.observer.on('settings:changed', _.bind( this.on_settings_changed, this ) );
                //Bt.msg.on(Bt.events.TORQUE_SETTINGS_CHANGED, _.bind(this.on_settings_changed, this))
            },

            on_settings_changed: function( data ){
                console.log('ON TORQUE SETTINGS CHANGED');

                this.set(data);
            },

            open_webui: function () {
                this.observer.trigger('webui:open');
            }
        });

        return Torque_Settings;
    });

})();