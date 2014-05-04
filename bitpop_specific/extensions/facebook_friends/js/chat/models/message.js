Chat.Models.Message = Ember.Object.extend({
    from: null,
    to: null,
    body: null,
    createdAt: null,
    isInbox: false,

    init: function () {
        if (!this.get('createdAt'))
        	this.set('createdAt', new Date());
    }
});
