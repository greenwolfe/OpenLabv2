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
 /******* STATUS SELECTOR ******/
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

  /*****************************/
 /**** SUBACTIVITIES LIST *****/
/*****************************/

Template.subActivitiesList.onCreated(function() {
  var instance = this;
  instance.editingList = new ReactiveVar(false);
})

Template.subActivitiesList.helpers({
  editingList: function() {
    var instance = Template.instance();
    return instance.editingList.get();
  },
  helpMessages: function () {
    return [
      'Activities created here will also appear in the main units and activities list, for example on the main page.',
      "They will all link back to the same activity page - this one.",
      "Reordering of the list in this block is independent of the main list.  In the main list, these activities can be sorted among the other activities or even moved to other units.",
      "The title of this block, if it exists, will be used as the title of the page as well.  Otherwise, the title of the initial activity is used.",
      "Create just one subactivities block per activity page.  It can be deleted and re-created without causing problems, but it is probably better just to hide it if you don't want it visible to students."
    ]
  },
  subactivities: function() {
    var activity = Activities.findOne(FlowRouter.getParam('_id'));
    return Activities.find({
      pointsTo:activity._id
    },{sort: {suborder: 1}});
  },
  sortableOpts: function() {
    var instance = Template.instance();
    var activity = Activities.findOne(FlowRouter.getParam('_id'));
    return {
      draggable:'.aItem',
      handle: '.sortActivity',
      group: '.activityColumn',
      collection: 'Activities',
      selectField: 'pointsTo',
      selectValue: activity._id,
      sortField: 'suborder',
      disabled: false //(!instance.editingList.get()) 
      //onAdd: function(evt) {
      //  Meteor.call('denormalizeBlock',evt.data._id,alertOnError);
      //}
    }
  }
})

Template.subActivitiesList.events({
  'click .editSubactivities': function(event,tmpl) {
    tmpl.editingList.set(true);
  },
  'click .stopEditingSubactivities' : function(event,tmpl) {
    tmpl.editingList.set(false);
  }
})
