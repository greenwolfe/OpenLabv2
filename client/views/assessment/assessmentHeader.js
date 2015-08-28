Template.assessmentHeader.helpers({
  siteTitle: function() {
    return Site.findOne().title;
  },
  pageTitle: function() {
    var assessment = Blocks.findOne(FlowRouter.getParam('_id'));
    if (!assessment) return '';
    var subactivity = Activities.findOne(assessment.subactivityID);
    if (!subactivity) return '';
    var title = 'Assessment: ' + activity.title;
    return title;
  },
  edit: function() {
    if (openlabSession.get('editingMainPage'))
      return 'Done';
    return 'Edit';
  }
});

Template.assessmentHeader.events({
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