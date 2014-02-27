Chat.Views.ChatTab.MessageCollection = Ember.CollectionView.extend({
  itemViewClass: Chat.Views.ChatTab.Message,
  contentBinding: 'Chat.Controllers.application.chat_tab.messages',
  classNames: ['messages-wrap'],

  emptyView: Ember.View.extend({
    template: Ember.Handlebars.compile("The message history is empty.")
  }),

  onWillInsertMessageView: function (view) {
    this.doScrollFlyoutView = this.isNearBottom() || view.get('isFromSelf');
  },

  onDidInsertMessageView: function () {
    if ($('.antiscroll-wrap').data('antiscroll'))
      $('.antiscroll-wrap').data('antiscroll').refresh();
    if (this.doScrollFlyoutView) {
      this.scrollFlyoutView();
    }
  },

  isNearBottom: function (threshold) {
    var container = this.$().parent().parent();
    threshold = threshold || 10;
    return (container.prop("scrollTop") + container.prop("offsetHeight") + threshold) >= container.prop("scrollHeight");
  },

  scrollFlyoutView: function () {
    var container = this.$().parent().parent();
    container.prop('scrollTop', container.prop('scrollHeight'));
  }
});
