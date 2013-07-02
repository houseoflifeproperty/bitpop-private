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
        var Result = Backbone.View.extend({
            
            tagName: 'li',

            events: {
                'click .download': 'action_download',
                'click a.js-open-tab': 'on_link_click',
                'click .js-toggle-expandable': 'toggle_expandable'
            },

            initialize: function ( opts ) {
                this.app = opts.app;
                this.parent = opts.parent;

                this.model.view = this;

                this.bind_events();

                this.render();
                this.put_in_place();

                // console.log('initialize result view' );
            },

            bind_events: function () {
                this.model.on('change', this.render, this);
            },

            destroy: function () {
                //COMPLETELY UNBIND THE VIEW
                this.undelegateEvents();

                this.$el.removeData().unbind(); 

                //Remove view from DOM
                this.remove();  
                Backbone.View.prototype.remove.call(this);
            },

            action_download: function ( e ) {
                e.preventDefault();
                e.stopPropagation();

                var me = $(e.currentTarget)
                    //availability = _bt.calculateHealth( _bt.getScrapedAvailability( this.model.get('scraped') ) ),
                    url = e.currentTarget.href,
                    downloading = $(e.currentTarget).hasClass('downloading');

                console.error('DOWNLOAD RESULT check');

                //copy it to the clipboard
                if ( ( this.app._metaKey_down || this.app._ctrlKey_down ) && this.app._shiftKey_down ) {
                    this.app.copy( url );

                    //bench it
                    _bt.track( 
                        'search',
                        'result',
                        'clip',
                        //values sent:
                        // -2 for click on link that is already downloading
                        // -1 for no availability information
                        // 0 ... n for availability 
                        0
                    );

                    return;
                }

                this.model.set({ 'downloaded': true })

                if( !downloading ){
                    var $title = this.$el.children('.title'),
                        name = $title.text();

                    this.show_as_downloading();

                    this.app.collections.torrents.add_by_url( url, name );
                }

                _bt.track( 
                    'search', 
                    'result', 
                    'download', 
                    //values sent:
                    // -2 for click on link that is already downloading
                    // -1 for no availability information
                    // 0 ... n for availability 
                    ( downloading ? -2 : 0 ) 
                );
            },

            on_link_click: function () {
                _bt.track( 'search', 'result', 'open_link', ( this.app.views.app._metaKey_down || this.app.views.app._ctrlKey_down ? 1 : 0 ) );
            },

            //called before handler logic in app.view, so change has not yet been made
            toggle_expandable: function ( e ) {
                e.preventDefault()
                _bt.track( 'search', 'result', ( this.$el.hasClass('open') ? 'collapse' : 'expand' ), null );
            },

            show_as_downloading: function () {
                this.$('.download').addClass('downloading').attr('data-tip', 'Downloading');
            },

            render: function () {
                var should_show = ( !this.model.shouldWait() && !this.model.isDuplicate() && !this.model.get('is_btfc_recommendation') );

                var is_open = this.$el.hasClass('open'),
                    data = this.model.toJSON();

                if ( data.duplicates ) {
                    data.duplicates = _.toArray(data.duplicates)
                }

                this.$el.html(Handlebars.templates.result( data ) )

                this.$el.toggleClass('hidden', !should_show)
                this.$el.toggleClass('combined expandable', !!data.duplicates)
                this.$el.toggleClass('open', is_open)
                //add class if it is a bt featured content result
                this.$el.toggleClass( 'btfc', !!data.is_btfc_result );
            },

            put_in_place: function () {
                this.parent.$results_el.append( this.$el );
                this.app.trigger('render');
            }
        });

        //HANDLEBARS HELPERS
        _.each({
            scrape_health: function(data){

                var health = '',
                    text = '',
                    title = '<strong>Estimated Torrent Health:<\/strong>';

                if( !data.scraped ){
                    health = 'unknown';
                    text = '...';
                    //title = title.replace(':', '');
                    title = 'No health information available';
                } else if ( data.scraped.error ) {
                    health = 'shrug';
                    text = '*shrug*';
                    //title = title.replace(':', '');
                    title = 'No health information available';
                } else {
                    //right now, we are just passing in number of seeders as a fake availability.  we can make this better
                    var bars = _bt.calculateHealth( _bt.getScrapedAvailability( data.scraped ) );
                    health = 'health_' + bars;
                    text = bars;

                    //&#013 is a line break as html special character
                    if( _.isNumber( data.scraped.complete ) )
                        title += '<div>People Sharing: <span class=\'right\'>' + data.scraped.complete + '<\/span><\/div>';
                    if( _.isNumber( data.scraped.incomplete ) )
                        title += '<div>People Downloading: <span class=\'right\'>' + data.scraped.incomplete + '<\/span><\/div>';
                    if( _.isNumber( data.scraped.downloaded ) )
                        title += '<div>Total Downloaded: <span class=\'right\'>' + data.scraped.downloaded + '<\/span><\/div>';
                }

                return new Handlebars.SafeString( '<span class="health '+ health +'" data-tip="'+ title +'"> </span>' );
            },

            get_result_size: function ( result ) {
                //console.error('get result size', arguments);
                var ret = result.files_size ? _bt.getFileSize( result.files_size, 0 ) : '';
                //return new Handlebars.SafeString( _bt.getFileSize( data.properties.size ) );
                return new Handlebars.SafeString( ret );
            },  

            //fallback favicon for search results
            getFavicon: function ( url ) {
                //console.log('get favicon', url, Handlebars.helpers.root(), Handlebars.helpers.root() + 'img/icon_favicon.png' )
                return url || Handlebars.helpers.root() + 'img/icon_favicon.png';
            },

            get_title_tip: function( result ){
                var ret =   'File: ' + result.torrent.name + 
                            '<div class="ellipse">URL: ' + result.torrent.url + '<\/div>';
                if( result.files_size )
                    ret += '<div class="ellipse">Size: ' + _bt.getFileSize( result.files_size, 0 ); + '<\/div>';

                return ret;
            },

            get_download_link_tip: function( result ){
                var size = '';
                if ( result.files_size )
                    size = ' ' + _bt.getFileSize( result.files_size, 0 );

                return '<strong>Click to Download:<\/strong>' + result.torrent.name + size;
            },

            get_tab_link_tip: function( result ){
                // if( !result ) {
                //     console.error('BAD RESULT IN VIEW', result, this, res_ct++ );
                //     return;
                // } else {
                //     console.log('GOOD RESULT', res_ct++)
                // }
                return ( result.torrent && result.torrent.url ? 
                    'More info at '+ result.torrent.url.getBasePath() :
                    ''
                );
            },

            get_result_name: function( result ) {

                //console.log('get result name', this, result);

                return ( result.is_btfc_result && result.hasOwnProperty('torrent') ? 
                    new Handlebars.SafeString('<a href="'+result.torrent.url+'" class="js-open-tab">'+result.torrent.name+'<\/a>') :
                    result.torrent.name
                );
            }
        }, function ( fn, name ) {
            //register the helper for use in handlebars templates
            Handlebars.registerHelper( name, fn );
        });
    
        return Result;
    });

})();
