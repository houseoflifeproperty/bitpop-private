Ember.LOG_BINDINGS = true;
var Chat = window.Chat = Ember.Application.create({
	// router: null,
	LOG_VIEW_LOOKUPS: true,
	LOG_ACTIVE_GENERATION: true
});

Chat.Router.reopen({
  location: 'none'
});

Chat.Models = {};
Chat.Controllers = {};
Chat.Views = {
    ChatTab: {}
};