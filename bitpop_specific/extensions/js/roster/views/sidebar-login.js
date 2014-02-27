Chat.Views.SidebarLogin = Ember.View.extend({
  controller: Chat.Controllers.sidebarLoginController,
  template: Em.Handlebars.compile(
      '<div id="login-centered">'
    +   '<img src="images/facebook_login_bitpop.png" alt="Facebook chat login" />'
    +   '<p class="promo">Chat with your friends<br>while surfing</p>'
    +   '{{#unless connectionInProgress}}'
    +     '<button id="login-button" class="btn" {{action "login"}}>Login</button>'
    +   '{{/unless}}'
    +   '{{#if showErrorBox}}'
    +     '<p class="error">{{errorStatus}}</p>'
    +   '{{/if}}'
    +   '{{#if showSyncControl}}'
    +     '<p id="sync-para">'
    +       '<label {{bindAttr for="view.enableSyncCheck.elementId"}}>'
    +         '{{input type="checkbox" viewName="enableSyncCheck" checkedBinding="enableSync" disabledBinding="syncControlUIDisabled"}}'
    +         'Synchronize browser data using your Facebook account'
    +       '</label>'
    +     '</p>'
    +   '{{/if}}'
    +   '{{#if connectionInProgress}}'
    +     '<div id="spinner-content">'
    +       '<p>{{spinnerStatus}}</p>'
    +       '<div id="spinner"></div>'  
    +     '</div>'
    +   '{{/if}}'
    + '</div>'
  ),

  
  didInsertElement: function () {
    $(window).load(function () {
      chrome.extension.sendMessage({
        'kind': 'rosterViewLoaded'
      });
    });
  }

});