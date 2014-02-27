Chat.Controllers.SidebarMainUI = Ember.Controller.extend({
  statusTitle: 'Set your status here.',
  
  actions: {
    logoutClicked: function () {
      chrome.extension.sendMessage({ kind: "logoutFacebook" });
      Chat.Controllers.application.set('chatAvailable', false);
      Chat.Controllers.sidebarLoginController.resetUI();
    }
  }
});

Chat.Controllers.sidebarMainUI = Chat.Controllers.SidebarMainUI.create();