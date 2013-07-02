define(function() {

	var time = {

		getTime: function() {
			var date = new Date();
			return date.getTime();
		},

		getTimestamp: function(date) {
			date = date || (new Date());
			return ~~(date.getTime() / 1000);
		},

		isExpired: function(timestamp, days) {
			days = days || 30;
			var offset = days * (60 * 60 * 24);

			if(!timestamp)
				return false;

			return timestamp + offset < this.getTimestamp();
		}

	};

	return time;
});
