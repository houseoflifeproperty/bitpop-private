(function(){
    
    define([
        'require',
        'underscore',
        'sandbox_helpers',
        'app_helpers',
        'jquery',
        'config',
        'parser_cache',
        'request_queue',
        'sha1', //exposes sha1Hash globally
        'q'
    ], function () {

    	var my = {},
            Q = require('q'),
            sha1 = require('sha1'),
            Message = null, //set in init
            Ajax = null, //set in init
            observer = null, //set in init
            config = require('config'),
	    	cache = require('parser_cache'),
            _bt = require('sandbox_helpers'),
            _app_helpers = require('app_helpers'),
            RequestQueue = require('request_queue'),

            ajax_timeout =      25000,
            strip_html_regex =  /<[^>]*>?/ig,
            //alpha_regex =         /[^\W\d\_]+/,
            //combines english alpha with non-english unicode character check
            alpha_regex =       /[^\W\d\_]+|[^\u0000-\u0080]+/,
            //non-english: http://stackoverflow.com/questions/150033/regular-expression-to-match-non-english-characters
            //It matches any character which is not contained in the ASCII character set (0-128, i.e. 0x0 to 0x80).
            //non_english_regex = /[^\x00-\x80]+/,
            //You can do the same thing with Unicode:
            //non_english_regex = /[^\u0000-\u0080]+/,

            //test_query =      'yesterday',
            test_query =        'yesterday',
            max_query_results = 10,
            inited = false;

    	//Private Methods
    	var initialize = function () {
                if ( !inited ) {
                    inited = true;

        	    	Message  = _sandbox.message;
                    Ajax = _sandbox.request;
                    observer = _sandbox.observer.load('parser');

                    //init request_queue, and reassign scope var to be the constructor
                    RequestQueue.init();
                    RequestQueue = RequestQueue.RequestQueue;

                    //start the cache
                    cache.init();
                    //listen for messages/observer events
                    bind_events();

                    console.error('Parser init', cache.get(), RequestQueue );
            	
                    //listen for check commands
                    observer.on('check', function () {
                        console.error('observer on check in parser', arguments);
                    });

                    //sample code to test aborting of all types of requests
                    // setTimeout( function () {
                    //     var queue = new RequestQueue({ 
                    //             func: Ajax.request,
                    //             //spacing: ( opts.is_special ? 200 : 100 ),
                    //             spacing: 1000,
                    //             // spacing: 1,
                    //             // max_concurrent_requests: ( opts.is_special ? 5 : 10 )
                    //             max_concurrent_requests: 3
                    //             // max_concurrent_requests: 20
                    //         }),
                    //         wait = [],
                    //         ct = 0;

                    //     var after = function () {
                    //         console.warn('bin req test after');
                    //         ct++;
                    //         if ( ct >= 10 ) {
                    //             queue.abort()
                    //         }
                    //     };

                    //     for ( var i=0; i<20; i++ ) {
                    //         //var req = fetch_torrent_binary( 'http://www.clearbits.net/get/979-valkaama---music-michael-georgi.torrent?v='+_bt.getTime(), queue );
                            
                    //         var opts = {
                    //                 //url: 'http://www.clearbits.net/get/979-valkaama---music-michael-georgi.torrent?v='+_bt.getTime(),
                    //                 url: 'http://www.clearbits.net/torrents/979-valkaama---music-michael-georgi?v='+_bt.getTime(),
                    //                 timeout: ajax_timeout,
                    //                 //timeout: 100,
                    //                 dataType: 'html'
                    //             },
                    //             req = queue.push(opts);

                    //         req.then( after, after );

                    //         wait.push( req );
                    //     }

                    //     Q.all( wait ).then( function () {
                    //         console.warn('BIN REQ TEST ALL DONE', arguments);
                    //     }, function () {
                    //         console.warn('BIN REQ TEST ALL ERROR', arguments);
                    //     });

                    //     setTimeout( function () {
                    //         //queue.abort();
                    //     }, 3000);

                    // }, 4000);

                }
            },

            bind_events = function () {
                // //EVENT/MESSAGE HANDLING
                //listen for check commands
                observer.on('check', on_check);
                observer.on('spellcheck', on_check_spelling );
                // Bt.msg.on( Bt.events.DISCOVER, on_discover );
                // Bt.msg.on( Bt.events.ATTEMPT_ADD_SITE, on_attempt_add_site )
                // Bt.msg.on( Bt.events.CHECK_SPELLING, on_check_spelling );
                // Bt.msg.on( Bt.events.SEARCH, on_query );
            },

            // might want to separate this into two functions.  the one that does the request uses a 
            // promise to pass back suggestion, and the msg handler actually sends the message to the rest of the extension
            on_check_spelling = function ( opts ) {
                //console.warn('got spellcheck request', opts);
                //care about opts.query
                var req = Ajax.request({
                    url: 'http://www.google.com/search?q=' + opts.query,
                    dataType: 'html'
                });

                req.then(
                    //success
                    function ( response ) {
                        // Looks for the spelling suggestion inside an element `a.spell`
                        var matches = /<a[^>]+class="?spell"?[^>]*>(<[^<>]+>)*(.+?)(<\/[^<>]+>)*<\/a>/mi.exec( response.data );
                        if ( matches && typeof matches[2] !== 'undefined' ) {
                            // Removes some extra html when there are multiple words
                            //var spelling = matches[2].replace(/<\/?[^>]*>/ig, '')
                            var spelling = matches[2].replace( strip_html_regex, '')
                            //console.warn('got spellcheck response', spelling, response );
                            observer.trigger('spell', spelling, opts.query );
                        }
                    },
                    //fail
                    function () {}
                );

            },

            //a tab has been loaded
            on_check = function ( opts ) {
                //opts .data, .favIconUrl, key, target, url, worker
                console.log('on_discover', opts.url);

                if ( opts.manual ) {
                    return on_attempt_add_site.apply( this, arguments );
                }

                my.check_search( opts ).done( function( site ){
                    console.log('on_discover success', site, site.key, site.url );

                    observer.trigger('detected', {
                        search: site,
                        key: opts.key
                    });
                    //Bt.msg.send( Bt.events.SITE_DETECTED, { search: site, key: opts.key }); //legacy
                }).fail( function( site ){
                    console.warn('on_discover FAIL', site.key, site.url );
                    
                    observer.trigger('rejected', {
                        key: opts.key,
                        silent: true
                    });

                    //Bt.msg.send( Bt.events.SITE_DETECTION_FAILED, { key: opts.key, silent: true }); //legacy
                });
            },

            on_attempt_add_site = function ( opts ) {
                console.error('attempt add site', opts );
                var path = opts.url.getBasePath(),
                    base = opts.url.getBaseUrl(),

                    on_success = function ( site ) {
                        console.warn( 'ATTEMPT ADD SUCCESS!', site );
                        //detect the site silently
                        observer.trigger('detected', {
                            search: site,
                            key: path,
                            silent: true
                        });
                        //then add the site loudly
                        observer.trigger('added', {
                            key: path,
                            track: true
                        });
                    },
                    on_fail = function ( site ) {
                        //console.error('ATTEMPT ADD FAIL!', site);
                        //fail the check loudly
                        observer.trigger('add_fail', {
                            key: path,
                            silent: false
                        });
                    };

                observer.trigger( 'attempt_add', path );

                get_root_source( opts.url )
                    .fail( on_fail )
                    .done( function ( data ) {
                        //html of root gotten
                        my.check_search({
                            
                            favicon: null,
                            html: data,
                            key: path,
                            url: base

                        }).then( on_success, on_fail );
                    });

                console.error( 'on_attempt_add_site', opts );


            },

            on_query = function ( opts ) {

                console.error('on_query', opts.query, opts.search.url, opts );

                //change 'search' key to 'site' for backwards compatibility from rest of application
                if( opts.search && ! opts.site ) {
                    opts.site = opts.search;
                    delete opts.search;
                }

                my.query( opts );

            },

            // checks whether a site and/or it's root page
            // is a torrent client
            check_potential = function( opts ) {
                var dfd = new $.Deferred(),
                    url = opts.url,
                    base = url.getBaseUrl(),
                    html = opts.html;

                //console.error( 'check_potential', opts, url, base, url.strip('/') );

                if ( base.substr(0, 4) !== 'http' ) {
                    dfd.reject( opts );
                } else if ( is_potential( html ) ) {
                    //check the current page source
                    dfd.resolve( opts );
                } else if ( url.strip('/') !== base ) {
                    //fetch the root source and check
                    get_root_source( url )
                        .fail( function(){
                            dfd.reject( opts );
                        })
                        .done( function( data ){
                            //data = data.trim();

                            //original url and html have changed, so update the opts
                            _.extend( opts, { url: base, html: data });

                            is_potential( data ) ?
                                dfd.resolve( opts ) :
                                dfd.reject( opts );
                        });
                } else {
                    dfd.reject( opts );
                }

                return dfd.promise();
            },

            //does a query on the site
            do_search = function ( site, query, is_test ) {
                //var dfd = ( is_test ? new $.Deferred() : null );
                var dfd = new $.Deferred();

                if( !site ) {
                    if ( is_test ) {
                        dfd.reject();
                        return dfd.promise();
                    }
                    return null;
                }

                var is_special = _app_helpers.check_is_special( site.url.getBaseUrl() ),
                    is_archive = ( is_special === 'archive' ),

                    is_btfc = ( site.url.indexOf( config.app.btfc_url[ config.env ] ) >= 0 ),

                    pattern_length = ( is_special ? 2 : 1 ),

                    query_param = {},
                    base = site.url.getBaseUrl(),
                    temp_level_1_pattern_cache = {},
                    request_opts,
                    analyze;

                // need to do some special checking to see if the site is archive 
                // or a special ( read: default search engine )
                if ( is_special && is_test ) {
                    dfd.reject( site );
                    return dfd.promise();
                }


				if ( site.param ) {
					query_param[ site.param ] = query + ( 
						is_archive ? 
							' AND format:"Archive BitTorrent"' :
							is_special ? 
								' torrent' : '' 
					);
				}

                request_opts = {
                    url:        site.url,
                    data:       _.extend( query_param, site.hidden_els ),
                    beforeSend: 'emptyAjaxHeader',
                    dataType:   'html',
                    timeout:    ajax_timeout
                };

                // in the meantime, just request
                Ajax.request( request_opts ).then(
                    //done
                    function( response ){
                        
                        var data = response.data,
                            level_1_opts = {
                                site: site,
                                query: query,
                                data: data,
                                is_test: is_test,
                                pattern_length: pattern_length,
                                is_special: is_special
                            };

                        //analyze level 1
                        var analyze = ( 
                                is_archive ? 
                                    analyze_archive_response( level_1_opts ) : 
                                    is_btfc ?
                                        analyze_btfc_response( level_1_opts ) :
                                        analyze_level_1( level_1_opts ) 
                            );

                        //if( is_test ) {
                            analyze
                                .done( function( passed ) {
                                    console.log('LEVEL 1 ANALYZE SUCCESS', passed );

                                    if( passed && is_test ) {
                                        dfd.resolve( site );
                                    } else if ( is_test ) {
                                        dfd.reject( site );
                                    } else {
                                        //not a test.  just say the query is done
                                        dfd.resolve( site );
                                    }
                                })
                                .fail( function( opts ) {
                                    console.error('LEVEL 1 ANALYZE FAIL... pass it up to reject the site?', opts );
                                    dfd.reject( opts.site );
                                })
                        //}
                    },
                    //fail
                    function(  ){
						if ( site.cache_lookup_succeeded ) {
							site.cache_lookup_succeeded = false;
						}
						console.log('failed site', site);
                        console.error('do search ajax request fail', arguments);
                        dfd.reject( site );
                    }
                );


                console.error('do search in bt.parser', site, query, is_btfc );


                return dfd.promise();
            },

            process_result = function ( opts, result, is_btfc_recommendation ) {
					if ( result && result !== undefined ) {
						var me      = result,
							url     = me.href,
							torrent = me.torrent,
							title   = me.title,
							tax     = {
										type:       me.type,
										category:   me.category,
										tags:       me.tags
									  };

						var is_recommendation = is_btfc_recommendation || false;
						//extend the link and download data onto opts
						_.extend( opts, {
							url: url,
							link: {
								href: url,
								text: title
							},
							downloads: {
								torrents: [ torrent ],
								magnets: []
							}
						});
					}
					_.extend( opts, {
						is_btfc_recommendation: is_recommendation,
						is_btfc_result: !is_recommendation 
					});
                    //send the result
                    send_query_result( opts );
            },
            
            //analyze a json response returned from bittorrent featured content
            analyze_btfc_response = function ( opts ) {
                var dfd = new $.Deferred(),
                    json = JSON.parse( opts.data ),
                    found_view_ct = 0;

				var _process_results = function(titles) {
					for ( var i=0, len=titles.length; i<len; i++ ) {
						process_result ( opts, titles[i] );
						found_view_ct++;
						//check if max views have been reached
						console.log('anlyze btfc loop', found_view_ct, 
								max_query_results );
						if ( found_view_ct >= max_query_results ) {
							console.error('BREAK:  anlyze btfc loop', 
									found_view_ct, max_query_results );
							break;
						}
					}
				};

                console.error('analyze btfc response', opts, json );
                if ( json && json.recommendations && json.recommendations.length > 0 ) {
					// if the query is the same as the recommended genres and 
					// there is only recommended genre those are results
					if ( json.recommended_genres.length == 1 && 
							opts.query === json.recommended_genres[0] ) {
						_process_results(json.recommendations);
					}
					else {
						var contained_matches = [];
						
						var query = opts.query;
						if ( query.length > 2 ) {
							var clean = query.trim().toLowerCase();
							for ( var i=0, len=json.recommendations.length; i<len; i++ ) {
								if ( json.recommendations[i].title.toLowerCase().indexOf( clean ) >= 0 ) {
									contained_matches.push( 
										json.recommendations[i] );
								}
							}
						}
						
						// if the query is fully contained in the recommended
						// title, that is a result too
						if ( contained_matches.length > 0 ) {
							_process_results(contained_matches);
						} else {
							//there are recommendations set the genres aside
							opts.recommended_genres = json.recommended_genres;
							//send result for each recommendation returned
							for ( var i=0, len=json.recommendations.length; i<len; i++ ) {
								//keep track of the order the recommendations came in
								opts.order = i;
								//process the recommendation
								process_result( opts, json.recommendations[ i ], true );
							}
						}
					}
                    console.error( 'GOT BTFC RECOMMENDATIONS', opts );
                    dfd.resolve( opts );
                } else {
                    console.error('SOMETHING WENT WRONG IN ANALYZE BTFC, or there is just nothing there', opts, json);
                    dfd.resolve( opts );
                }

                return dfd.promise();
            },

            // analyze a json return from archive.org
            analyze_archive_response = function ( opts ) {
                var dfd =           new $.Deferred(),
                    json =          JSON.parse( opts.data ),
                    found_view_ct = 0;

                if ( json && json.response && json.response.docs ) {

                    for ( var i=0, len=json.response.docs.length; i<len; i++ ) {
                        var url = 'http://archive.org/details/' + json.response.docs[ i ].identifier;
                        //extend the link and download data onto opts
                        _.extend( opts, {
                            url: url,
                            link: {
                                href: url,
                                text: json.response.docs[ i ].title
                            },
                            downloads: {
                                torrents: [ 'http://archive.org/download/' + json.response.docs[ i ].identifier + '/' + json.response.docs[ i ].identifier + '_archive.torrent' ],
                                magnets: []
                            },
                            is_archive: true
                        });
                        //send the result
                        send_query_result( opts );
                        //increment the counter
                        found_view_ct++;
                        //check if max views have been reached
                        if ( found_view_ct >= max_query_results ) {
                            break;
                        }
                    }
                    
                    dfd.resolve( opts );

                } else {
                    console.error('SOMETHING WENT WRONG IN ANALYZE ARCHIVE', opts, json);
                    dfd.resolve( opts );
                }
            
                return dfd.promise();
            },

            // analyze a search results page
            // goal:  return whitelisted links, or create a whitelist for sites that aren't yet checked
            // and set up a temporary header cache to hit true or false on success
            // at this level, ignore .torrent and .magnet links.  
            // why?  there is no context for those links to get view page links
            // or any text for the results.
            // GOAL:  FIND VIEW PAGES.
            analyze_level_1 = function ( opts ) {
                //opts includes .site, .query, .is_test, and .data ( html ), .pattern_length
                var dfd = new $.Deferred();
                //declare variables
                var links,
                    potentials = [], //holds promises for all of the l2 view page request/analyzations
                    base = opts.site.url.getBaseUrl(),
                    path = opts.site.url.getBasePath();

                //console.error('analyze level 1', opts, links);

                //prepare the cache ( makes entries if there are none, and clears existing ones if past expiration time )
                cache.prepare( 'l1', path, base );

                //get links
                links = get_links( opts.data );

                if ( ! links.length ) {
                    dfd.reject();
                    return;
                }

                //console.error('analyze level 1 links', JSON.stringify( links, null, 4 ) );

                //check structure

                //don't request the same link twice
                var condensed_links = {};
                //condense the link hrefs to avoid double requests
                for ( var i=0, len=links.length; i<len; i++ ) {
                    //check the text on the link
                    if ( links[i].href.indexOf('irc://') === 0 ) continue;
                    var url_key = parse_href( links[i].href, base );
                    // if it doesn't have an alpha character, skip it 
                    //      ( although this regex has some issues, so I am going to leave the console statements, just comment out the block )
                    // OR if the name itself is less than 5 characters in length, skip it.
                    //      this prevents sites with links to view pages attached to basic metadata from returning uselessly named results
                    
                    // var this_test = alpha_regex.test( links[i].text );
                    // if ( this_test ) {
                    //  console.warn('test passed', links[i].text.length, this_test, links[i].text);
                    // } else {
                    //  console.warn('test FAILED', links[i].text.length, this_test, links[i].text);
                    // }

                    if( links[i].text.length < 4 || !alpha_regex.test( links[i].text ) )
                        continue;
                    //otherwise write it.
                    if ( !condensed_links[ url_key ] || condensed_links[ url_key ].text.length < links[i].text.length )
                        condensed_links[ url_key ] = links[i];
                }

                //make a RequestQueue for level 2
                //and push the potentials into it.
                var queue = new RequestQueue({ 
                        func: Ajax.request,
                        spacing: ( opts.is_special ? 200 : 100 ),
                        max_concurrent_requests: ( opts.is_special ? 5 : 10 )
                    }),
                    found_view_ct = 0;

                //console.error('condensed links', condensed_links, links );
                
                //iterate through the condensed links and make the request if if passes cache check ( blacklist or whitelist )
                _.each( condensed_links, function( link, url_key ){

                    //var cache = pattern_cache[ 'l1' ][ path ];
                    var _cache = cache.get('l1', path);

                    //does site have a specific way to decode links?
                    if ( _cache.d ) {
                        link.href = decode_href( link.href, _cache.d );
                        url_key = parse_href( link.href, base );
                        //path = url_key.getBasePath();
                    }

                    var structure = get_link_structure( link.href );
                    structure = clean_link_structure( structure, path );
                    console.log( structure, link.href, path );

                    //console.warn('special?', _app_helpers.check_is_special( url_key.getBaseUrl() ), url_key.getBaseUrl() );
                    if ( opts.is_special && _app_helpers.check_is_special( url_key.getBaseUrl() ) ) {
                        console.error( 'special and same domain!', link.href, path );
                        return;
                    }

                    var cleaned_href = structure.join('/');

                    if( !structure.length || link.href.indexOf('#') !== -1 || structure[0] === 'search' || link.text.toLowerCase() === 'cached' ) {
                        //console.log( structure, link.href, path );
                        return;
                    }

                    //get the pattern ready for the black/whitelisting
                    var pattern = get_pattern( structure, opts.pattern_length );

                    //compare to blacklist/whitelist: 
                    //if ( ( cache.w && cache.w === structure[ 0 ] ) || ( !cache.p[ structure[0] ] && ( structure.length > 1 || link.href.indexOf('.html') !== -1 ) && link.href.indexOf('.torrent') === -1 && link.href.indexOf('magnet:?') === -1 ) ) {
                    //if ( ( cache.is_whitelisted( 'l1', path, pattern ) || ( !cache.is_blacklisted( 'l1', path, pattern ) ) && ( structure.length > 1 || link.href.indexOf('.html') !== -1 || link.href.indexOf('.php') !== -1 ) && link.href.indexOf('.torrent') === -1 && link.href.indexOf('magnet:?') === -1 ) ) {
                    if ( ( cache.is_whitelisted( 'l1', path, pattern ) || ( !cache.is_blacklisted( 'l1', path, pattern ) )  && cleaned_href.indexOf('.torrent') === -1 && cleaned_href.indexOf('magnet:?') === -1 ) ) {
                    //if ( ( cache.w && cache.w === structure[ 0 ] ) || ( !cache.p[ structure[0] ] && ( structure.length > 1 || link.href.indexOf('.html') !== -1 ) && link.href.indexOf('magnet:?') === -1 ) ) {

                        // debugger;
                        //console.info( link.href, url_key );
                        var req = request_level_2({
                                url:            url_key,
                                link:           link,
                                structure:      structure,
                                path:           path,
                                is_test:        opts.is_test,
                                query:          opts.query,
                                queue:          queue,
                                site:           opts.site,
                                pattern_length: opts.pattern_length,
                                pattern:        pattern
                            });

                        //keep track of the number of view pages found
                        req.done( function( new_opts ){
                            if( new_opts.downloads ) {
                                found_view_ct++;

                                //console.error('analyze_level_1 request_level_2 done with downloads', found_view_ct, max_query_results );

                                if ( found_view_ct >= max_query_results ) {
                                    //console.error('aborting queue', new_opts );
                                    queue.abort();
                                }
                            }
                        });

                        potentials.push( req );

                    // } else {
                    //     console.warn( 'not checking', structure, link.href, path );
                    }


                });

                //resolve with found link block
                //reject if !links left
                //console.error('ANALYZE LEVEL 1', links, opts, cache.get() );
                //if( opts.is_test ) {
                    $.when.apply( $, potentials )
                        .then(
                            function( ){
                                var pass = did_test_search_pass( Array.prototype.slice.call( arguments, 0 ) );

                                dfd.resolve( pass );

                                console.error('l1 REQS DONE', pass);
                            },
                            function( a, b, c ){
                                console.error('l1 REQS FAIL', a, b, c );
                            }
                        );
                //}

                return dfd.promise();
            },

            did_test_search_pass = function( results ) {
                var ret = false;
                for ( var i=0, len=results.length; i<len; i++ ) {
                    if( results[i].downloads ){
                        ret = true;
                        break;
                    }
                }
                console.log('DID TEST SEARCH PASS?', typeof results, ret );
                return ret;
            },

            //.url, .link, .structure, .path, .is_test, .query, .site, .queue, .deep_check
            request_level_2 = function ( opts ) {
                var dfd = new $.Deferred();

                var request_opts = {
                    url:        opts.url,
                    beforeSend: 'emptyAjaxHeader',
                    dataType:   'html',
                    timeout:    ajax_timeout
                };
                //console.log( 'requesting level 2', !!opts.deep_check, opts.url );
                
                //push the options to the request queue
                opts.queue.push( request_opts ).then(
                    //done
                    function( response ) {
                        //console.log('got data req l2', opts.url, response.data.length);
                        var data = response.data,
                            l2_analyze = analyze_level_2 ( _.extend( opts, { html: data } ) );

                        l2_analyze
                            .done(function( torrent_links, decoded ){                                
                                //console.warn( (opts.deep_check ? 'DEEP CHECK ' : '' ) + 'DONE: l2_analyze', torrent_links, request_opts.url, opts.deep_check);
                                cache.whitelist( 'l1', opts.path, opts.pattern );
                                _.extend( opts, { downloads: torrent_links } )
                                dfd.resolve( opts );

                                if ( !opts.is_test && !opts.queue.aborted ) {
                                    send_query_result( opts, decoded );
                                }
                            })
                            .fail(function( torrent_links ){
                                //console.warn( (opts.deep_check ? 'DEEP CHECK ' : '' ) + 'FAIL: l2_analyze', torrent_links, request_opts.url, opts.deep_check );
                                cache.blacklist( 'l1', opts.path, opts.pattern );
                                dfd.resolve( opts );
                            });
                    },
                    //fail
                    function( response ) {
                        console.error('level 2 request fail', response, opts.url);
                        //cache.blacklist( 'l1', path, structure[0] );
                        dfd.resolve( opts );
                    }
                );

                return dfd.promise();
            },

            // analyzes html to determine if this is a 'view' page
            // this function needs to interface with the header 
            // cache, so that if it gets rejected, then this structure is blacklisted
            // looks for .torrent and/or .magnet links
            // but only 1 of each?
            // GOAL: CONFIRM VIEW PAGE AND FIND DOWNLOAD LINKS
            analyze_level_2 = function ( opts ) {
                //have .url, .link, and .html, .structure, .path, and potentially a flag that this is a sub link finder request ( .deep_check )
                var dfd = new $.Deferred(),
                    current_page = opts.link,
                    path = opts.path,
                    base = opts.url.getBaseUrl(),
                    download_links = get_download_links( opts.html ),
                    max_view_links = 9,
                    //hold onto decoded torrent binary data to prevent another request in send_query_result
                    decoded;

                //console.log('analyze level 2', opts.url, _.clone( download_links ) );

                //no links
                if ( download_links.magnets.length === 0 && download_links.torrents.length === 0 ) {
                    //console.log('NO LINKS ON PAGE, NOT A VIEW', current_page.href);
                    dfd.reject( download_links );
                } else if ( download_links.torrents.length === 0 && download_links.magnets.length <= max_view_links ) {
                    //only magnet links, and meets criteria
                    //console.error('no torrent links');
                    dfd.resolve( download_links );
                } else if ( download_links.torrents.length && download_links.torrents.length <= max_view_links ) {  //jesus.  make sure to check against max_view_links.  maybe make it 2 * that.  some sites return lists with thousands of torrents.  HELLO CRASHING EXTENSION IN THAT SITUATION
                    //check the .torrent download links against l2 pattern cache
                    //  remove any that are structurally blacklisted
                    //if pass, test it for header
                    //  if fail, blacklist structure in l2 pattern cache
                    //  if pass, whitelist the structure in l2 pattern cache
                    //since we can now get binary data for .torrent files,
                    //we prioritize the .torrent files over magnet links.  so make sure to test them
                    //by the time a site is detected, the blacklist should be built and that should save time
                    var header_tests = [],
                        passed_links = [],
                        //header_queue = new RequestQueue({ func: Bt.ajax.request_header });
                        header_queue = new RequestQueue({});

                    //console.warn((opts.deep_check ? 'DEEP CHECK ' : '' ) + 'download links at analyze_level_2', { url: opts.url, dl_links: download_links, opts: opts }, opts.deep_check);
                    //prepare the cache ( makes entries if there are none, and clears existing ones if past expiration time )
                    cache.prepare( 'l2', path, base );

                    //console.error('have potential torrent links');

                    //test the headers on each of the torrent links
                    download_links.torrents.forEach( function( link, i, arr ) {
                        //only check first link?
                        if ( i > 0 ) { return false; }
                        //TODO:  figure out a way to not have to clone the opts
                        var req_queue = opts.queue,
                            test_opts = _.clone( opts );

                        test_opts.header_queue = header_queue;
                        test_opts.queue = req_queue;

                        // var test = test_torrent_header( link, _.extend( opts, { header_queue: queue } ) );
                        var test = test_torrent_header( link, test_opts, i );
                        
                        //should always resolve
                        test
                            .done( function( passed_arr, bin_decoded ) {
                                passed_links = passed_links.concat( passed_arr );
                                if ( bin_decoded ) {
                                    decoded = bin_decoded;
                                }
                                console.log('test_torrent_header resolved passed_links', opts.url, passed_links, passed_arr)
                            });

                        header_tests.push( test );
                    });

                    var test_if_passed = function () {
                        download_links.torrents = passed_links;

                        //console.warn((opts.deep_check ? 'DEEP CHECK ' : '' ) + 'TEST IF PASSED', download_links.torrents.length, download_links.magnets.length, JSON.stringify(passed_links), opts.url, opts.deep_check );
                        //check against max view links
                        if ( ( download_links.torrents.length > max_view_links ) || ( download_links.magnets.length > max_view_links ) ) {
                            dfd.reject( download_links );
                        } else if ( download_links.torrents.length || download_links.magnets.length ) {
                            dfd.resolve( download_links, decoded );
                        } else {
                            dfd.reject( download_links );
                        }
                        return;
                    };

                    //test_torrent_header only resolves, so this can be a noop for now
                    var all_done_error = function () {
                        //console.error((opts.deep_check ? 'DEEP CHECK ' : '' ) + 'FAIL WHEN HEADER TESTS', opts.url);
                    };

                    //listen for when the header tests are done to determine what to do.
                    $.when.apply( $, header_tests ).then( test_if_passed, all_done_error );

                } else {
                    //too many links
                    dfd.reject( download_links );
                    //console.log('TOO MANY LINKS.  SHOULD NOT BE A VIEW PAGE', download_links, current_page.href, opts.structure[0] );
                }

                return dfd.promise();
            },

            //makes a level 2 request only checking for .torrent links on a deeper page.
            //resolves with found legit torrent links
            //fails if none found
            request_level_3 = function ( url, opts ) {
                var dfd =           new $.Deferred(),
                    structure =     get_link_structure( url ),
                    path =          opts.path;

                structure = clean_link_structure( structure, path );

                var pattern = get_pattern( structure, opts.pattern_length );

                //check against l1 white/blacklist
                if ( ( cache.is_whitelisted( 'l2', path, pattern ) || !cache.is_blacklisted( 'l2', path, pattern ) ) && structure.length > 1 ) {

                    opts.url = url;
                    opts.structure = structure;
                    opts.is_test = true;
                    opts.pattern = pattern;

                    //console.log( 'request_level_3', opts.url);
                    var req = request_level_2( opts );
                    //l2 request always resolves.
                    req.done( function( new_opts ){
                            //keep track of the number of view pages found
                            if( new_opts.downloads && new_opts.downloads.torrents.length ) {
                                dfd.resolve( new_opts.downloads.torrents );
                                //console.warn('REQUEST L3 DONE', new_opts.downloads.torrents, opts.url );
                            } else {
                                //blacklist the site?... think not.
                                dfd.reject();
                                //console.warn('REQUEST L3 FAIL', new_opts, opts.url);
                            }
                        });

                } else {
                    dfd.reject();
                }

                return dfd.promise();
            },

            // tests the header to a .torrent link to make sure it is actually a .torrent.  
            // fail example: it is a redirect or returns html
            // url is url to test, opts is the parent opts passed in
            // resolve with torrent link if one is found/the link itself is legit, false if not
            test_torrent_header = function ( url, opts, index ) {
                var dfd =           new $.Deferred(),
                    path =          opts.path,
                    link =          parse_href( url, opts.url.getBaseUrl() ),
                    structure =     get_link_structure( link );

                structure = clean_link_structure( structure, path );

                var pattern = get_pattern( structure, opts.pattern_length );

                console.log('before b4', link, structure, structure.length, cache.is_blacklisted( 'l2', path, pattern ) );

                //check white/blacklist at level 2
                //if ( ( cache.is_whitelisted( 'l2', path, pattern ) || !cache.is_blacklisted( 'l2', path, pattern ) ) && structure.length > 1 ) {
                if ( ( cache.is_whitelisted( 'l2', path, pattern ) || !cache.is_blacklisted( 'l2', path, pattern ) ) ) {
                    //console.log('test_torrent_header', link);
                    
                    //request the headers
                    request_torrent_header ( link, opts )
                        //request_torrent_header ALWAYS resolves
                        .done( function( response ){
                            var headers = response.data;

                            // console.log( 'GOT HEADERS', link, JSON.stringify( headers, null, 4 ));

                            if( ! headers ) {
                                console.warn('NO HEADERS', link);
                                // cache.blacklist( 'l2', path, pattern );
                                // dfd.resolve([]);

                                var torrent_bin_success = function ( decoded ) {
                                        //console.warn('TORRENT BINARY FETCH DONE!', link, decoded);
                                        cache.whitelist( 'l2', path, pattern );
                                        dfd.resolve([ link ], decoded );
                                    },
                                    torrent_bin_error = function () {
                                        cache.blacklist( 'l2', path, pattern );
                                        dfd.resolve([]);
                                    };

                                if ( index === 0 ) {
                                    console.warn('NO HEADERS.  FIRST REQUEST', link);
                                    //try and fetch the torrent binary for the hell of it first.
                                    //pass in the header queue to put these requests in line
                                    fetch_torrent_binary( link, opts.header_queue )
                                        .then( torrent_bin_success, torrent_bin_error );

                                } else {
                                    torrent_bin_error();                                
                                }
                                //dfd.resolve([ link ]);
                                return;
                            }

                            var disposition =   headers['content-disposition'],
                                type =          headers['content-type'];

                            //console.log( 'GOT HEADERS', link, (opts.deep_check ? 'DEEP CHECK ' : '' ) + 'DISPOSITION CHECK', ( type === 'text/html' && !opts.deep_check ), disposition, type, { link: link, opts_url: opts.url, opts_deep_check: opts.deep_check });
                            //console.log( 'GOT HEADERS', link, JSON.stringify( headers, null, 4 ));

                            if ( type === 'text/html' && !opts.deep_check ) {
                                //console.log('NEED TO REQUEST A LEVEL 3, (DEEPER LEVEL 2)', link, opts.url, opts.deep_check );

                                var l3_req = request_level_3( link, opts );

                                l3_req
                                    .done( function( torrent_links ){
                                        //look, we found torrent links!
                                        //console.warn('REQUEST L3 DONE', torrent_links, link, opts.url );
                                        //whitelist l2 the pattern?... not here
                                        dfd.resolve( torrent_links );
                                    })
                                    .fail( function(){
                                        //no .torrent links found down there
                                        //console.warn('REQUEST L3 FAIL', opts.url);
                                        //blacklist l2 the pattern?... not here
                                        dfd.resolve([]);
                                    });

                                return;
                            } 

                            if ( type !== 'application/x-bittorrent' && type !== 'application/octet-stream' && ( !disposition || disposition.indexOf('.torrent') === -1 ) ) {
                                //failed filename check
                                cache.blacklist( 'l2', path, pattern );
                                dfd.resolve([]);
                                //console.warn( (opts.deep_check ? 'DEEP CHECK ' : '' ) + 'DISPOSITION CHECK FAIL', disposition, type, opts.url, opts.deep_check );
                            } else {
                                //passed filename check
                                cache.whitelist( 'l2', path, pattern );
                                dfd.resolve( [ link ] );
                                //console.error( (opts.deep_check ? 'DEEP CHECK ' : '' ) + 'DISPOSITION CHECK PASS', disposition, type, opts.url, opts.deep_check, link );
                            }

                            return;

                        }); //always resolves

                } else {
                    //pattern is blacklisted for sure.
                    dfd.resolve([]);
                }

                return dfd.promise();
            },

            request_torrent_header = function ( url, opts ) {
                var dfd = new $.Deferred();

                var request_opts =  {
                        url: url,
                        timeout: ajax_timeout,
                        dataType: 'head',
                        before_send: 'emptyAjaxHeader'
                    };

                    //push the options into the header request queue
                    opts.header_queue.push( request_opts )
                        .done( function ( data ) {
                            console.log('PASS: header req');
                            // console.warn('HEADER REQ SUCCESS', {
                            //  args: arguments,
                            //  opts: opts,
                            //  link: link
                            // });
                            dfd.resolve( data )
                        })
                        .fail( function ( ) {
                            console.log('FAIL: header req');
                            // console.warn('HEADER REQ FAIL', {
                            //  args: arguments,
                            //  opts: opts,
                            //  link: link
                            // });
                            dfd.resolve( false )
                        });

                return dfd.promise();
            },

            //gets all 
            get_download_links = function( html ) {
                var links = get_links( html ),
                    ret = {
                        magnets: [],
                        torrents: []
                    };

                    for ( var i=0, len=links.length; i<len; i++ ) {
                        //var this_href = l2_links[i].href.split('?')[0];
                        var this_href = links[i].href,
                            no_params = this_href.split('?')[0];

                        // if( this_href.indexOf('.torrent') !== -1 ) {
                        //  console.log('each .torrent download link', this_href);
                        //  //console.log( this_href.indexOf('.torrent') !== -1 && this_href.indexOf('.torrent') === this_href.length - 8 && !_.contains( ret.torrents, this_href ) );
                        //  console.log( ( 
                        //      this_href.indexOf('.torrent') !== -1 && this_href.indexOf('.torrent') === this_href.length - 8 && !_.contains( ret.torrents, this_href ) ),
                        //      this_href.indexOf('.torrent') !== -1, 
                        //      this_href.indexOf('.torrent') === this_href.length - 8, 
                        //      this_href.substring( this_href.length, this_href.length - 8 ) === '.torrent',
                        //      this_href.split('?')[0].indexOf('.torrent') === this_href.split('?')[0].length - 8, 
                        //      no_params.substring( no_params.length, no_params.length - 8 ) === '.torrent',
                        //      !_.contains( ret.torrents, this_href ) 
                        //  );
                        // }


                        //check for magnet links
                        if( this_href.indexOf('magnet:?') === 0 && !_.contains( ret.magnets, this_href ) ) {
                            ret.magnets.push( links[ i ].href );
                            continue;
                        }

                        //check for .torrent links
                        //if ( l2_links[i].href.indexOf('.torrent') !== -1 && l2_links[i].href.indexOf('//www.torrent') === -1 && !_.contains( the_links.torrents, l2_links[i].href ) ) {
                        //if ( this_href.indexOf('.torrent') !== -1 && ( this_href.substring( this_href.length, this_href.length - 8 ) === '.torrent' || no_params.substring( no_params.length, no_params.length - 8 ) === '.torrent' ) && !_.contains( ret.torrents, this_href ) ) {
                        if ( this_href.indexOf('.torrent') !== -1 && ( this_href.substring( this_href.length, this_href.length - 8 ) === '.torrent' || no_params.substring( no_params.length, no_params.length - 8 ) === '.torrent' ) && !_.contains( ret.torrents, this_href ) ) {
                        //if ( this_href.indexOf('.torrent') !== -1 && this_href.indexOf('.torrent') === this_href.length - 8 && !_.contains( ret.torrents, this_href ) ) {
                            ret.torrents.push( this_href );
                            //console.log( this_href.length, this_href.indexOf('.torrent') );
                        }
                    }

                return ret;
            },

            //gets all links on a page and returns array of objects [{ text: '', href: '', title: '' }, {...}, ...]
            get_links = function ( html ) {
            //get_links = function ( html, url ) {
                //var base = url.getBaseUrl();
                var link_attrs = ['title', 'href', 'TITLE', 'HREF'],
                    tags = ['a', 'A'],
                    links = [];

                for ( var t=0, t_len=tags.length; t<t_len; t++ ) {

                    for ( var i=0, arr=html.split('<'+tags[t]), len=arr.length; i<len; i++ ) {
                        var x = arr[i];
                        if( x.indexOf('</'+tags[t]+'>') === -1 )
                            continue;

                        // var link = '<a' + x.split('</a>')[0] + '</a>',
                        //  $link = $(link);

                        // get everything between the a tag
                        var link_str = x.split('</'+tags[t]+'>')[0],
                            link = {},
                            attr_str,
                            text;
                        // split it to shift out attributes
                        link_str = link_str.split('>');
                        // get the attr string
                        attr_str = link_str.shift();
                        // get the inner html, and strip out html to 
                        // get the text using regex defined at top of module
                        link.text = _bt.html_entity_decode( link_str.join('>').replace( strip_html_regex, '' ) ).trim();
                        //text = link_str.join('>').replace( strip_html_regex, '' );

                        //get out the attributes that we want, defined at the top of this function
                        for ( var j=0,len_1=link_attrs.length; j<len_1; j++ ) {
                            var attr = link_attrs[ j ],
                                //to check that the attr exists
                                attr_split = x.split( attr+'=' );
                                //does attr exist?
                                if( attr_split.length < 2 )
                                    //no it doesn't
                                    continue;

                                //yes it does
                                //link[ attr ] = attr_split[1].split(' ')[0].strip('"').strip("'").split('"')[0].split("'")[0];
                                link[ attr.toLowerCase() ] = attr_split[1].split(' ')[0].strip('"').strip("'").split('"')[0].split("'")[0].split('>')[0].strip('"').strip("'").split('"')[0].split("'")[0];
                        }

                        // // if there is no text in the link's inner html, forget this link
                        // if( !link.href || ( !link.text && link.href.indexOf('magnet') === -1 ) )
                        //  continue;
                        //console.log('link', link.href, link.text );

                        if( ! link.href )
                            continue;

                        if( link.href.indexOf('>') !== -1 ) {
                            console.error('MALFORMED link.href', link.href, link, x );
                        }

                        //push the link.  logic for what kinds of links to deal with comes later
                        links.push( link );

                    }

                }

                //console.error( 'get links', { html: html }, url );
                return links;
            },

            //returns an array of the different elements in a link
            get_link_structure = function ( href ) {
                href = href.strip('/').split('/');
                while( href.length && ( href[0].indexOf('http') === 0 || href[0] === '' ) ) {
                    href.shift();
                }
                return href;
            },

            //cleans path out of structure array
            clean_link_structure = function ( structure, path ) {
                var done = false;
                //console.log('clean_link_structure', path, structure)

                while ( ! done ) {
                    //if( structure.length && ( structure[0] === path || structure[0] === 'url?q=http:' || structure[0] === '' ) ) {
                    if( structure.length && ( structure[0] === path || structure[0] === '' || structure[0].indexOf( path ) > -1 ) ) {
                        //console.log('shifting');
                        structure.shift();
                    } else {
                        done = true;
                    }
                }

                // if( structure.length && structure[0] === path ){
                //  //console.log('shifting structure');
                //  structure.shift();
                // }

                return structure;
            },

            //gets the pattern to check against pattern cache.  search engines need a more specific pattern
            get_pattern = function ( structure, num_els ) {
                var ret = [];
                for ( var i=0; i<num_els; i++ ) {
                    ret.push( structure[ i ] );
                }
                ret = ret.join('_');
                if( ret.indexOf('?') > 0 ) ret = ret.split('?')[0];
                return ret;
            },

            //fetches the html source of the root page of any site
            get_root_source = function ( url ) {
                var dfd = new $.Deferred();

                Ajax.request({
                    url: url.getBaseUrl(),
                    dataType: 'html'
                }).then( 
                    //doneso
                    function( response ) {
                        dfd.resolve( response.data );
                    },
                    //fail
                    function( data ) {
                        dfd.reject();
                    }
                );

                return dfd.promise();
            },

            // Looks for a search form and returns
            // an object with the search parameters needed
            get_search_url = function ( opts ) {

                var html = opts.html,
                    base = opts.url.getBaseUrl(),
                    forms = [],
                    search = [],
                    hidden_els = {};

                //console.log('GET SEARCH URL', { html: html }, opts );
                for ( var i=0, arr=html.split('<form'), len=arr.length; i<len; i++ ) {
                    var x = arr[i];
                    //if( x.indexOf('</form>') === -1 || x.indexOf('search') === -1 )
                    if( x.indexOf('</form>') === -1 || ( x.indexOf('search') === -1 && arr[i-1].indexOf('search') === -1 ) )
                        continue;
                    //console.log('form split', { part: x }, x.indexOf('</form>'), x.indexOf('search') );
                    forms.push( '<form' + x.split('</form>')[0] + '</form>' );
                }
                //console.log('forms?', forms);

                for ( var i=0, len=forms.length; i<len; i++ ) {
                    var x = forms[i];
                    if ( x.indexOf('action=') === -1 )
                        continue;
                    //setup variables
                    var action, param_name = false, hidden = {}, name_split;
                    //get the action
                    action = x.split('action=')[1].split(' ')[0].strip('"').strip("'").split('"')[0].split("'")[0];
                    //get the main param and hidden els
                    for ( var j=0, arr=x.split('<input'), len_1=arr.length; j<len_1; j++ ) {
                        var y = arr[j];
                        //console.log(y);
                        if( y.indexOf('type="text"') !== -1 || y.indexOf('type="search"') !== -1 || y.indexOf("type='text'") !== -1 || y.indexOf("type='search'") !== -1 ) {
                            //main param
                            name_split = y.split('name=');
                            if( name_split.length > 1 )
                                param_name = name_split[1].split(' ')[0].strip('"').strip("'").split('"')[0].split("'")[0];
                            //console.log('PARAM_NAME?', param_name);
                        } else if ( y.indexOf('type="hidden"') !== -1 || y.indexOf("type='hidden'") !== -1 ) {
                            //hidden els
                            name_split = y.split('name=');
                            value_split = y.split('value=');
                            if( name_split.length > 1 && value_split.length > 1 )
                                hidden[ name_split[1].split(' ')[0].strip('"').strip("'").split('"')[0].split("'")[0] ]
                                    = value_split[1].split(' ')[0].strip('"').strip("'").split('"')[0].split("'")[0];
                            //console.log('hidden?', hidden);
                        } else {
                            continue;
                        }
                    }
                    //console.log('ACTION?', action);

                    //push the found form
                    if ( param_name ) {
                        if( action.indexOf( base ) === 0 )
                            action = action.replace( base, '' );

                        search.push({
                            //url: base + action,
                            url: parse_href( action, base ),
                            param: param_name,
                            hidden_els: hidden
                        });
                    }

                }

                //delete arr; delete len; delete len_1; delete i; delete j; delete y; delete x; delete name_split; delete value_split;

                if( search.length === 0 )
                    return false;
                //logic to decide what search form to return
                search = search[ search.length - 1 ];
                //and add in the favicon
                search.favicon = opts.favicon || get_favicon( opts );

                return search;
            },

            //get the favicon url from the html source
            get_favicon = function( opts ) {
                var base = opts.url.getBaseUrl(),
                    href = '';

                for ( var i=0, arr=opts.html.split('<link'), len=arr.length; i<len; i++ ) {
                    var x = arr[i];
                    if( x.indexOf('rel=') === -1 || x.indexOf('href=') === -1 )
                        continue;
                    //could now potentially be the link we are looking for
                    var link = '<link' + x.split('>')[0] + '>';
                    if ( link.indexOf('icon') === -1 )
                        continue;
                    //basically sure that this is the favicon link
                    href = link.split('href=')[1].split(' ')[0].strip('"').strip("'").split('"')[0].split("'")[0];
                    //var attrs = new RegExp( /(\S+)=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/ ).exec( link );
                    href = parse_href( href, base );
                    break;
                }

                return href;
            },

            //used to turn a relative url to a full path, 
            //or to make sure that it is a full path already
            parse_href = function( href, base ) {
                if ( ( href.indexOf('://') > -1 && href.indexOf('://') < 6 ) || href.indexOf('magnet:') >= 0 ) {
                    return href;
                } else if ( href.indexOf('//') === 0 ) {
                    return 'http:' + href;
                } else {
                    //console.error('adding base to href', base, href[0], href)
                    //add root slash to href if it doesn't have it.
                    //this could be a BAD idea
                    if( href[0] !== '/' )
                        href = '/' + href;
                    return base + href;
                }
            },

            //certain sites need their links decoded... like search engines
            decode_href = function( href, splitter ) {
                var clean = false;
                //split the link based on the decoder param ( arg: splitter )
                _.each( href.split( splitter ), function( el ) {
                    //check to see if this string points to a url
                    if ( el.indexOf('http') > -1 ) {
                        //clean = decodeURIComponent( el );
                        clean = decodeURIComponent( el ).split('&amp;')[0];
                        return false;
                    }
                });

                // console.error('decode_href', {
                //  href: href,
                //  splitter: splitter,
                //  clean: clean
                // });

                return clean || href;
            },

            // called when a view page is found during a query
            // takes all the information and packages it in a way 
            // that the rest of the application understands
            // read: legacy support
            send_query_result = function ( opts, bin_decoded ) { //opts can have is_archive

                var data = {
                        id: opts.url,
                        wait: false,
                        favicon: opts.site.favicon || get_favicon( opts ),
                        torrent: {
                            name: opts.link.text,
                            url: opts.url
                        },
                        is_archive: opts.is_archive,
                        is_duplicate: false, //gets modified at extension level
                        is_btfc_recommendation: opts.is_btfc_recommendation,
                        is_btfc_result: opts.is_btfc_result,
                        download: {}
                    };

                if ( opts.downloads.magnets.length ) {
                    data.download.magnet = opts.downloads.magnets[ 0 ];
                }

                if ( opts.downloads.torrents.length ) {
                    data.download.torrent = parse_href( opts.downloads.torrents[ 0 ], opts.url.getBaseUrl() );
                }

                if ( data.download.torrent && !data.is_btfc_recommendation ) {

                    //console.log('NO MAGNET.  CHECK ON THE TORRENT FILE', opts, data, data.torrent.url);
                    console.log('SEND_QUERY_RESULT. CHECK ON THE TORRENT FILE', data.torrent.url);

                    var process_decoded = function ( decoded ) {
                        var hash, info, files_size = 0, trackers = [];

                        //calculate info hash
                        try { 
                            //this does not calculate the hash correctly
                            hash = sha1Hash( _bt.bencode( decoded.info ) );
                        } catch ( err ) {
                            console.error('HASH CALCULATION FAILED', err);
                        }

                        //get file size
                        if( decoded && decoded.info ) {
                            if( decoded.info.length ) {
                                files_size = decoded.info.length;
                            } else if ( decoded.info.files && decoded.info.files.length ) {
                                for ( var i=0, len=decoded.info.files.length; i<len; i++ ) {
                                    files_size += decoded.info.files[i].length;
                                }
                            }
                        }

                        //add the hash
                        if ( hash )
                            data.hash = hash.toUpperCase();
                        //add the total size
                        if ( files_size )
                            data.files_size = files_size;

                        //get the trackers
                        if ( decoded['announce-list'] ) {
                            decoded['announce-list'].forEach( function( el ){
                                for ( var i=0,len=el.length; i<len; i++ ) {
                                    //var tracker = el[ i ];
                                    trackers.push( el[ i ] );
                                }
                            });
                        } else {
                            trackers.push( decoded.announce );
                        }

                        data.trackers = trackers;

                        if ( ! opts.is_archive ) {
                            if( decoded.title )
                                data.torrent.name = decoded.title;
                            else if ( decoded.info.name )
                                data.torrent.name = decoded.info.name;
                        }

                        console.log( 'send_query_result torrent binary success', JSON.stringify( data ) );
                        //console.log( 'send_query_result torrent binary success', data.torrent.url );

                        // console.warn('BINARY REQUEST DONE', { 
                        //     url: opts.url,
                        //     decoded: decoded,
                        //     hash: hash,
                        //     files_size: files_size,
                        //     result: data
                        // });

                        observer.trigger('result', {
                            data: data,
                            query: opts.query
                        });

                    };

                    if ( !bin_decoded ) {

                        console.warn('NO BIN DECODED');

                        fetch_torrent_binary( data.download.torrent )
                            .then( 
                                function ( decoded_torrent ) {
                                    process_decoded( decoded_torrent );
                                },
                                function () {
                                    observer.trigger('result', {
                                        data: data,
                                        query: opts.query
                                    });                            
                                }
                            );
                    } else {
                        console.warn('have previously decoded torrent data!', bin_decoded );
                        process_decoded( bin_decoded );
                    }

                } else if ( data.download.torrent && data.is_btfc_recommendation ) {
                    data.recommended_genres = opts.recommended_genres;
                    //keep track of the order the recommendations came in
                    data.order = opts.order;
                    //announce the result
                    observer.trigger('result', {
                        data: data,
                        query: opts.query
                    });
                    //Bt.msg.send( Bt.events.TORRENT_LINK_UPDATED, { data: data, query: opts.query } ); //legacy
                } else if ( data.download.magnet ) {
                    observer.trigger('result', {
                        data: data,
                        query: opts.query
                    });
                    //Bt.msg.send( Bt.events.TORRENT_LINK_UPDATED, { data: data, query: opts.query } ); //legacy... delete these
                    //console.log( 'send_query_result magnet', JSON.stringify( data ) );
                } 
            },

            fetch_torrent_binary = function ( torrent_url, queue ) {
                var dfd = new $.Deferred(),
                    opts = {
                        url: torrent_url,
                        timeout: ajax_timeout,
                        //timeout: 100,
                        dataType: 'binary'
                    },
                    req = ( queue ? queue.push( opts ) : Ajax.request( opts ) );

                req.then(
                    //done
                    function( response ) {
                        var binStr = response.data,
                            decoded;

                        //decode the binary
                        try {
                            decoded = _bt.bdecode( binStr );
                        } catch ( err ) {
                            console.error('BDECODE FAILED', err);
                        }

                        if ( decoded && decoded.info ) {
                            dfd.resolve( decoded );
                        } else {
                            dfd.reject();
                        }

                    },
                    //fail
                    function( response ) {
                        //console.error('BINARY REQUEST FAIL', { args: arguments });
                        //console.error( 'send_query_result torrent, binary fail', opts, data );
                        console.warn('BINARY REQUEST FAIL', { url: torrent_url });

                        dfd.reject();
                    }
                );

                return dfd.promise()
            },

            is_potential = function( html ){
                return ! ( html.indexOf('torrent') === -1 && html.indexOf('magnet') === -1 )
            };

        //public functions
        _.extend( my, {

            init: initialize,

            check_search: function( opts ){
                var dfd = new $.Deferred(), 

                    on_check_potential_fail = function( a, b, c ){
                        //console.error('reject site', a, b, c);
                        dfd.reject( opts );
                    },

                    on_check_potential_success = function ( opts_after ) {
                        var site = get_search_url( opts_after );

                        // get_search_url returns false if no search form was found
                        // otherwise, it returns an object with the information needed to search
                        if ( ! site ) {
                            console.warn('check potential success, NO SEARCH FORM FOUND', opts_after, site);
                            dfd.reject( opts_after );
                            return;
                        }

                        console.log('check potential success, found search form', opts_after, site);

                        //now, do a test search
                        do_search( site, test_query, true ).then(
                            //done
                            function( site ){
                                dfd.resolve( site );
                            },
                            //fail
                            function( site ){
                                dfd.reject( site );
                            }
                        );

                    };

                //console.error( 'Bt.Parser.check_search', opts );
                check_potential( opts ).then( on_check_potential_success, on_check_potential_fail );

                return dfd.promise();
            },

            //performs a search query on an individual site
            query: function( opts ) {
                console.error('Bt.Parser.query', opts.query, opts.site.url );
                
                var dfd = Q.defer();

                //now, do the search, false denotes that this is not a test
                var proc = do_search( opts.site, opts.query, false ),
                    callback = function ( site ) {
                        //console.error('QUERY DO SEARCH COMPLETE', site, arguments);
                        dfd.resolve( site );
                    };

                //resolve with either error or success.  only listening for when the process is complete.
                proc.then( callback, callback );
                // proc.done( callback );
                // proc.fail( callback );

                return dfd.promise;
            }

        });


    	return my;
    });

})();
