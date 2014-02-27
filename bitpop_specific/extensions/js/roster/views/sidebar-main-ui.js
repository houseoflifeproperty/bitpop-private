Chat.Views.SidebarMainUI = Ember.View.extend({
  template: Em.Handlebars.compile( 
        '{{view Chat.Views.SidebarHead id="sidebar-head"}}'
      + '<div class="box-wrap antiscroll-wrap">'
      +   '<div class="box">'
      +     '<div class="antiscroll-inner">'
      +       '<div class="box-inner">'
      +         '{{view Chat.Views.Roster.SmartFriendList contentBinding="Chat.Controllers.roster.universal_list.content"}}'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      + '</div>'
  ),

  classNameBindings: ['isActive'],

  isActive: false,

  didInsertElement: function () {
    function setAntiscrollHeight() {
      $('.antiscroll-inner').height(
        $('body').height() - $('.antiscroll-wrap').offset().top
      );

      $('.antiscroll-inner').width($('body').width());
    }

    setAntiscrollHeight();
    this.$('.antiscroll-wrap').antiscroll();

    $(window).resize(function() {
      setAntiscrollHeight();
      if ($('.antiscroll-wrap').data('antiscroll')) {
        $('.antiscroll-wrap').data('antiscroll').destroy().refresh();
      }
    });

    // Set roster "UI blocked" state on startup
    Chat.Controllers.application.onChatBlockChanged();
  }
});