//_sandbox.observer.load('search');
(function(){

    define([
        'require',
        'backbone',
        'sandbox_helpers',
        'config'
    ], function (require) {
        //required components
        var config = require('config'),
            _bt = require('sandbox_helpers');

        //app constructor
        var Torrent = Backbone.Model.extend({
            initialize: function ( data, opts ) {
                console.warn('torrent initialize', arguments);

                this.set('uri', data.properties.uri );
            },
            get_state: function(){
                return this.get('properties').status;
            },

            is_completed: function(){
                return this.get('properties').completed_on || 0;
            },

            pause: function () {
                //interaction statistics
                _bt.track( 
                    'torrent', 
                    'pause',
                    //label complete or incomplete
                    ( this.get('properties').completed_on ? 'complete' : 'incomplete' ),
                    //value is time since torrent added
                    null
                );  

                this.collection.observer.trigger( 'torrent:pause', this.id );
                this.get('properties').status = 233;
                this.trigger('change');                
            },

            start: function () {
                //interaction statistics
                _bt.track( 
                    'torrent', 
                    'start',
                    //label complete or incomplete
                    ( this.get('properties').completed_on ? 'complete' : 'incomplete' ),
                    //value is time since torrent added
                    null
                );

                this.collection.observer.trigger( 'torrent:start', this.id );
                //Bt.msg.send( Bt.events.START_TORRENT, this.model.id );
                this.get('properties').status = 201;
                this.trigger('change');
            },

            remove: function ( delete_data ) {
                //interaction statistics
                _bt.track( 
                    'torrent', 
                    'remove',
                    //label complete or incomplete
                    ( this.get('properties').completed_on ? 'complete' : 'incomplete' ),
                    //value is time since torrent added
                    null
                );

                this.collection.observer.trigger('torrent:remove', this.id, delete_data );                
            }
        });

        return Torrent;
    });

})();