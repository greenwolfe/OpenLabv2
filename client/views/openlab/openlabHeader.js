Template.openlabHeader.helpers({
  title: function() {
    var site = Site.findOne();
    if (site) {
      document.title = site.title;
      return site.title;
    }
  },
  edit: function() {
    if (openlabSession.get('editingMainPage'))
      return 'Done';
    return 'Edit';
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