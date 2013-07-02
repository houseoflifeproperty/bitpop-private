//_sandbox.observer.load('search');

(function(){

	define([
		'require',
		'backbone',
		'sandbox_helpers',
		'result.model'
	], function (require) {
		//required components
		var Result = require('result.model'),
			_bt = require('sandbox_helpers');

		//app constructor
		var Search = Backbone.Collection.extend({
			
			model: Result,

			_last_query: '',

			_history: [],

			_recommendations: [],

			observer: null, //set in init when global _sandbox is ready

			parser_observer: null, //set in init so we can initiate manual attempts to add site by url

			_searching: false,

			initialize: function ( data, opts ) {
				this.app = opts.app;
				this.observer = _sandbox.observer.load('search');
				this.parser_observer = _sandbox.observer.load('parser');

				this.throttled_sort = _.throttle( 
		            _.bind( 
		                function(){ 
		                    this.sort({ silent: true }); 
		                    this.trigger('sort');
		                }, 
		                this 
		            ), 
		            1000 
		        );

				//debounce the recommendations trigger
				this.announce_recommendations = _.debounce( _.bind( this.announce_recommendations, this ), 0 ); 
				//throttle filtering of recommendations
				this.filter_recommendations = _.throttle( _.bind( this.filter_recommendations, this ), 250 );


				this.bind_events();

				this.load();

				console.log('init search collection', this, this.app, opts);
				//Bt.msg.send( Bt.events.GET_SITES, {});
			},

			bind_events: function () {
				//this.observer.on('reset', _.bind( this.on_sites_received, this ) );
				this.observer.on('full_results', _.bind( this.on_cached_results, this ) );
				this.observer.on('complete', _.bind( this.on_complete, this ) );
		        this.observer.on('result', _.bind( this.on_result_update, this ) );
		        this.observer.on('history', _.bind( this.on_history, this ) );

		        this.on( 'reset', this.filter_recommendations, this );
			},

			on_history: function ( data ) {
				this._history = data;
				this.trigger( 'history', this._history );
			},

			on_complete: function ( query, status ) {
				//console.error('search collection on_complete', query, status );
				if ( query === this._last_query ) {
					this._searching = status;
					this.trigger( 'searching', this._searching );
				}
			},

			on_cached_results: function ( data ) {
				this._last_query = data.query;
				this._searching = data.searching;
				this.trigger( 'cached', data.cached, data.query );
				this.trigger( 'searching', this._searching );
				this.reset( data.results );

				console.error('search on_cached_results', data.searching, this._searching, data, this );
			},

			load: function () {
				this.observer.trigger('load');
			},

			search: function ( query, cached, btfc_adv ) {
				this._last_query = query;

				console.error('search collection search', query, cached);

				//reset the recommendations
				this._recommendations = [];
				//clear out the collection
				this.reset();

				this._searching = 'primary';
				this.trigger( 'searching', this._searching );

				var opts = {
					query: query,
					cached: cached
				};

				if ( btfc_adv ) {
					opts.btfc_adv = true; //sets up special search of only bittorrent featured content

				}

				this.observer.trigger( 'search', opts );
			},

			attempt_add_site: function ( url ) {
	            this.parser_observer.trigger('check', {
	                url: url,
	                manual: true
	            });
			},


		    calculate_scrape_order: function( result ){
		        return ( !result.get('scraped') ?
		                    -2 :
		                    result.get('scraped').error ?
		                        -1 :
		                        _bt.calculateHealth( _bt.getScrapedAvailability( result.get('scraped') ) )
		        );
		    },

		    //this function allows local caching of the computed clean query terms 
		    //so the comparator only runs the regex parsing ong time per query.
		    get_query_terms: ( function () {
		        var query = '',
		            terms = [],
		            make_clean_terms = function () {
		                query = this._last_query;
		                terms = query.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s{2,}/g," ").toLowerCase().split(' ');
		            };
		        return function () {
		            if ( this._last_query !== query ) make_clean_terms.call( this )
		            //terms array now updated.  return it.
		            return terms;
		        };
		    })(),

		    //auto sorts the results as they come in
		    comparator: function( a, b ){
		        //console.log('comparing', a, b);
		        //here's how we sort
		        //check btfc first
		        var btfc_res_a = !!a.get('is_btfc_result'),
		            btfc_res_b = !!b.get('is_btfc_result');

		        if ( btfc_res_a !== btfc_res_b ) {
		            return ( btfc_res_a ? -1 : 1 );
		        }

		        //check health/availability number
		        var health_a = this.calculate_scrape_order( a ),
		            health_b = this.calculate_scrape_order( b );

		        if ( health_a !== health_b && ( health_a > -1 || health_b > -1 ) ) {
		            return health_b - health_a;
		        }

		        //if the health is not the same or is unknown ( < 0 )
		        //the sort by query terms match all, match one, and then alphabetically
		        var name_a = a.get('torrent').name.toLowerCase(),
		            name_b = b.get('torrent').name.toLowerCase(),
		            //clean up the query to have an array of clean alpha-numeric terms.  strip out punctiation, then collapse dowbly spaces, then split on space
		            terms = this.get_query_terms(),
		            term_test = function ( term ) {
		                return ( this.indexOf( term ) > -1 );
		            },

		            every_a = _.every( terms, term_test, name_a ),
		            every_b = _.every( terms, term_test, name_b );
		        
		        //test for all terms
		        if ( every_a && !every_b ) {
		            return -1;
		        } else if ( every_b && !every_a ) {
		            return 1;
		        } else if ( !every_b && !every_a ) {
		            //check to see if any of the terms are in there
		            //test for any terms
		            var some_a = _.some( terms, term_test, name_a ),
		                some_b = _.some( terms, term_test, name_b );

		            if ( some_a && !some_b ) {
		                return -1;
		            } else if ( some_b && !some_a ) {
		                return 1;
		            }
		        }

		        //after checking on terms, then compare the names alphabetically
		        if ( name_a === name_b ) {
		            return 0;
		        } else if ( name_a < name_b ) {
		            return -1;
		        } else {
		            return 1;
		        }

		    },

		    on_result_update: function( data ){
		        var result = this.get( data.id );
		        if( result ){
		        	result.set( data );
		        } else {
		            this.add( data );

		            //if this is a featured content recommendation, and it is new to the collection
		            //then filter the recommendations out again
			        if ( data.is_btfc_recommendation ) {
			        	this.filter_recommendations();
			        	//_.defer( _.bind( this.filter_recommendations, this ) );
			        }
		        }
		        this.throttled_sort();
		        
		        console.warn('on result update', data );
		        //this.start_search_timer();
		    },

		    //this function is throttled in init
		    filter_recommendations: function () {
		    	console.error('filter_recommendations', this);
		    	var _this = this;
		    	//get the recommendations unordered
		    	//and only results that aren't torrents downloading
		    	var recommendations = this.where({ is_btfc_recommendation: true }).filter( function( el ) {
		    		// console.warn('filtering recommendations', el.toJSON(), _this.app.collections.torrents.where({ uri: el.get('download').torrent }) );
		    		//filter this element out if there is a torrent download-ing/-ed that matches the recommendation result
		    		return !_this.app.collections.torrents.where({ uri: el.get('download').torrent }).length;
		    	});
		    	this._recommendations = _.sortBy( recommendations, function ( el, i, arr ) {
		    		return el.get('order');
		    	});
		    	this.announce_recommendations();
		    	//console.warn( 'filter_recommendations', this._recommendations );
		    },

		    //this function is debounced in init
		    announce_recommendations: function () {
		    	//only send if there are recommendations there.
		    	if ( this._recommendations.length ) {
			    	this.trigger('recommendations', this._recommendations );
				}
		    }

		});

		return Search;
	});

})();
