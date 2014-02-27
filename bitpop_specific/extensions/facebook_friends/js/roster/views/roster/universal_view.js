Ember.Handlebars.registerBoundHelper('capitalize', function(content) {
  return content.charAt(0).toUpperCase() + content.slice(1);
});

(function () {
    Em.TEMPLATES['section_header'] = Em.Handlebars.compile(
          '<div class="wrap-item">'
          // downwards triangle
        +   '<div class="toggle-button" {{action "toggleSectionClicked" target="view"}}>&#9660</div>'
        +   '<span>{{capitalize view.content.category}}</span>'
        + '</div>'
    );
    Em.TEMPLATES['online_section_hr'] = Em.Handlebars.compile(
        '<div class="wrap-item">MORE ONLINE FRIENDS</div>'
    );
    Em.TEMPLATES['friend_entry'] = Em.Handlebars.compile(
          '<div class="wrap-entry wrap-item">'
        +   '<a {{action friendClicked target="view"}} {{bindAttr data-facebook-uid="view.content.facebook_uid"}}>'
        +     '<img {{bindAttr src="view.content.avatar_url"}} {{bindAttr title="view.content.name"}} />'
        +     '<span>{{view.content.name}}</span>'
        +   '</a>'
        +   '<div class="fav-toggle-button" {{action "toggleFav" target="view"}} data-tip="Mark as Favorite"></div>'
        +   '<div class="status-indicator" {{bindAttr data-tip="view.content.category"}}></div>'
        + '</div>'
    );
})();

Chat.Views.Roster.UniversalView = Ember.View.extend({
    tagName: 'li',
    
    classNameBindings: ['class_by_content_type'],
    attributeBindings: [ 'data-id' ],
    'data-idBinding': 'content.data_id',

    actions: {
        toggleFav: function () {
            var curUser = Chat.Controllers.roster.findBy('uid', this.get('content.facebook_uid'));
            curUser.set('is_fav', !curUser.get('is_fav'));
        },

        friendClicked: function () {
            // var friend = this.content;
            // chrome.tabs.create({
            //     'url': '/chat.html#?friend_jid=' + this.get('content.jid') + 
            //                              '&jid=' + Chat.Controllers.application.user.get('jid'),
            //     'active': true
            // });
            chrome.bitpop.facebookChat.addChat(
                this.get('content.jid'),
                this.get('content.name'),
                this.get('content.category')
            );
        },

        toggleSectionClicked: function () {
            var self_jid = Chat.Controllers.application.user.get('jid');
            var category = this.get('content.category');
            Chat.Controllers.localStorage.saveFriendListAccordionOpenedState(self_jid, category, !this.$().hasClass('head-on'));

            if (this.$().hasClass('head-on')) {
                this.$().removeClass('head-on');
                this.$().addClass('head-off');
            } else {
                this.$().removeClass('head-off');
                this.$().addClass('head-on');
            }
        }
    },

    templateName: function () {
        return this.get('content.type');
    }.property('content.type').cacheable(),

    // rerender the view if the template name changes
    _templateNameChanged: function() {
        this.rerender();
    }.observes('templateName'),

    avatar_url: function () {
        return 'https://graph.facebook.com/' + this.get('content.facebook_uid') + '/picture';
    }.property('content.facebook_uid'),

    class_by_content_type: function () {
        var self_jid = Chat.Controllers.application.user.get('jid');
        var res = null;
        switch (this.get('content.type')) {
            case 'section_header':
                var category = this.get('content.category');
                res = 'head '
                    + 'head-' + category + ' '
                    + (Chat.Controllers.localStorage.getFriendListAccordionOpenedState(self_jid, category) ?
                        'head-on' : 'head-off');
                break;
            case 'online_section_hr':
                res = 'online-fav-divider';
                break;
            case 'friend_entry':
                var category = this.get('content.category');
                var fav = this.get('content.is_fav');
                res = 'friend '
                    + 'friend-' + category + ' '
                    + (fav ? 'friend-fav' : '');
                break;
        }
        return res;
    }.property('content.type', 'content.category').cacheable(),

    didInsertElement: function () {
        if ($('.antiscroll-wrap').data('antiscroll'))
            $('.antiscroll-wrap').data('antiscroll').refresh();
    }
});
