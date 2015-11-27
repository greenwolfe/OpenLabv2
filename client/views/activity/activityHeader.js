  /******************************/
 /******* ACTIVITY HEADER ******/
/******************************/

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
  },
  sectionOnlySelected: function() {
    var studentID = Meteor.impersonatedId();
    var sectionID = Meteor.selectedSectionId();
    var cU = Meteor.userId();
    return (Roles.userIsInRole(cU,'teacher') && (!studentID) && (sectionID));
  },
  showingStudentOrGroupWalls: function() {
    return _.contains(['student','group'],activityPageSession.get('showWalls'));
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

  /*************************/
 /******* SHOW WALLS ******/
/*************************/

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

  /*********************************/
 /******* WALL TYPE SELECTOR ******/
/*********************************/

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
    var wallType = this.type;
    if (wallType == 'all types')
      wallType = 'allTypes';
    activityPageSession.set('showWalls',wallType);
  }
})

  /******************************/
 /******* FILTER STUDENTS ******/
/******************************/

Template.filterStudents.helpers({
  statusSelectors: function() {
    return [
      {level: 'nofilter'},
      {level: 'nostatus'},
      {level: 'submitted'},
      {level: 'returned'},
      {level: 'done'}
    ]    
  },
  statusFilter: function() {
    return activityPageSession.get('statusFilter');
  },
  subactivities: function() {
    var activityID = FlowRouter.getParam('_id');
    return Activities.find({pointsTo:activityID});
  },
  subactivityFilter: function() {
    return Activities.findOne(activityPageSession.get('subactivityFilter'));
  }
});

  /******************************/
 /******* STATUS SELECTOR ******/
/******************************/

Template.statusSelector.helpers({
  status: function() {
    return 'icon-' + this.level;
  },
  statusText: function() {
    statusTexts = {
      nofilter: 'no filter',
      nostatus: 'no status',
      submitted: 'submitted',
      returned: 'returned',
      done: 'done'
    }
    return statusTexts[this.level];
  },
  active: function() {
    return (this.level == activityPageSession.get('statusFilter'));
  }
});

Template.statusSelector.events({
  'click li a': function(event,tmpl) {
    activityPageSession.set('statusFilter',this.level);
  }
})

  /***********************************/
 /******* SUBACTIVITY SELECTOR ******/
/***********************************/

Template.statusSelector.helpers({
  active: function() {
    return (this._id == activityPageSession.get('subactivityFilter'));
  }
});

Template.subactivitySelector.events({
  'click li a': function(event,tmpl) {
    activityPageSession.set('subactivityFilter',this._id);
  }
})