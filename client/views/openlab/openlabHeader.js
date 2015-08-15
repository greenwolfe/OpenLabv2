Template.openlabHeader.helpers({
  title: function() {
    var site = Site.findOne();
    if (site) {
      document.title = site.title;
      return site.title;
    }
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