Chat.Controllers.Application = Ember.Object.extend({
  debug: false,
  page_params: null,
  user_self: null,
  user_friend: Chat.Models.User.create({
    'jid': '<Unknown>',
    'name': '<Unknown>'
  }),
  chat_tab: {},
  initialText: '',
  thread_id: 0,
  shouldScrollOnViewInsertion: true,

  init: function() {
    if (window.location.hash.length < 3)
      return;
    
    var params = $.parseParams(window.location.hash.substring(2));
    this.set('page_params', params);
    chrome.extension.onMessage.addListener(_.bind(this.processExtensionMessage, this));
    chrome.extension.sendMessage({
      'kind': 'windowReady',
      'jid': params.jid,
      'friend_jid': params.friend_jid
    });
    // Send message to messages extension
    chrome.extension.sendMessage('dhcejgafhmkdfanoalflifpjimaaijda',
      { 
        type: 'popupOpened',
        friend_uid: Strophe.getNodeFromJid(params.friend_jid).substr(1) 
      }
    );
  },

  _onThreadInfoReceived: function (data) {
    for (var i = 0; i < data.length; i++) {
      var thread = data[i];
      if (thread.recipients.indexOf(+this.get('user_self.uid')) !== -1 &&
        thread.recipients.indexOf(+this.get('user_friend.uid')) !== -1 &&
        thread.recipients.length == 2)
      {
        this.set('thread_id', thread.thread_id);
        chrome.extension.sendMessage(
          {
            "kind": "fqlQuery",
            "query": "SELECT author_id, body, attachment, created_time FROM message " +
              "WHERE thread_id='" + thread.thread_id + "' " +
              "ORDER BY created_time DESC LIMIT 0,25"
          },
          _.bind(function (response) {
            if (!response.error)
              this._onMessagesUpdateReceived(response);
          }, this)
        );
        break;
      }
    }
  },

  _onMessagesUpdateReceived: function (data) {
    Chat.Controllers.localStorage.fillFromApiData(
      this.get('user_friend.jid'),
      this.get('user_self.jid'),
      data);
    lastMessageUid = null;
    this.set('shouldScrollOnViewInsertion', false);
    this._updateFromLocalStorage();
    this.scrollChatToBottomOnNextEventLoopIteration();
  },
  
  scrollChatToBottomOnNextEventLoopIteration: function () {
    setTimeout(_.bind(function() {
      if ($('.antiscroll-wrap').data('antiscroll'))
        $('.antiscroll-wrap').data('antiscroll').refresh();

      var container = $('.antiscroll-inner');
      container.prop('scrollTop', container.prop('scrollHeight'));
      this.set('shouldScrollOnViewInsertion', true);
    }, this), 0);
  },

  processExtensionMessage: function(request, sender, sendResponse) {
    switch (request.kind) {
      case 'initNames':
      this._onNamesInit(request.user_name, request.friend_name);
      break;
      case '_onMessage':
      this._onMessage(JSON.parse(request.message));
      break;
    }
  },

  _updateFromLocalStorage: function () {
    this.set('chat_tab.messages', []);
    var messages = Chat.Controllers.localStorage.chatMessages(
      this.get('user_friend.jid'),
      this.get('user_self.jid')
    );
    messages.forEach(_.bind(function (item, index, enumerable) {
      item.createdAt = new Date(item.createdAt);
      this.get('chat_tab.messages').addObject(Chat.Models.Message.create(item));
    }, this));
  },

  _onNamesInit: function(user_name, friend_name) {
    this.set('user_self', Chat.Models.User.create({
      'jid': this.get('page_params').jid,
      'name': user_name
    }));
    this.set('user_friend', Chat.Models.User.create({
      'jid': this.get('page_params').friend_jid,
      'name': friend_name
    }));
    this.set('friendPhotoLink',
      'https://graph.facebook.com/'
      + this.facebook_uid(this.get('user_friend.jid'))
      + '/picture');
    this.set('chat_tab', Chat.Models.ChatTab.create({
      'user': this.get('user_self'),
      'friend': this.get('user_friend')
    }));
    this.set('shouldScrollOnViewInsertion', false);
    this._updateFromLocalStorage();
    this.scrollChatToBottomOnNextEventLoopIteration();
    this.set('initialText', Chat.Controllers.localStorage.textfieldValue(
      this.get('user_friend.jid'),
      this.get('user_self.jid')
    ));

    chrome.extension.sendMessage(
      {
        "kind": "fqlQuery",
        "query": "SELECT thread_id, recipients FROM thread WHERE folder_id=0;"
      },
      _.bind(function (response) {
        if (!response.error) {
          this._onThreadInfoReceived(response);
        }
      }, this)
    );
  },

  isMessageForThisChat: function (message) {
    return (message.to == this.get('user_self.jid') && 
      message.from == Strophe.getBareJidFromJid(this.get('user_friend.jid')));
  },

  _onMessage: function (message) {
    var chat_tab = this.get('chat_tab');
    if (chat_tab && this.isMessageForThisChat(message)) {
      chat_tab._onMessage(Chat.Models.Message.create(message));

      // Check if we have a message stream link at the end of the message
      // (indication that we have attachments)
      var streamUrl = 'https://www.facebook.com/messages/'
          + this.facebook_uid(this.get('user_friend.jid'));
      var streamUrlIndex = message.body.indexOf(streamUrl);
      var now = new Date();
      var item = this.get('chat_tab.messages.lastObject');
      if (streamUrlIndex !== -1 && this.get('thread_id') !== 0 &&
          (streamUrlIndex + streamUrl.length === message.body.length)) {
        chrome.extension.sendMessage({
            'kind': 'fqlQuery',
            'query': 'SELECT attachment, created_time FROM message WHERE thread_id="' + this.get('thread_id') +
                     '" ORDER BY created_time DESC LIMIT 0,5'
          }, _.bind(function (response) {
            if (!response.error) {
              this.maybeSwapAttachmentInMessage(response, item, now);
            }
          }, this));
      }
    }
  },

  sendMessage: function (message) {
    chrome.extension.sendMessage({
      'kind': 'newOutgoingMessage',
      'to': message.get('to'),
      'body': message.get('body')
    });
  },

  facebook_uid: function(jid) {
    if (jid.length > 1 && jid[0] === '-')
      return Strophe.getNodeFromJid(jid).substring(1);
    return 'null';
  },

  sendTypingState: function (activeness) {
    chrome.extension.sendMessage({
      'kind': 'newTypingNotification',
      'to': this.get('user_friend.jid'),
      'value': activeness
    });
  },

  maybeSwapAttachmentInMessage: function (data, item, date) {
    var minDiff = 999999, minIndex;
    for (var i = 0; i < data.length; ++i) {
      var ct = new Date(data[i].created_time * 1000);
      var diff = Math.abs(ct.getTime() - date.getTime());
      if (diff < minDiff && data[i].attachment.sticker_id) {
        minDiff = diff;
        minIndex = i;
      }
    }

    if (minDiff < 5000) {
      var msg = data[minIndex];
      item.set('body', '<img class="sticker-img" src="' + msg.attachment.href + '" alt="Sticker">');
    }
  }
});

Chat.Controllers.application = Chat.Controllers.Application.create();