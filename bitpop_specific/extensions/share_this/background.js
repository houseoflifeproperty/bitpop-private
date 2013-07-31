(function () {
  // var SHARE_IMAGE_ID = 1;
  // var FB_APPLICATION_ID = "234959376616529";
  // chrome.contextMenus.create({
  //   "type": "normal",
  //   "id": ''+SHARE_IMAGE_ID,
  //   "title": "Share this image on Facebook",
  //   "contexts": ["image"],
  //   "targetUrlPatterns": [ 'http://*/*', 'https://*/*' ]
  // });

  // chrome.contextMenus.onClicked.addListener(function (info, tab) {
  //   switch (info.menuItemId) {
  //     case SHARE_IMAGE_ID:
  //       if (info.srcUrl) {
  //         var widgetUrl = "https://www.facebook.com/dialog/feed?";
  //         widgetUrl += "appId=" + FB_APPLICATION_ID;
  //         widgetUrl += "&picture=" + encodeUriComponent(info.srcUrl);
  //         window.open(widgetUrl,'tweetbutton','width=626,height=436');
  //       }
  //       break;
  //     default:
  //       break;
  //   }
  // });

  /**
   * Returns a handler which will open a new window when activated.
   */
       
  function getClickHandler() {
    return function(info, tab) {
      // The srcUrl property is only available for image elements.
        
      var url = 'https://tools.bitpop.com/fbimage.html?url=' + encodeURIComponent(info.srcUrl) + "&ref=CEX";
      var w = 455;
      var h = 450;
      var left = Math.floor((screen.width/2)-(w/2));
      var top = Math.floor((screen.height/2)-(h/2)); 
      chrome.windows.create({url: url, type: 'popup', width: w, height:h, top: top, left: left });
    };
  }


  /**
  * Create a context menu which will only show up for images.
  */
  chrome.contextMenus.create({
    "title" : "Share this image on Facebook",
    "type" : "normal",
    "contexts" : ["image"],
    "onclick" : getClickHandler()
  });
})();
