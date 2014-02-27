jQuery.fn.putCursorAtEnd = function() {

  return this.each(function() {

    $(this).focus()

    var len = $(this).val().length;

    this.setSelectionRange(len, len);

    // Scroll to the bottom, in case we're in a tall textarea
    // (Necessary for Firefox and Google Chrome)
    this.scrollTop = 999999;

  });

};

Chat.Views.ChatTab.TextArea = Ember.TextArea.extend({
    classNames: ['autogrow'],

    init: function () {
        this.typingExpiredCallback = null;
        jQuery(window).unload(_.bind(function () {
            Chat.Controllers.localStorage.saveTextfieldValue(
                Chat.Controllers.application.get('user_friend.jid'),
                Chat.Controllers.application.get('user_self.jid'),
                this.get('value')
            );
        }, this));
        var res = this._super();
        // var val = Chat.Controllers.application.get('initialText');
        // this.set('value', val);

        return res;
    },

    setInitialValue: function () {
        var val = Chat.Controllers.application.get('initialText');        
        this.set('value', val);
    }.observes('Chat.Controllers.application.initialText'),

    didInsertElement: function () {
        setTimeout(_.bind(function () {
            this.$().autogrow();
            this.focus();    
        }, this),
        0);
    },

    keyDown: function (event) {
        // Send message when Enter key is pressed
        if (event.which === 13) {
            event.preventDefault();

            var tab = Chat.Controllers.application.get('chat_tab'),
                body = this.get('value'),
                user = tab.get('user'),
                friend = tab.get('friend'),
                message = Chat.Models.Message.create({
                    from: user.get('jid'),
                    to: friend.get('jid'),
                    body: body,
                    fromName: user.get('name'),
                    direction: 'outgoing'
                });

            this.set('value', '');

            // Send message to XMPP server
            Chat.Controllers.application.sendMessage(message);

            // Display the message to the sender,
            // because it won't be sent back by XMPP server
            tab._onMessage(message);

            this.$().data('composing', false);
        } else {
            var composing = this.$().data('composing');
            if (!composing) {
                if (this.typingExpiredCallback) {
                    clearTimeout(this.typingExpiredCallback);
                    delete this.typingExpiredCallback;
                }

                var that = this;
                this.typingExpiredCallback = setTimeout(function () {
                    if (that.$().data('composing') === true) {
                        Chat.Controllers.application.sendTypingState('active');
                        that.$().data('composing', false);
                    }
                    delete that.typingExpiredCallback;
                }, 5000);

                // TODO: send composing message
                Chat.Controllers.application.sendTypingState('composing');
                this.$().data('composing', true);
            }
        }
    },

    focus: function () {
        this.$().putCursorAtEnd();
    }
});
