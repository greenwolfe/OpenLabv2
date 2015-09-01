Template.assessmentHeader.helpers({
  siteTitle: function() {
    return Site.findOne().title;
  },
  pageTitle: function() {
    var assessment = Blocks.findOne(FlowRouter.getParam('_id'));
    if (!assessment) return '';
    var subactivity = Activities.findOne(assessment.subActivityID);
    if (!subactivity) return '';
    var title = 'Assessment: ' + subactivity.title;
    return title;
  },
  edit: function() {
    if (openlabSession.get('editingMainPage'))
      return 'Done';
    return 'Edit';
  },
  justOneStudent: function() {
    var assessment = Blocks.findOne(FlowRouter.getParam('_id'));
    if (!assessment)
      return false;
    var student = Meteor.users.findOne(assessment.createdFor);
    if (!student)
      return false;
    return (Roles.userIsInRole(student,'student')) ? student : false;
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