var bitpop = {
  CONTROLLER_EXTENSION_ID: "engefnlnhcgeegefndkhijjfdfbpbeah"
};

cleanLocalStorage();

window.options.init();
var current = window.options.current;

var myUid = null;
var dn = DesktopNotifications;

setTimeout(
  function() {
    if (!myUid) {
      chrome.extension.sendMessage(
        bitpop.CONTROLLER_EXTENSION_ID,
        { type: 'getMyUid' },
        function(response) {
          if (response && response.id) {
            myUid = response.id;

            dn.threads_unseen_before = [];
            dn.just_connected = true;

            dn.start(current.refreshTime);
          }
        }
      );
    }
  },
  5000);

dn.controllerExtensionId = current.controllerExtensionId;
dn.start(current.refreshTime);

chrome.extension.onMessageExternal.addListener(function (request, sender, sendResponse) {
  if (!request.type)
    return;

  if (request.type == 'myUidAvailable') {
    myUid = request.myUid;

    dn.threads_unseen_before = [];
    dn.just_connected = true;

    dn.start(current.refreshTime);

  } else if (request.type == 'popupOpened') {
    dn.time_popup_opened_indexed_by_friend_uid[''+request.friend_uid] = (new Date()).getTime();
  } else if (request.type == 'newMessage') {
    dn.time_chat_was_read_indexed_by_friend_uid[''+request.from] = new Date(request.timestamp);
  } else if (request.type == 'loggedOut') {
    dn.just_connected = false;
  } else if (request.type == 'wentOffline' || request.type == 'chatIsIdle') {
    dn.threads_unseen_before = [];
    dn.just_connected = true;
    if (request.type == 'chatIsIdle')
      dn.stop();
  } else if (request.type == 'chatIsAvailable') {
    dn.start(current.refreshTime);
  }
});
