Template.activityHeader.helpers({
  siteTitle: function() {
    return Site.findOne().title;
  },
  pageTitle: function() {
    var activity = Activities.findOne(FlowRouter.getParam('_id'));
    if (!activity) { //validate accounts needs its own header
      if (FlowRouter.getRouteName() == 'validateAccounts')
        return 'Validate Accounts';
      return '';
    }
    var subactivitiesBlock = Blocks.findOne({
      activityID: activity._id,
      type: 'subactivities'
    });
    if (!subactivitiesBlock )
      return activity.title;
    var title = _.stripTags(subactivitiesBlock.title) || activity.title;
    return title;
  }
});

Template.activityHeader.events({
/*  'click #editButton' : function() {
    var userID = Meteor.userId();
    if (!Roles.userIsInRole(userID,'teacher')) {
      openlabSession.set('editingMainPage',false);
      return;
    }
    var editing = Session.get('editingMainPage');
    openlabSession.set('editingMainPage',!editing);
  }*/
})