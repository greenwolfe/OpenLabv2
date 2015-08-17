Template.standardHeader.helpers({
  siteTitle: function() {
    return Site.findOne().title;
  },
  pageTitle: function() {
    var standard = Standards.findOne(FlowRouter.getParam('_id'));
    if (!standard) return '';
    var title = 'Standard: ' + standard.title;
    return title;
  },
  edit: function() {
    if (openlabSession.get('editingMainPage'))
      return 'Done';
    return 'Edit';
  }
});

Template.standardHeader.events({
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