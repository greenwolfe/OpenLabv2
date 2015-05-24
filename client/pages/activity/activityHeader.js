Template.activityHeader.helpers({
  siteTitle: function() {
      return Site.findOne().title;
  }
});

Template.activityHeader.events({
  'click #editButton' : function() {
    var userID = Meteor.userId();
    if (!Roles.userIsInRole(userID,'teacher')) {
      Session.set('editingMainPage',false);
      return;
    }
    var editing = Session.get('editingMainPage');
    Session.set('editingMainPage',!editing);
  }
})