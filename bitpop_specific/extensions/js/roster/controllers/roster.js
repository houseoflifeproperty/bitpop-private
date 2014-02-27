Chat.Controllers.Roster = Ember.ArrayController.extend({
    type: '',
    content: null,

    online_head:    Chat.Models.UniversalListItem.create({ type: 'section_header', category: 'online'}),
    idle_head:      Chat.Models.UniversalListItem.create({ type: 'section_header', category: 'idle'}),
    offline_head:   Chat.Models.UniversalListItem.create({ type: 'section_header', category: 'offline'}),
    online_hr:      Chat.Models.UniversalListItem.create({ type: 'online_section_hr', category: 'online' }),

    init: function () {
        this._super();
        this.set('content', []);
    },

    fillUsers: function (data) {
        this.set('content', data);
    },

    addUser: function (user) {
        this.get('content').addObject(user);
    },

    removeUser: function (user) {
        this.get('content').removeObject(user);
    },

    findUserByProperty: function (prop, value) {
        return this.get('content').findProperty(prop, value);
    },

    filterUserByProperty: function (prop, value) {
        return this.get('content').sortBy('name').filterProperty(prop, value);
    },

    online: function () {
        return this.filterUserByProperty('status', 'online');
    }.property('content.@each.status'),

    online_top: function () {
        return this.filterUserByProperty('onlineCategory', 'top');
    }.property('content.@each.onlineCategory'),

    online_bottom: function () {
        return this.filterUserByProperty('onlineCategory', 'bottom');
    }.property('content.@each.onlineCategory'),

    idle: function () {
        return this.filterUserByProperty('status', 'idle');
    }.property('content.@each.status'),

    offline: function () {
        return this.filterUserByProperty('status', 'offline');
    }.property('content.@each.status'),

    isNonEmptySearch: function () {
        return (this.get('searchVal') && this.get('searchVal').trim().length > 0);
    },

    applySearchQuery: function (items) {
        if (this.isNonEmptySearch())
            return items.filter(
                    _.bind(function (item, index, enumerable) {
                        console.log(this.get('searchVal') + ' in ' + item.get('name'));
                        return (item.get('name').toLowerCase().indexOf(this.get('searchVal').trim().toLowerCase()) !== -1);
                    }, this)
                );
        return items;
    },

    universal_list: function () {
        var res = Ember.ArrayProxy.create({ content: Ember.A([]) }),
            online_top      = this.applySearchQuery(this.get('online_top')) || [],
            online_bottom   = this.applySearchQuery(this.get('online_bottom')) || [],
            idle            = this.applySearchQuery(this.get('idle')) || [],
            offline         = this.applySearchQuery(this.get('offline')) || [];
        
        function pushToRes(item, index, enumerable) {
            res.pushObject(Chat.Models.UniversalListItem.create(
                _.extend(
                    item.getProperties('jid', 'is_fav', 'status', 'name', 'daysSinceLastActive'),
                    { 
                        'type': 'friend_entry',
                        'category': item.get('status'),
                    }
                )
            ));
        }

        if (online_top.length + online_bottom.length) {
            res.pushObject(this.get('online_head'));
            if (online_top.length) {
                online_top.forEach(pushToRes);
                if (online_bottom.length && !this.isNonEmptySearch())
                    res.pushObject(this.get('online_hr'));
            }
            if (online_bottom.length)
                online_bottom.forEach(pushToRes);
        }
        if (idle.length) {
            if (!this.isNonEmptySearch())
                res.pushObject(this.get('idle_head'));
            idle.forEach(pushToRes);
        }
        if (offline.length) {
            if (!this.isNonEmptySearch())
                res.pushObject(this.get('offline_head'));
            offline.forEach(pushToRes);
        }
        return res;
    }.property('content.@each.status', 'content.@each.onlineCategory', 'searchVal'),

    // setFriendPresence: function (presence) {
    //     var fullJid = presence.from,
    //         bareJid = Strophe.getBareJidFromJid(fullJid),
    //         friend = this.findProperty('jid', bareJid);

    //     if (friend) {
    //         friend.setPresence(presence);
    //     } else {
    //         // Something went wrong.
    //         // Got presence notification from user not in the roster.
    //         console.warn('Presence update from user not in the roster: ' + fullJid + ':' + presence.type);
    //     }
    // },

    getAsJsonable: function () {
        var res = [];
        this.get('content').forEach(function (item, index, enumerable) {
            res.push(item.getJson());
        });

        return res;
    }
});

Chat.Controllers.roster = Chat.Controllers.Roster.create();
