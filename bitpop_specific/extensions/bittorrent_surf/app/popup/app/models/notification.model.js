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
        var Notification = Backbone.Model.extend({
            alert_seen: function () {
                if( this.get('alert_seen') )
                    return false;

                console.error('SEND NOTIFICATION UPDATE FOR ALERT SEEN.  NOT YET WRITTEN IN', this);

                this.collection.observer.trigger('update', 
                    //id
                    this.id,
                    //changes
                    {
                        resolved: this.get('resolved'),
                        alert_seen: true
                    },
                    //options
                    {}
                );

                // Bt.msg.send( Bt.events.UPDATE_NOTIFICATION, {
                //     id: this.id,
                //     //notifications can be grouped, so if one of them has not shown it's alert, then the whole grouped notification needs to reflect that.
                //     grouped: this.get('data'),
                //     change: {
                //         //keep the resolved state
                //         resolved: this.get('resolved'),
                //         alert_seen: true
                //     },
                //     options: {
                //         //silent: true
                //     }
                // }, 'ext');                
            }
        });

        return Notification;
    });

})();