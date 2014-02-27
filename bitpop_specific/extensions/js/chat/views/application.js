Chat.Views.Application = Ember.ContainerView.extend({
    childViews: [
        Chat.Views.ChatTab.Layout
    ],
    classNames: ['chat-dock-wrapper', 'clearfix']
});
