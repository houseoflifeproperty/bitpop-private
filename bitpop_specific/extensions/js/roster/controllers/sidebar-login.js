Chat.Controllers.SidebarLoginController = Ember.Controller.extend({
  spinnerStatus: 'Establishing Facebook Chat connection...',
  errorStatus: '',
  showErrorBox: false,
  showSyncControl: false,
  enableSync: true,
  connectionInProgress: false,

  actions: {
    login: function () {
        chrome.extension.sendMessage({ kind: "facebookLogin" });
        this.set('showErrorBox', false);
        _gaq.push(['_trackEvent', 'login_attempt', 'sync-' + (this.get('enableSync') ? 'on' : 'off')]);
        if (this.get('enableSync'))
          chrome.bitpop.launchFacebookSync();
    }
  },
  
  init: function () {
    // BITPOP
    chrome.bitpop.getSyncStatus(_.bind(this.toggleSyncMessage, this));
    chrome.bitpop.onSyncStatusChanged.addListener(_.bind(this.toggleSyncMessage, this));
    return this._super();
  },

  resetUI: function () {
    this.set('showErrorBox', false);
    this.set('connectionInProgress', false);
  },

  setError: function (status) {
    this.set('errorStatus', status);
    this.set('showErrorBox', true);
    this.set('connectionInProgress', false);
  },

  setInProgress: function (progressStatus) {
    this.set('showErrorBox', false);
    this.set('connectionInProgress', true);
    this.set('spinnerStatus', progressStatus);
  },

  toggleSyncMessage: function (params) {
    if (params && params === true) {
      this.set('showSyncControl', false);
      this.set('enableSync', false);
      $('#enable-sync').attr('disabled', true);
    } else {
      this.set('showSyncControl', true);
      this.set('enableSync', true);
      $('#enable-sync').attr('disabled', false);
    }
  },

  syncControlUIDisabled: function () {
    return !this.get('showSyncControl');
  }.property('showSyncControl')
});

Chat.Controllers.sidebarLoginController = Chat.Controllers.SidebarLoginController.create();