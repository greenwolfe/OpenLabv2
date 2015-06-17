Template.openlabHeader.helpers({
  title: function() {
      return Site.findOne().title;
  }
});

Template.openlabHeader.events({
  'click #editButton' : function() {
    var userID = Meteor.userId();
    if (!Roles.userIsInRole(userID,'teacher')) {
      openlabSession.set('editingMainPage',false);
      return;
    }
    var editing = openlabSession.get('editingMainPage');
    openlabSession.set('editingMainPage',!editing);
  }
})