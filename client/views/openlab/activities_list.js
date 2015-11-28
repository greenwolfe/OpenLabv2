  /*******************/
 /**** UTILITIES ****/
/*******************/

percentExpected =  function() {
  var studentID = Meteor.impersonatedOrUserId();
  var activityIDs = _.pluck(Activities.find(
    {
      unitID:this._id,
      visible:true
    },
    {fields:{_id:1}}).fetch(),'_id')
  var total = activityIDs.length; 
  if (total == 0) return 0;

  var endDates = _.pluck(WorkPeriods.find(
    {
      unitID:this._id,
      activityVisible:true,
      sectionID: Meteor.selectedSectionId()
    },
    {fields:{endDate:1}}).fetch(),'endDate')
  var today = new Date();
  var expected = endDates.filter(function(date) {
      return (today > date);
    }).length
  return 100*expected/total;
}
percentCompleted = function() {
  var studentID = Meteor.impersonatedOrUserId();
  var cU = Meteor.userId();
  var sectionID = Meteor.selectedSectionId();
  var activityIDs = _.pluck(Activities.find(
    {
      unitID:this._id,
      visible:true
    },
    {fields:{_id:1}}).fetch(),'_id')
  var total = activityIDs.length; 
  if (total == 0) return 0;
  
  var today = new Date();
  var expectedActivityIDs = activityIDs.filter(function(activityID) {
    var workPeriod = WorkPeriods.findOne({
      activityID: activityID,
      sectionID: sectionID
    });
    return ((workPeriod) && (today > workPeriod.endDate));
  });
  var selector = {
    activityID:{$in:expectedActivityIDs}
  };
  var numStudents = 1;
  if (Roles.userIsInRole(studentID,'student')) {
    selector.studentID = studentID;
  } else  if (Roles.userIsInRole(cU,'teacher') && (sectionID)) {
    var sectionMemberIds = Meteor.sectionMemberIds(sectionID);
    numStudents = Math.max(sectionMemberIds.length,1);
    selector.studentID = {$in: sectionMemberIds};
  } else {
    selector.studentID =  studentID; //will find no statuses
  }

  var statuses = ActivityStatuses.find(selector).fetch();
  var completed = statuses.filter(function(status) {
    return _.str.include(status.level,'done')
  }).length
  return 100*completed/numStudents/total;
}  

  /*************************/
 /*** ACTIVITIES LIST  ****/
/*************************/

Template.activitiesList.onRendered(function() {
  $('.fa.fa-question-circle[data-toggle="tooltip"]').tooltip();
});

Template.activitiesList.helpers({
  units: function() {
    var selector = {};
    if (!editingMainPage())
      selector.visible = true; //show only visible units
    return Units.find(selector,{sort: {order: 1}});
  },
  sortableOpts: function() {
    return {
      draggable:'.unittitle',
      handle: '.sortUnit',
      collection: 'Units',
      selectField: 'app', //selects all units
      selectValue: 'openlab', //as openlab is only allowed value of app field
      disabled: !editingMainPage() 
    }
  }
});

  /*********************/
 /** UNIT TITLE      **/
/*********************/

Template.unitTitle.helpers({
  active: function() {
    var activeUnit = openlabSession.get('activeUnit');
    return (this._id == activeUnit) ? 'active' : '';
  },
  active2: function() {
    return (this._id == openlabSession.get('activeUnit2')) ? 'active2':'';
  },
  hidden: function() {
    var activeUnit = openlabSession.get('activeUnit');
    var activeUnit2 = openlabSession.get('activeUnit2');
    return ((this._id == activeUnit) || (this._id == activeUnit2)) ? '' : 'hidden';
  },
  percentExpected: percentExpected,
  percentCompleted: percentCompleted 
});

Template.unitTitle.events({
  'click li > a': function(event,tmpl) {
    event.preventDefault();
    $('#workPeriodPopoverX').modal('hide'); // fixes bug in workPeriodPopoverX ... see notes there
    if (event.ctrlKey) {
      var activeUnit2 = openlabSession.get('activeUnit2');
      var activeUnit = openlabSession.get('activeUnit');
      if (tmpl.data._id == activeUnit2) {
        openlabSession.set('activeUnit2',null);
      } else if (tmpl.data._id == activeUnit){
        return;
      } else if ((activeUnit2) && (tmpl.data._id == activeUnit)) {
        openlabSession.set('activeUnit',activeUnit2);
        openlabSession.set('activeUnit2',null);
      } else {
        openlabSession.set('activeUnit2',tmpl.data._id);
      }
    } else {
      openlabSession.set('activeUnit',tmpl.data._id);
      if (tmpl.data._id == openlabSession.get('activeUnit2'))
        openlabSession.set('activeUnit2',null);
    }
  },
  'dragstart li > a': function(event,tmpl) {
    //bootstrap navs are draggable by default
    //disabling this behavior so you have to grab
    //the draggable handle to sort the units
    event.preventDefault();
  }
})

  /*****************************/
 /** ACTIVITY LIST HEADER  ****/
/*****************************/

Template.activityListHeader.helpers({
  colWidth: function() {
    return openlabSession.get('activeUnit2') ? 'col-md-6' : 'col-md-12';
  },
  bgsuccess: function() {
    return openlabSession.get('activeUnit2') ? 'bgsuccess' : 'bgprimary';
  },
  bgprimary: function() {
    //return 'bgprimary';
    return openlabSession.get('activeUnit2') ? 'bgprimary' : '';
  },
  percentExpected: percentExpected,
  percentCompleted: percentCompleted 
});


  /*************************/
 /** ACTIVITY LIST  *******/
/*************************/

Template.activityList.helpers({
  activities0: function() {
    var activeUnit2 = openlabSession.get('activeUnit2');
    var columns = [];
    var selector = {
      unitID: this._id,
      ownerID: {$in: [null,'']} //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    columns[1] = Activities.find(selector,{sort: {order: 1}}).fetch(); 
    if (activeUnit2)
      return columns[1];
    var half = Math.ceil(columns[1].length/2)
    columns[0] = columns[1].splice(0,half); 
    return columns[0];
  },
  activities1: function() {
    var activeUnit2 = openlabSession.get('activeUnit2');
    var columns = [];
    var selector = {
      unitID: this._id,
      ownerID: {$in: [null,'']} //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    columns[1] = Activities.find(selector,{sort: {order: 1}}).fetch(); 
    if (activeUnit2)
      return null;
    var half = Math.ceil(columns[1].length/2)
    columns[0] = columns[1].splice(0,half); 
    return columns[1];
  },
  bgsuccess: function() {
    return openlabSession.get('activeUnit2') ? 'bgsuccess' : '';
  },
  bgprimary: function() {
    //return 'bgprimary';
    return openlabSession.get('activeUnit2') ? 'bgprimary' : '';
  },
  activities2: function() {
    var activeUnit2 = openlabSession.get('activeUnit2');
    if (!activeUnit2) return null;
    var selector = {
      unitID: activeUnit2,
      ownerID: {$in: [null,'']} //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    return Activities.find(selector,{sort: {order: 1}})
  },
  sortableOpts2: function() {
    var activeUnit2 = openlabSession.get('activeUnit2');
    return {
      draggable:'.aItem',
      handle: '.sortActivity',
      group: 'activityColumn',
      collection: 'Activities',
      selectField: 'unitID',
      selectValue: activeUnit2,
      disabled: !editingMainPage() //currently not working
      //disabled: (!Session.get('editedWall')), //!= this.wallID to apply to a single wall 
    }    
  },
  sortableOpts: function() {
    return {
      draggable:'.aItem',
      handle: '.sortActivity',
      group: 'activityColumn',
      collection: 'Activities',
      selectField: 'unitID',
      selectValue: this._id,
      //disabled: !editingMainPage() //currently not working
      //disabled: (!Session.get('editedWall')), //!= this.wallID to apply to a single wall 
    }
  },
  reassessments: function() {
    var userToShow = Meteor.userId();
    if (Roles.userIsInRole(userToShow,'teacher')) {
      userToShow = openlabSession.get('TeacherViewAs');
    };
    return Activities.find({unitID: this._id, 
      ownerID: {$in: [userToShow]},
      type: 'assessment',
      visible: true},
      {sort: {rank: 1}});
  }
});

  /*************************/
 /** ACTIVITY ITEM  *******/
/*************************/

/* currentStatus */
var currentStatus = function(activityID) {
  var studentID = Meteor.impersonatedOrUserId();
  var sectionID = Meteor.selectedSectionId();
  var cU = Meteor.userId();
  if (Roles.userIsInRole(studentID,'student')) {
    return ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
  } else if (Roles.userIsInRole(cU,'teacher') && (sectionID)) {
    //indicate lowest level so it is flagged if 
    var sectionMemberIds = Meteor.sectionMemberIds(sectionID);
    var levels = _.pluck(ActivityStatuses.find({
      studentID:{$in:sectionMemberIds},
      activityID:activityID},
      {fields: {level: 1}}).fetch(),'level');
    if (levels.length) {
      var statuses = ['nostatus','submitted','returned','donewithcomments','done'];
      var numberMarkedSubmitted = levels.reduce(function(n,l){
        return n  + _.str.count(l,'submitted');
      },0)
      var numberMarkedDone = levels.reduce(function(n,l){
        return n + _.str.count(l,'done');
      },0)
      var numberMarkedReturned = levels.reduce(function(n,l){
        return n + _.str.count(l,'return');
      },0)
      var numberNotSubmitted = sectionMemberIds.length - numberMarkedSubmitted - numberMarkedReturned - numberMarkedDone;
      var tag = numberMarkedSubmitted + ' submitted. ' + numberMarkedReturned + ' returned to students for resubmission. ' + numberMarkedDone + ' done. ' + numberNotSubmitted + ' not yet submitted.';
      //at least one student has submitted something for teacher to look at
      if (numberMarkedSubmitted) {
        return {
          late:false,
          level: 'submitted',
          tag: tag 
        }
      }
      //every student marked done
      if (numberMarkedDone == sectionMemberIds.length) {
        return {
          late: false,
          level: 'done',
          tag: tag
        }
      }
      //teacher has returned all submissions
      //late tag indicates some students still have not submitted
      if (numberMarkedReturned + numberMarkedDone == levels.length) {
        return {
          late: (sectionMemberIds.length - numberMarkedReturned - numberMarkedDone),
          level: 'returned',
          tag: tag
        }
      }
      //some (all?) assignments not submitted yet
      if (numberNotSubmitted) {
        return {
          late: false,
          level: 'nostatus',
          tag: tag
        }
      }
    } else {
      return {
        late: false,
        level: 'nostatus',
        tag: '0 submitted. 0 returned to students for resubmission. 0 done. ' + sectionMemberIds.length + ' not yet submitted.'
      } 
    }
  }
  return undefined;
}

/* currentProgress */
var currentProgress = function(activityID) {
  var studentID = Meteor.impersonatedOrUserId();
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityProgress.findOne({studentID:studentID,activityID:activityID});
}

Template.activityItem.helpers({
  canDelete: function() {
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher')) return false;
    var numBlocks = Blocks.find({activityID:this._id,type:{$ne:'subactivities'}}).count();
    return ((this._id != this.pointsTo) || (numBlocks == 0));
  },
  pointsToOrID: function() {
    return this.pointsTo || this._id;
  },
  studentOrSectionID: function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      var studentID = Meteor.impersonatedId();
      if (studentID)
        return 'id=' + studentID;
      var sectionID = Meteor.selectedSectionId();
      if (sectionID)
        return 'id=' + sectionID;
      return '';
    } else {
      var studentID = Meteor.impersonatedOrUserId(); //in case is parent viewing as student
      if (studentID)
        return 'id=' + studentID; 
      return '';     
    }
  },
  status: function() {
    var status = currentStatus(this._id);
    if (!status)
      return 'icon-nostatus';
    return 'icon-' + status.level;
  },
  progress: function() {
    var progress = currentProgress(this._id);
    if (!progress)
      return 'icon-notStarted';
    return 'icon-' + progress.level;
  },
  statusTitle: function() {
    var status = currentStatus(this._id);
    if (!status)
      return 'not started';
    if ('_id' in status) {
      var titleDict = {
        'nostatus':'empty inbox: not started',
        'submitted':'full inbox: work submitted, waiting for teacher response',
        'returned':'full outbox:  Returned with comments by your teacher.  Please revise and resubmit.',
        'donewithcomments':'Done.  Revisions not required but review comments by your teacher before taking an assessment',
        'done':'Done.'
      };
    } else {
      var titleDict = {
        'nostatus':'empty inbox. ' + status.tag,
        'submitted': 'Inbox has submissions. ' + status.tag,
        'returned':'Outbox has returned work. ' + status.tag,
        'donewithcomments':"All students marked done.",
        'done':"All students marked done."
      };
    }
    return titleDict[status.level];
  },
  progressTitle: function() {
    var progress = currentProgress(this._id);
    if (!progress)
      return 'not started';
    var titleDict = {
      'notStarted':'not started',
      'oneBar':'barely started',
      'twoBars':'almost half-way done',
      'threeBars':'more than half-way done',
      'fourBars':'80% there',
      'fiveBars':'just about done'};
    return titleDict[progress.level];
  },
  late: function() {
    var status = currentStatus(this._id);
    if (!status)
      return '';
    return (status.late) ? 'icon-late' : '';  
  },
  lateHoverText: function() {
    var status = currentStatus(this._id);
    if (!status || _.isBoolean(status.late))
      return 'late';
    return status.late + ' students have not yet submitted this assignment.';
  },
/*  expected: function() { //compute based on workPeriod
    return 'expected';
  },
  completed: function() {
    var status = currentStatus(this._id);
    if (!status)
      return '';
    return _.str.include(status.level,'done') ? 'completed' : '';
  },*/
  workPeriod: function () {
    //find existing workPeriod
    var workPeriod =  WorkPeriods.findOne({
      activityID: this._id,
      sectionID: Meteor.selectedSectionId()
    });
    if (workPeriod) 
      return workPeriod;

    //else get unit dates off a workPeriod for another activity from the same unit and section
    //unitDatesWithoutSelf are by definition the unitDates for the other workPeriod
    workPeriod = WorkPeriods.findOne({
      unitID: this.unitID,
      sectionID: Meteor.selectedSectionId()
    });
    if (workPeriod) {
      //keep existing unitID, sectionID, unitDates 
      workPeriod.activityID = this._id;
      workPeriod.activityVisible = this.visible;
      workPeriod.startDate = longLongAgo();
      workPeriod.endDate = longLongAgo();
      workPeriod.unitStartDateWithoutSelf = workPeriod.unitStartDate;
      workPeriod.unitEndDateWithoutSelf = workPeriod.unitEndDate;
      return workPeriod;
    }

    //else make up a stub with all null values
    workPeriod = {
      activityID: this._id, //passed in for later use
      unitID: this.unitID, //passed in for completeness, probably not used to display data
      activityVisible: this.visible, //passed in for completeness, probably not used to display data
      sectionID: 'applyToAll', //default value
      startDate: longLongAgo(),
      endDate: longLongAgo(),
      unitStartDate: longLongAgo(),
      unitEndDate: notSoLongAgo(),
      unitStartDateWithoutSelf: wayWayInTheFuture(),
      unitEndDateWithoutSelf: notSoLongAgo()
    };
    return workPeriod;
  },
  tags: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var activityID = this._id;
    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
    var tags = '';
    if (this.tag) 
      tags += ' (' + this.tag + ')';
    if ((status) && (status.tag))
      tags += '<strong> (' + status.tag + ')</strong>';
    return tags;    
  }
})

Template.activityItem.events({
  'click .deleteActivity':function() {
    if (confirm('Are you sure you want to delete this activity?')) {
      Meteor.call('deleteActivity', this._id,alertOnError);
    }
  },
  'click .activityProgress': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('incrementProgress',studentID,tmpl.data._id,alertOnError);  
  },
  'click .activityStatus': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('incrementStatus',studentID,tmpl.data._id,alertOnError);  
  },
  'click .activityPunctual': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('markOnTime',studentID,tmpl.data._id,alertOnError);  
  },
  'click .tagActivity': function(event,tmpl) {
    Session.set('activityForTagModal',this);
  }
})

  /*************************/
 /*** NEW ACTIVITY  *******/
/*************************/

Template.newActivity.helpers({
  fixedFields: function() {
    return {unitID:this._id}
  }
})