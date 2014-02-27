Chat.Models.User = Ember.Object.extend({
    // Default attribute values
    jid: null,
    name: "{Unknown}",

    uid: function() {
        return Strophe.getNodeFromJid(this.get('jid')).substring(1);
    }.property('jid').cacheable()
});