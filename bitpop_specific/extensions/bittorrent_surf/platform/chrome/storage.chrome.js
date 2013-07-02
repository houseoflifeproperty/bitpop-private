define( function() {

	

	var local = chrome.storage.local,
		sync = chrome.storage.sync,
		clear = function () {
			local.clear();
			sync.clear();
		};

	return {
		local: 	local,
		sync: 	sync,
		clear: 	clear
	};

});
