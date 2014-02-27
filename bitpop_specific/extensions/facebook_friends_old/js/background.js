var friendList = null;
var myUid = null;
var statuses = {};
var inboxData = null;
var inboxFetchInterval = null;
var newMessageAudio = new Audio("mouth_pop.wav");
var loggedIn = false;
var torqueEnabled = false;

var torrentOpenWindows = {};
var downloadItemOpenInfo = {};

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-43394997-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

//chrome.extension.sendRequest(bitpop.CONTROLLER_EXTENSION_ID,
//  { type: 'observe',
//    extensionId: chrome.i18n.getMessage('@@extension_id')
//  });

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

chrome.management.onEnabled.addListener(function(ext) {
  if (ext.id == "pchkdmeolfddeeedkhlfolaenanehddd") {
    torqueEnabled = true;
  }
});

chrome.management.get("pchkdmeolfddeeedkhlfolaenanehddd", function(info) {
  if (info && info.enabled) {
    torqueEnabled = true;
  }
});

chrome.downloads.onChanged.addListener(function (item) {
  if (torqueEnabled && item.filename && item.filename.current.endsWith('.torrent.crdownload')) {
    if (!localStorage['torrent.defaultAction']) {
        chrome.downloads.pause(item.id);

        var w = 400;
        var h = 250;
        var left = (screen.width/2)-(w/2);
        var top = (screen.height/2)-(h/2); 
        chrome.windows.create({ url: '/torrent_download.html', type: 'popup',
                                top: top, left: left, width: w, height: h },
                              function(win) {
                                torrentOpenWindows[win.id] = { id: item.id };
                              });
    }
  }
  if (torqueEnabled && item.state && item.state.current == 'complete') {
    onDownloadComplete(item.id);
  }    
});

function onDownloadComplete(itemId) {
  var action = '';
  if (localStorage['torrent.defaultAction']) {
    action = localStorage['torrent.defaultAction'];
  } else if (downloadItemOpenInfo[itemId]) {
    action = downloadItemOpenInfo[itemId];
  }

  switch (action) {
    case '0':
      chrome.downloads.openInTorque(itemId);
      break;
    case '1':
      chrome.downloads.open(itemId);
      break;
    case '2':
    case '':
      // Do nothing
      break;
    default:
      console.error('Invalid action received from .torrent open dialog.');
      break;
  }
}


(function () {
  if (chrome.browserAction)
    chrome.browserAction.onClicked.addListener(function (tab) {
      chrome.bitpop.facebookChat.getFriendsSidebarVisible(function(is_visible) {
        chrome.bitpop.facebookChat.setFriendsSidebarVisible(!is_visible);
        //onSuppressChatChanged();
      });
    });
  else
    setTimeout(arguments.callee, 1000);
})();

// force myUid fetch if it wasn't retrieved successfully
// or after bg page crash
setTimeout(
  function() {
    if (!myUid) {
      chrome.extension.sendMessage(
        bitpop.CONTROLLER_EXTENSION_ID,
        { type: 'getMyUid' },
        function(response) {
          if (response && response.id) {
            loggedIn = true;
            myUid = response.id;
            chrome.extension.sendMessage(
              bitpop.CONTROLLER_EXTENSION_ID,
              { type: 'forceFriendListSend' }
            );
          }
        }
      );
    }
  },
  5000);

chrome.bitpop.onSyncStatusChanged.addListener(function (enabled, logout_from_fb_com) {
  if (!enabled && logout_from_fb_com)
    chrome.cookies.remove({ 'url': 'https://www.facebook.com', 'name': 'c_user' });
});

chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
  if (!request.type)
    return false;

  if (request.type == 'setStatusMessage') {
    chrome.extension.sendMessage(bitpop.CONTROLLER_EXTENSION_ID,
      { type: 'setFacebookStatusMessage',
        msg: request.msg
      },
      function (response) {
        sendResponse(response);
      }
    );
    return true;
  } else if (request.type == 'torrentOpenInfoDone') {
    var itemId = torrentOpenWindows[request.windowId]['id'];
    downloadItemOpenInfo[itemId] = request.action;
    if (request.alwaysPerform === true) {
      localStorage['torrent.defaultAction'] = request.action;
    }
    chrome.windows.remove(request.windowId);

    chrome.downloads.search({'id': itemId}, function(items) {
      if (items.length === 0)
        return;

      var item = items[0];
      if (item.state == 'complete') {
        onDownloadComplete(item.id);
      } else 
        chrome.downloads.resume(item.id);
    });
    
  }
});

chrome.extension.onMessageExternal.addListener(function (request, sender, sendResponse) {
  if (!request.type)
    return;

  if (request.type == 'myUidAvailable') {
      myUid = request.myUid;
      sendInboxRequest();
      loggedIn = true;
      onSuppressChatChanged();
  } else if (request.type == 'friendListReceived') {
    if (!friendList) {
      // send status notifications so that every visible chat button
      // has correct statuses
      for (var i = 0; i < request.data.length; ++i) {
        chrome.bitpop.facebookChat.newIncomingMessage(request.data[i].uid.toString(), "",
          request.data[i].online_presence || 'offline', "");
      }
    }

    friendList = request.data;

    sendStatusesRequest();

  } else if (request.type == 'loggedOut') {
    if (inboxFetchInterval) { clearInterval(inboxFetchInterval); inboxFetchInterval = null; }
    statuses = {};
    friendList = null;
    loggedIn = false;
    onSupressChatChanged();
  } else if (request.type == 'wentOffline') {
    if (inboxFetchInterval) { clearInterval(inboxFetchInterval); inboxFetchInterval = null; }
    statuses = {};
    friendList = null;
  } else if (request.type == 'chatIsIdle') {
    statuses = {};
  } else if (request.type == 'userStatusChanged') {
    // send change status message: empty message body signals to only check
    // for status change
    chrome.bitpop.facebookChat.newIncomingMessage(request.uid.toString(), "",
        request.status, "");

    // set global variable storing each user status, reported by XMPP
    statuses[request.uid.toString()] = request.status;

  } else if (request.type == 'newMessage' ||
             request.type == 'newInboxMessage') {
    var isInbox = request.type == 'newInboxMessage';
    var msgDate = isInbox ?  new Date(request.created_time * 1000) :
        new Date(); // set 'now' as the message arrive time

    console.assert(myUid !== null);

    bitpop.saveToLocalStorage(myUid, request.from,
      bitpop.preprocessMessageText(request.body),
      msgDate,
      false);

    var found = false;
    var vs = chrome.extension.getViews();
    for (var i = 0; i < vs.length; ++i) {
      if (vs[i].location.hash.length > 1 && vs[i].location.hash.slice(1).split('&')[0] == request.from) {
        found = true;
        break;
      }
    }

    if (!found) {
      for (i = 0; i < friendList.length; ++i) {
        if (friendList[i].uid == request.from) {
          // use status from fql result first,
          // then from xmpp server status update,
          // else set it to offline
          var status = null;
          if (friendList[i].online_presence !== null)
            status = friendList[i].online_presence;
          else if (statuses[friendList[i].uid.toString()])
            status = statuses[friendList[i].uid.toString()];
          else
            status = 'offline';

          chrome.bitpop.facebookChat.newIncomingMessage(
                             friendList[i].uid.toString(),
                             friendList[i].name,
                             status,
                             request.body);
          break;
        }
      }
    }

    newMessageAudio.play();
  } else if (request.type == 'typingStateChanged') {
    if (request.isTyping) {
      chrome.bitpop.facebookChat.newIncomingMessage(request.uid.toString(), "",
          'composing', "");
    } else {
      chrome.bitpop.facebookChat.newIncomingMessage(request.uid.toString(), "",
          'active', "");
    }

    if (friendList) {
      for (var i = 0; i < friendList.length; ++i) {
        if (friendList[i].uid == request.uid) {
          friendList[i].isTyping = request.isTyping;
          break;
        }
      }
    }
  }

  return false;
});

function sendInboxRequest() {
  chrome.extension.sendMessage(bitpop.CONTROLLER_EXTENSION_ID,
    { type: 'graphApiCall',
      path: '/me/inbox',
      params: {}
    },
    function (response) {
      inboxData = response.data;
      replaceLocalHistory(inboxData);
      chrome.extension.sendMessage({ type: 'inboxDataAvailable' });
    }
  );
}

function sendStatusesRequest() {
  chrome.extension.sendMessage(bitpop.CONTROLLER_EXTENSION_ID,
    { type: 'graphApiCall',
      path: '/me/statuses',
      params: { 'limit': '1' }
    },
    function (response) {
      if (!response.data || !response.data.length || !response.data[0].message)
        return;
      chrome.extension.sendMessage({ type: 'statusMessageUpdate',
                                     msg: response.data[0].message });
    }
  );
}

function replaceLocalHistory(data) {
  console.assert(myUid != null);
  console.assert(data != null);

  for (var i = 0; i < data.length; i++) {
    var to_ids = [];
    for (var j = 0; j < data[i].to.data.length; j++) {
      to_ids.push(data[i].to.data[j].id);
      if (to_ids[j] == myUid) // exclude my uid from to_ids list
        to_ids.pop();
    }

    if (to_ids.length > 1 || to_ids.length == 0)
      continue;

    var jid = myUid + ':' + to_ids[0].toString();

    localStorage[jid + '.thread_id'] = data[i].id;

    if (!data[i].comments || !data[i].comments.data)
      continue;

    localStorage.removeItem(jid);

    for (var j = 0; j < data[i].comments.data.length; j++) {
      bitpop.saveToLocalStorage(myUid, to_ids[0],
          bitpop.preprocessMessageText(data[i].comments.data[j].message),
          (new Date(data[i].comments.data[j].created_time)).getTime(),
          data[i].comments.data[j].from.id == myUid
      );
    }
  }
}

// ********************************************************
// facebook chat enable/disable functionality
//
// ********************************************************
//
// the list of tab ids which this extension is interested in.
// Mostly facebook.com tabs
var fbTabs = {};

var TRACE = 0;
var DEBUG = 1;
var INFO  = 2;
var logLevel = DEBUG;

function myLog( ) {
    if(logLevel <= DEBUG) {
        console.log(arguments);
    }
}

chrome.tabs.onRemoved.addListener(
    function(tab)
    {
        delete fbTabs[tab];
    }
);

function sendResponseToContentScript(sender, data, status, response)
{
    if (chrome.extension.lastError) {
        status = "error";
        response = chrome.extension.lastError;
    }
    myLog("Sending response ", data.action, data.id, status, response, response.stack);
    sender({
        action: data.action,
        id: data.id,
        status: status,
        response: response
    });
}

/**
 * extract the doman name from a URL
 */
function getDomain(url) {
   return url.match(/:\/\/(.[^/]+)/)[1];
}

var ports = [];
function addFbFunctionality( )
{
    // add a listener to events coming from contentscript
    chrome.extension.onConnect.addListener(function(port) {
      ports.push(port);
      var port_ = port;
      port.onDisconnect.addListener(function() {
        console.assert(port_.name == 'my-port');
        if (port.name != 'my-port')
          return;
        var i = ports.indexOf(port_);
        if (i !== -1) {
          if (i === 0) {
            ports.shift();
          } else if (i === ports.length-1) {
            ports.pop();
          } else {
            ports = ports.slice(0, i).concat(ports.slice(i+1, ports.length));
          }
        }
      });

      console.assert(port.name == 'my-port');
      if (port.name != 'my-port')
        return;

      port.onMessage.addListener(
        function(request) {
            function sendResponse1(msg) {
              port.postMessage(msg);
            }
            if (typeof request != 'string')
              return false;
            myLog("Received request ", request);
            if(request) {
                var data = JSON.parse(request);
                try {
                    if(data.action === 'chat' && data.friendId !== undefined) {
                        // chat request event
                        //fbfeed.openChatWindow(data.friendId, function(a) {
                        //    sendResponseToContentScript(sendResponse, data, "ok", a);
                        //});
                    } else if(data.action === 'shouldEnableFbJewelsAndChat' &&
                        data.userId !== undefined) {
                        // save the id of the tabs which want the Jewel/Chat enable/disable
                        // so that they can be informed when quite mode changes
                        if(port.sender.tab.incognito) {
                            // if the broser is in incognito mode make a local decision
                            // no need to consult the native side.
                            var response =  {
                                    enableChat: true,
                                    enableJewels: true
                                };
                            sendResponseToContentScript(sendResponse1, data, "ok", response);
                        } else {
                            //chrome.bitpop.facebookChat.getFriendsSidebarVisible(function(is_visible) {
                            chrome.bitpop.prefs.facebookShowChat.get({}, function(details) {
                              var facebookShowChat = details.value;
                              //chrome.bitpop.prefs.facebookShowJewels.get({}, function(details2) {
                              //  var facebookShowJewels = details2.value;
                              var response = null;
                              if (loggedIn) {
                                response = {
                                  enableChat:   facebookShowChat,
                                  enableJewels: true
                                };
                              }
                              else {
                                response = { enableChat:true, enableJewels:true };
                              }

                              sendResponseToContentScript(sendResponse1, data,
                                                          "ok", response);
                              //});
                            });
                            //});
                        }
                    }
                } catch(e) {
                    sendResponseToContentScript(sendResponse1, data, "error", e);
                }
            }
            return true;
          });
        });
}

function onSuppressChatChanged(details) {
  for(var i = 0; i < ports.length; i++) {
    ports[i].postMessage({});
  }
}

chrome.bitpop.prefs.facebookShowChat.onChange.addListener(onSuppressChatChanged);

addFbFunctionality();
