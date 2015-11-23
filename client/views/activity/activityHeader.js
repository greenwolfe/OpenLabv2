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

Template.showWalls.helpers({
  showWalls: function() {
    var showWalls = activityPageSession.get('showWalls');
    if (showWalls == 'allTypes')
      return 'all types';
    return showWalls;
  },
  wallTypes: function() {
    return [
      {type: 'all types'},
      {type: 'teacher'},
      {type: 'student'},
      {type: 'group'},
      {type: 'section'}
    ]
  }
});

Template.wallTypeSelector.helpers({
  active: function() {
    var wallType = activityPageSession.get('showWalls');
    if (wallType == 'allTypes')
      wallType = 'all types';
    return (this.type == wallType);
  }
});

Template.wallTypeSelector.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    var wallType = this.type;
    if (wallType == 'all types')
      wallType = 'allTypes';
    activityPageSession.set('showWalls',wallType);
  }
})