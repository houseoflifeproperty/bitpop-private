Ember.LOG_BINDINGS = true;
var Chat = window.Chat = Ember.Application.create({
	// router: null,
	LOG_VIEW_LOOKUPS: true,
	LOG_ACTIVE_GENERATION: true
});

Chat.Models = {};
Chat.Controllers = {};
Chat.Views = {
    Roster: {},
    ChatTab: {}
};

Chat.Jsonable = Ember.Mixin.create({
    getJson: function() {
        var v, json = {};
        for (var key in this) {
            if (this.hasOwnProperty(key)) {
                v = this[key];
                if (v === 'toString') {
                    continue;
                } 
                if (Ember.typeOf(v) === 'function') {
                    continue;
                }
                if (Chat.Jsonable.detect(v))
                    v = v.getJson();
                json[key] = v;
            }
        }
        return json;
    }
});