Chat.Models.UniversalListItem = Ember.Object.extend({
	type: null,
	category: null,
	
	facebook_uid: function () {
		var jid_ = Strophe.getBareJidFromJid(this.get('jid'));
		var matches = jid_.match(/\-?(\d+)@.*/);
		console.assert(matches.length === 2);
		if (matches.length === 2)
			return matches[1];
		return null;
	}.property('jid').cacheable(),

	categoriesForFriendEntry: function () {
		var res = null;
		if (this.get('type') == 'friend_entry') {
			res = [ this.get('category') ];
			if (this.get('category') == 'online' &&
				(this.get('is_fav') || this.get('daysSinceLastActive') <= 10)) {
				res.push('online-top');
			} else {
				res.push('online-bottom');
			}
		}
		return res;
	}.property('category', 'type', 'is_fav', 'daysSinceLastActive'),

	data_id: function () {
		if (this.get('type') != 'friend_entry')
			return this.get('type') + ':' + this.get('category');
		else
			return this.get('facebook_uid');
	}.property('category', 'type', 'facebook_uid'),
});