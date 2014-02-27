Chat.Models.ChatTab = Ember.Object.extend({
    user: null,

    init: function () {
        this.set('messages', []);
    },

    _onMessage: function (message) {
        // TODO: handle activity messages as well
        if (message.get('body')) {
            if (message.direction == 'outgoing')
                message.set('body', Chat.Controllers.localStorage.preprocessMessageText(message.get('body')));
            else
                message.set('body', $.autolink(message.get('body'),
                                                {
                                                    'target': '_blank',
                                                    'tabIndex': '-1'
                                                })
                );
            var messages = this.get('messages');
            messages.addObject(message);
            Chat.Controllers.localStorage.addChatMessageToDataObject(message);
        }
    },
});
