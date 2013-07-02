define(['require', 
		'helpers/string'], function(require) {

	var string = require('helpers/string');

	var urls = {
		urlParser: function(url) {
			var link = document.createElement('a');
			link.href = url;
			return link;
		},

		getSiteName: function(url) {
			var link = this.urlParser(url);
			name = link.hostname.replace(/^www\./i, '');
			name = string.capitalize(name);
			return name;
		},

		getBasePathPrototype: function() {
			var url = urls.getBaseUrl( this );
			url = url.replace('https://', '');
			url = url.replace('http://', '');
			url = url.replace('www.', '');
			return url;
		},

		getBasePath: function( url ) {
			return urls.getBasePathPrototype.call( url );
		},

		getBaseUrlPrototype: function() {
			var url = this;
			url = ( url ? url.split('/').slice(0, 3).join('/') : false );
			if( url && url.indexOf('://') < 0 ){
				url = 'http://' + url;
			}
			return url;
		},

		//clean a url down to just the base path
		getBaseUrl: function( url ) {
			return urls.getBaseUrlPrototype.call( url );
		},

		// does the tracker start with http:// and end with /announce?
		// if so, it is my belief that they probably have a udp tracker set up 
		// (for performance and cost reasons) and that it is open at port 6969.  
		httpToUdp: function( tracker ) {
			tracker = tracker.toLowerCase();
			if( tracker.indexOf('http://') > -1 && tracker.indexOf('/announce') > -1 ){
				//take out any port reference
				tracker = tracker.split(':');
				while ( tracker.length > 2 )
					tracker.pop();
				tracker = tracker.join(':');
				//if there was a port on the http tracker, then it and the '/announce' are now gone
				//but if there wasn't, the '/announce' is still there,
				//so take out the announce
				tracker = tracker.replace('/announce', '');
				//then add in the port, change the protocol, and return
				return tracker.replace('http://', 'udp://') + ':6969';
			} else {
				return false;
			}
		}
	};

	String.prototype.getBasePath = urls.getBasePathPrototype;
	String.prototype.getBaseUrl = urls.getBaseUrlPrototype;

	return urls;
});
