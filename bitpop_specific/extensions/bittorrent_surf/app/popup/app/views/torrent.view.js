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
        var _bt = require('sandbox_helpers'),
            settings = null; //set in init with reference to app settings
        //var config = require('config');

        //app constructor
        var Torrent = Backbone.View.extend({
            
            torrents: null, //holds reference to torrents view

            tagName: 'li',
            className: 'torrent',

            status: 'eta', //also 'up', 'down'

            events: {
                'click .pause' : 'action_pause',
                'click .remove': 'action_remove',
                'click .start': 'action_start',
                'click .open': 'action_open_containing',
                'dblclick' : 'action_open_containing'
                //'dblclick .status' : 'stop_propagation'
            },

            stop_propagation: function(e){
                e.stopPropagation();
            },

            initialize: function( options ){
                this.torrents = this.options.torrents;
                delete this.options.torrents;

                this.app = this.torrents.app;
                //set local module settings variable if not already set
                if ( !settings ) {
                    settings = this.app.settings;
                }

                this.bind_events();

                this.render();

                this.torrents.$torrents.prepend( this.$el );

                // this.app.trigger('render');
                //console.log('init torrent view', options, this.app );
            },

            bind_events: function(){
                this.model.on('change', this.render, this);

                this.model.on('remove', this.destroy, this);
            },

            action_open_containing: function(e){
                //debugger;
                this.model.collection.open_containing( this.model );

                //interaction statistics
                _bt.track( 
                    'torrent', 
                    'open_folder',
                    //label complete or incomplete
                    ( this.model.get('properties').completed_on ? 'complete' : 'incomplete' ),
                    //value is time since torrent added
                    null
                );
            },
            
            action_pause: function(e){
                console.log('action pause', this.model.id);
                
                e.stopPropagation();

                //Bt.msg.send( Bt.events.PAUSE_TORRENT, this.model.id, 'app' );
                this.model.pause();
                //this.observer.trigger( 'torrent:pause', this.model.id );

            },
            
            action_remove: function(e){
                e.stopPropagation();

                var delete_data = false;

                if ( ( this.app._metaKey_down || this.app._ctrlKey_down ) && this.app._shiftKey_down ) {
                    delete_data = true;
                }

                console.log('action remove', this.model, this.model.id, delete_data );

                this.model.remove( delete_data );
                
                this.$el.find('.status .eta').html('Removing...')
            },
            
            action_start: function(e){
                console.log('action start', this.model.id);

                e.stopPropagation();

                this.model.start();
            },

            show_status: function(){
                this.$el.find('.status span.'+this.status).show().siblings().hide();
            },

            set_status_tip: function(){
                var status = '';

                if( ! this.model.is_completed() ) {
                    this.$el.find('.status').children().each(function(i){
                        if ( i )
                            status += '<br \/>';

                        status += $(this).text();
                    });

                    this.$el.find('.status').attr('data-tip', status );

                } else {
                    //status = Handlebars.helpers.get_torrent_tip.apply( this.model.attributes, [ this.model.attributes ] );
                    this.$el.find('.status').removeAttr('data-tip');
                }

            },

            set_status_class: function(){
                var changed = false;

                if( this.model.is_completed() ){
                    if ( this.$el.hasClass('downloading') ) changed = true;
                    this.$el.addClass('completed').removeClass('downloading');
                } else {
                    if ( this.$el.hasClass('completed') ) changed = true;
                    this.$el.addClass('downloading').removeClass('completed');
                }

                if( changed ){
                    this.app.trigger('render');
                }
            },

            set_state_class: function(){
                var state = this.model.get_state();

                if( state === 233 ){
                    //paused
                    this.$el.addClass('paused').removeClass('started');
                } else {
                    //other
                    this.$el.addClass('started').removeClass('paused');
                }
            },

            render: function(){
                this.el.innerHTML = Handlebars.templates.torrent( this.model.toJSON() );
                this.set_status_class();
                //this.set_status_tip();
                this.show_status();
                this.set_state_class();
            },

            // on_remove: function () {
            //     this.model.off();
            //     this.destroy();
            //     console.error('TORRENT VIEW MODEL REMOVE', arguments, this);
            // },

            destroy: function(){
                console.log('destroying torrent view');

                //COMPLETELY UNBIND THE VIEW
                this.undelegateEvents();
                $(this.el).removeData().unbind();

                //Remove view from DOM
                this.remove();
                this.model.unbind();
                Backbone.View.prototype.remove.call(this);

                //not currently there...
                if( this.onClose ){
                    this.onClose();
                }

                this.app.trigger('render');

            }            
        });


        //stuff for helpers
        var mapStatuses = function ( status ) {
            var bits = ['started', 'checking', 'start after check', 'checked', 'error', 'paused', 'queued', 'loaded']

            var statuses = {};
            
            _.map(bits, function ( value, index ) {
                //console.log( value, Math.pow(2, index), Math.pow(2, index) & status )
                if(Math.pow(2, index) & status)
                    statuses[value] = true;
            });
            
            return statuses;
        };

        var prettySeconds = function ( data ) {
            if (data == -1 || !data)
                return "\u221E";
            
            var secs = Number(data);
            
            if(secs > 63072000)
                return "\u221E";
            
            var div, y, w, d, h, m, s, output = "";
            
            y = Math.floor(secs / 31536000);
            div = secs % 31536000;
            w = Math.floor(div / 604800);
            div = div % 604800;
            d = Math.floor(div / 86400);
            div = div % 86400;
            h = Math.floor(div / 3600);
            div = div % 3600;
            m = Math.floor(div / 60);
            s = div % 60;
            
            if (y > 0)
            {
                output = "%dy %dw".replace(/%d/, y).replace(/%d/, w);
            }else if(w > 0){
                output = "%dw %dd".replace(/%d/, w).replace(/%d/, d);
            }else if(d > 0){
                output = "%dd %dh".replace(/%d/, d).replace(/%d/, h);
            }else if(h > 0){
                output = "%dh %dm".replace(/%d/, h).replace(/%d/, m);
            }else if(m > 0){
                output = "%dm %ds".replace(/%d/, m).replace(/%d/, s);
            }else{
                output = "%ds".replace(/%d/, s);
            }
            return output;
        };


        var get_speed_health = function ( bps, max, base ) {
            max = max || 5;
            base = base || 131072; // 1 megabit ( 1024 * 1024 / 8 )

            //bps < certain number rounds down to 0.0kbps, so return zero
            // also, feel free to tweak this number to get it better
            if ( bps < 100 ) {
                return 0;
            }

            var unit = 1,
                step = ~~( base / max );
            for ( var i=1; i<max; i++ ) {
                if ( bps >= step * i ) {
                    unit++;
                } else {
                    break;
                }
            }
            //console.log('speed', bps, unit );
            return unit;
        };

        //notice there is a space there
        var to_key_value_html = function ( key, val ) {
            return '<span class="label">'+ key +' </span><span class="value">'+ val +'</span>'
        };

        //HANDLEBARS HELPERS
        _.each({
            get_progress: function( data ){
                return data.properties.progress / 10;
            },
            get_class_up: function ( data ) {
                //this is the check to see if we are sharing
                if ( data.properties.completed_on && !( data.properties.status & 1 ) ) {
                    return 'eq_none';
                }
                return 'eq_' + get_speed_health( data.properties.upload_speed, 5, 43690 );
            },
            get_class_down: function ( data ) {
                //console.log('get class down', data.properties.download_speed, data.properties.name, data.properties.completed_on );
                if ( data.properties.completed_on ) {
                    return 'eq_complete';
                }
                return 'eq_' + get_speed_health( data.properties.download_speed, 5, 131072 );
                //return 'eq_' + get_speed_health( data.properties.download_speed, 5, 170000 );
            },
            get_eq_tip: function ( data ) {

                var tip = [];
                //open el
                tip.push('<div class="eq_tip">');

                //Download
                //completed?
                if ( data.properties.completed_on !== 0 ) {
                    tip.push('<div class="row cf complete"><div class="label">Download Complete<\/div><div class="value eq_sprite"><\/div><\/div>');
                } else {
                    tip.push('<div class="row cf"><div class="label">Downloading<\/div><div class="value down">'+_bt.getFileSize( data.properties.download_speed ) + 'ps'+'<\/div><\/div>');
                }

                //Upload
                //seed stopped?
                if ( data.properties.completed_on && !( data.properties.status & 1 ) ) {
                    tip.push('<div class="row cf none"><div class="label">NOT Sharing<\/div><div class="value eq_sprite"><\/div><\/div>');
                } else {
                    tip.push('<div class="row cf"><div class="label">Sharing<\/div><div class="value up">'+_bt.getFileSize( data.properties.upload_speed ) + 'ps'+'<\/div><\/div>');
                }

                //closing el
                tip.push('<\/div>');

                return tip.join('');
            },
            get_eta: function( data ){
                //console.log('get eta', data, data.properties.eta );
                var key = '',
                    val = '',
                    properties = data.properties,
                    eta = properties.eta,
                    status = properties.status,
                    complete = properties.progress >= 1000;

                var statuses = mapStatuses( data.properties.status );

                //console.warn( 'get_eta', status, JSON.stringify( data, null, 4 ), JSON.stringify( statuses, null, 4 ) );

                if( statuses['paused'] ) {
                    val = 'Paused';
                } else if ( statuses['checking'] ) {
                    //console.error('checking',properties.name, properties.queue_order, JSON.stringify( statuses, null, 4 ) )
                    //key = 'Checking:';
                    //val = ( properties.progress / 10 ).toFixed(1) + '%';
                    val = ( properties.progress / 10 ) + '%';
                    //val = 'Checking' + ' ' + ( properties.progress / 10 ).toFixed(1) + '%';
                } else if (!complete) {
                    //not pause, checking, or complete
                    if( statuses['queued'] && !statuses['started'] ) {
                        //queued
                        key = 'Queued';
                        //val = properties.queue_order;
                    } else if ( !statuses['queued'] && !statuses['started'] ) {
                        //stopped
                        key = 'Stopped:';
                        val = ( properties.progress / 10 ) + '%';
                    } else {
                        //running
                        //key = 'ETA:';
                        val = prettySeconds(eta);
                        if ( val === "\u221E" ) { key = 'ETA: '; }
                    }

                } else if (complete){
                    if ( _.contains( statuses, 'queued') ) {
                        //val = 'Uploading';
                        val = 'Sharing: ' + Handlebars.helpers.get_seeding_progress_status.apply( data, [ data ] );
                    } else {
                        val = 'Complete';
                    }
                }

                return new Handlebars.SafeString( to_key_value_html( key, val ) );
            },
            // get_download_speed: function( data ){ 
            //     return new Handlebars.SafeString( to_key_value_html( 'Down:', _bt.getFileSize( data.properties.download_speed ) + 'ps' ) );
            // },
            // get_upload_speed: function( data ){
            //     return new Handlebars.SafeString( to_key_value_html( 'Up:', _bt.getFileSize( data.properties.upload_speed ) + 'ps' ) );
            // },
            get_total_size: function ( data ) {
                return new Handlebars.SafeString( _bt.getFileSize( data.properties.size ) );
            },
            get_downloaded_size: function( data ){
                //console.warn('get_downloaded_size helper', this, data);
                var total_size = _bt.getFileSize( data.properties.size, 1 ),
                    amt_complete = _bt.getFileSize( ~~( data.properties.size * data.properties.progress / 1000 ), 1 );

                return new Handlebars.SafeString( amt_complete +'/'+ total_size );
            },
            // get_seeding_progress: function ( data ) {
            //     var properties = data.properties,
            //         percentage = 0;
                
            //     if ( properties.completed_on <= 0 ) {
            //         return percentage;
            //     }

            //     switch(settings.get('seed_type'))
            //     {
            //         case 'time':
            //             var current_time = Math.floor((new Date).getTime() / 1000)
            //             if(settings.get('seed_time') <= 0)
            //             {
            //                 percentage = 100
            //                 break
            //             }

            //             percentage = (current_time - properties.completed_on) * 100 / (settings.get('seed_time') * 60)
            //             break
            //         case 'percentage': 
            //             if(settings.get('seed_percentage') <= 0)
            //             {
            //                 percentage = 100
            //                 break
            //             }

            //             percentage = (properties.ratio / 10) / (settings.get('seed_percentage') / 100)
            //             break
            //     }

            //     percentage = percentage > 100 ? 100 : percentage

            //     return percentage
            // },

            get_seeding_progress_status: function( torrent, include_text ) {
                var status =    '';

                //completed and stopped means seed timer hit.  say 'not sharing'
                if ( torrent.properties.completed_on && !( torrent.properties.status & 1 ) ) {
                    return 'Not sharing';
                }

                if ( settings.get('seed_type') === 'time' ) {
                    //time based
                    var now = _bt.getTimestamp(),
                        time_left = (settings.get('seed_time') * 60 - (now - torrent.properties.completed_on));

                        if ( time_left < 0 )
                            time_left = 0;

                    status = prettySeconds( time_left );

                    if ( include_text )
                        status = [
                            'Sharing for ',
                            status,
                            ' longer'
                        ].join('');
                } else {
                    //percentage of size based
                    var tgt_pct = settings.get('seed_percentage');
                    if ( tgt_pct <= 0 ) {
                        status = '0%';
                    } else {
                        status = ~~( (torrent.properties.ratio / 10) / (tgt_pct / 100) ) + '%';
                    }

                    if ( include_text )
                        status = [
                            'Shared ',
                            status,
                            ' of file'
                        ].join('');

                }

                return status;
            },

            // get_status_tip: function( torrent ) {
            //     var tip = '';

            //     if ( torrent.properties.completed_on === 0 )
            //         tip = [
            //             '<strong>Download Status: <\/strong>',
            //             '<div>- ' + Handlebars.helpers.get_eta.apply( torrent, [ torrent ] ) + '<\/div>',
            //             '<div>- ' + Handlebars.helpers.get_download_speed.apply( torrent, [ torrent ] ) + '<\/div>',
            //             '<div>- ' + Handlebars.helpers.get_upload_speed.apply( torrent, [ torrent ] ) + '<\/div>',
            //             '<div>- ' + Handlebars.helpers.get_downloaded_size.apply( torrent, [ torrent ] ) + '<\/div>'
            //         ].join('');

            //     return tip;
            // },

            get_active_health: function( data ){
                //console.warn('get_active_health helper', this, data);

                var bars = _bt.calculateHealth( data.properties.availability ),
                    health = 'health_' + bars,
                    text = bars,
                    //&#013 is a line break as html special character
                    title = '<strong>Active Download Health: <\/strong>' +
                            '<div class=\'cf\'>Seeds: ' + data.properties.seeds_connected + ' / ' + data.properties.seeds_in_swarm + ' connected<\/div>' +
                            '<div class=\'cf\'>Peers: ' + data.properties.peers_connected + ' / ' + data.properties.peers_in_swarm + ' connected<\/div>' ;

                return new Handlebars.SafeString( '<span class="health '+ health +'" data-tip="' + title + '"></span>' );
            },
            // get_filesize: function(size, precision)
            // {
            //     var i;
            //     var sizes = ["b", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
                
            //     if(size <= 0 || !size)
            //     {
            //         return('0 b');
            //     }else{
            //         i = Math.floor(Math.log(size) / Math.log(1024));
            //         size = size / Math.pow(1024, i);
            //         rounded = (Math.round(size * 100)) / 100;
            //         return rounded + " " + sizes[i];
            //     }
            // },

            get_torrent_tip: function( torrent ) {
                var files = torrent.file.length === 1 ? ' file ' : ' files ';

                return [
                    '<strong>Double Click to Open<\/strong>',
                    '<div>- ' + torrent.properties.name + '<\/div>',
                    '<div>- ' + torrent.properties.directory + '<\/div>',
                    //'<div>- ' + Bt.App.torque_settings.get('download_directory') + '<\/div>',
                    //'<div>- ' + torrent.file.length + files + '(' + Handlebars.helpers.get_filesize.apply( torrent.properties.size, [ torrent.properties.size ] ) + ') <\/div>',
                    //'<div>- ' + Handlebars.helpers.get_filesize.apply( torrent.properties.size, [ torrent.properties.size ] ) + '<\/div>',
                    '<div>- ' + Handlebars.helpers.get_seeding_progress_status.apply( torrent, [ torrent, true ] ) + '<\/div>'
                ].join('');
            }            
        }, function ( fn, name ) {
            //register the helper for use in handlebars templates
            Handlebars.registerHelper( name, fn );
        });
    
        return Torrent;
    });

})();