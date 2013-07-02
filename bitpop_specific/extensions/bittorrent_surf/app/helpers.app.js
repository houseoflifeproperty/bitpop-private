(function () {

	define(function ( require ) {

		var special_regexes = {
		        // google:     /\/\/(www.)?google.([a-z]){1,3}/i,
		        // bing:       /\/\/(www.)?bing.([a-z]){1,3}/i,
		        // yahoo:     	/\/\/((www|search).)?yahoo.([a-z]){1,3}/i,
		        // archive:    /\/\/(www.)?archive.([a-z]){1,3}/i
		        google:     /\/\/(.*\.)?google.([a-z]){1,3}/i,
		        bing:       /\/\/(.*\.)?bing.([a-z]){1,3}/i,
		        yahoo:     	/\/\/(.*\.)?yahoo.([a-z]){1,3}/i,
		        archive:    /\/\/(.*\.)?archive.([a-z]){1,3}/i
			},

			helpers = {
				//checks the special_regexes and returns 
				//the key if match, false otherwise
				check_is_special: function ( url ) {
					var ret = false;
			        for ( var key in special_regexes ) {
			        	//console.log('check_is_special', key, url, special_regexes[ key ].test( url ) )
			        	if ( special_regexes[ key ].test( url ) ) {
			        		ret = key;
			        		break;
			        	}
			        }
			        return ret;
				}
			};

			return helpers;
	});

})();
