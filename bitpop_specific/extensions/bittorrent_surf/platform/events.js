/*jshint white:false, camelcase:false */
define( function() {
	

	return {
		LISTEN:   	'rt:lis',
		CONNECT:  	'rt:cct',
		DISCONNECT: 'rt:dct',

		//Storage Instances
		LOAD_STORAGE_INSTANCE:    'st:ld',
		STORAGE_INSTANCE_DATA:    'st:d',
		STORAGE_INSTANCE_SAVE:    'st:sv',
		STORAGE_INSTANCE_CHANGE:  'st:ch',
		STORAGE_INSTANCE_REMOVE:  'st:rm',
		STORAGE_INSTANCE_CLEAR:   'st:cl',

		//Requests
		MAKE_REQUEST:     'rq:mk',
		REQUEST_COMPLETE: 'rq:d',
		ABORT_REQUEST:    'rq:x',

		//Popup
		RESIZE:    'rsz',
		POPUP_SET: 'pp:st',
		//POPUP: 	'pp',

		//Publish/Subscribe
		SUBSCRIBE:    'sub',
		PUBLISH:      'pub',
        UNSUBSCRIBE:  'usb',

        //Tabs
        LOAD_TABS: 	'tb:ld',
        INJECT: 	'tb:i',
        OPEN: 		'tb:o',

        //Extension Tabs
        OPEN_EXT_TAB: 	'etb:o'
	};
});