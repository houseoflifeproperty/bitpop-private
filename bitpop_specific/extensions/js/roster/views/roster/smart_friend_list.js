Chat.Views.Roster.SmartFriendList = Ember.CollectionView.extend({
  tagName: 'ul',
  classNames: [ 'smart-list' ],
  itemViewClass: Chat.Views.Roster.UniversalView
});