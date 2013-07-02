/* application specific locations... for manifests, remote sources, etc */
define( function() {
	

	var config = {
		//localhost server while I develop
		//remote_src: 'http://localhost:8888/surf/',
		
		remote_src: {
			dev: 'https://s3.amazonaws.com/stage.static.surf.bittorrent.com/remotejs/',
			stage: 'https://s3.amazonaws.com/stage.static.surf.bittorrent.com/remotejs/',
			prod: 'https://s3.amazonaws.com/static.surf.bittorrent.com/remotejs/'
		},

		//endpoint for the bittorrent featured content search api/recommendation engine
		//btfc_url: 'http://surf.bittorrent.com', //prod
		//TODO:  make this env dependent like remote source
		btfc_url: {
            dev:   'http://stage.surf.bittorrent.com',
            stage: 'http://stage.surf.bittorrent.com',
            prod:  'http://surf.bittorrent.com'
        },

		TBS: 1,
		TBV: 1,
		TBN: 3,

		//google analytics tracking code
		GA: 'UA-36492394-1',

		//notification type constants
		notifications: {
			SARCH_START: 			'search_start',
			SEARCH_COMPLETE: 		'search_complete',
			SCRAPE_COMPLETE: 		'scrape_complete',
			DOWNLOAD_COMPLETE: 		'download_complete',
		 	DOWNLOAD_FAILED: 		'download_failed',
		    DOWNLOAD_STARTED:       'download_started',
		    SEARCH_SITE_ADDED:      'search_site_added',
		    SEARCH_SITE_DECLINED:   'search_site_declined',
		 	ATTEMPT_ADD_SITE: 		'attempt_add_site',
		 	SEARCH_SITE_ADD_FAIL: 	'search_site_add_fail',
		 	SEARCH_SITE_DISCOVERED: 'search_site_discovered',
		    AUTHORIZE_PAIRING:      'pairing_requested',
		    CLIENT_AUTHORIZED:      'client_authorized',
		    CLIP:                   'clip'
		},

		settings_defaults: {
            seed_type: 'percentage', // 'time' or 'percentage'
            seed_time: 10, // In minutes
            seed_percentage: 200,
            default_engine: 'google', // 'google', 'yahoo', or 'bing'
            //two keys for dealing with torrent file association
            //	associate is the boolean that torque app will use to set association
            associate: null, //null for uninitialized, false or true after
            //  user_associate is the boolean that gets set when user has seen association dialog
            remember_association: null, //null for uninitialized, false or true after
            
            first_run: true  //first run path for onboarding
        }
	};

	return config;
});
