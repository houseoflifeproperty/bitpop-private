Chat.ApplicationView = Ember.View.extend({
  classNames: ['root-ember-container', 'chat-dock-wrapper']
});

Chat.Views.Application = Ember.ContainerView.extend({
	controller: Chat.Controllers.application,
    childViews: [
    	Chat.Views.SidebarLogin.create({ elementId: "login-content", classNames: ['card', 'front'] }),
        Chat.Views.SidebarMainUI.create({ classNames: ['card', 'back'] })
    ],
    classNames: ['roster'],
    classNameBindings: ['controller.chatAvailable:flipped']
});
