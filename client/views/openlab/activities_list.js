  /*************************/
 /*** ACTIVITIES LIST  ****/
/*************************/

//Template.activitiesList.rendered = function() {
//  $('#activities').accordion({heightStyle: "content"});
//}

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
    if (!activeUnit) {
      var units = Units.find({visible:true},{sort: {order: 1}}).fetch();
      var cU = Meteor.user();
      activeUnit = units[0]._id;
      if (cU && ('profile' in cU) && ('lastOpened' in cU.profile) && 
        ('studentActivityList' in cU.profile.lastOpened) && 
        Units.findOne(cU.profile.lastOpened.studentActivityList)) 
          activeUnit = cU.profile.lastOpened.studentActivityList;
      openlabSession.set('activeUnit', activeUnit);
    }
    return (this._id == activeUnit) ? 'active' : '';
  },
  active2: function() {
    return (this._id == openlabSession.get('activeUnit2')) ? 'active2':'';
  },
  hidden: function() {
    var activeUnit = openlabSession.get('activeUnit');
    return (this._id == activeUnit) ? '' : 'hidden';
  },
  editable: function() {
    var activeUnit = Session.get('activeUnit');
    return (this._id == activeUnit) ? 'true' : '';
  },
  percentExpected: function() {
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
  },
  percentCompleted: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var activityIDs = _.pluck(Activities.find(
      {
        unitID:this._id,
        visible:true
      },
      {fields:{_id:1}}).fetch(),'_id')
    var total = activityIDs.length; 
    if (total == 0) return 0;

    var statuses = ActivityStatuses.find(
      {
        activityID:{$in:activityIDs},
        studentID:studentID
      }).fetch();
    var completed = statuses.filter(function(status) {
      return _.str.include(status.level,'done')
    }).length
    return 100*completed/total;
  }  
});

Template.unitTitle.events({
  'click li > a': function(event,tmpl) {
    event.preventDefault();
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
        var cU = Meteor.user();
        if (cU && ('profile' in cU)) {
          Meteor.users.update({_id:cU._id}, { $set:{"profile.lastOpened.studentActivityList":activeUnit2} });
        }
      } else {
        openlabSession.set('activeUnit2',tmpl.data._id);
      }
    } else {
      openlabSession.set('activeUnit',tmpl.data._id);
      if (tmpl.data._id == openlabSession.get('activeUnit2'))
        openlabSession.set('activeUnit2',null);
      var cU = Meteor.user();
      if (cU && ('profile' in cU)) {
        Meteor.users.update({_id:cU._id}, { $set:{"profile.lastOpened.studentActivityList":tmpl.data._id} });
      }
    }
  },
  'dragstart li > a': function(event,tmpl) {
    //bootstrap navs are draggable by default
    //disabling this behavior so you have to grab
    //the draggable handle to sort the units
    event.preventDefault();
  }
})

  /*************************/
 /** ACTIVITY LIST  *******/
/*************************/

Template.activityList.onCreated(function() {
  instance = this;

  instance.autorun(function() {
    var userID = Meteor.impersonatedOrUserId();
    if (!userID)
      return;
    var sectionID = Meteor.selectedSectionId();
    var unitID = instance.data._id;
    //first get the info that will be immediately shown
    var activitiesThisUnit = Meteor.subscribe('activityStatuses',userID,unitID);
    var workPeriodsThisUnit = Meteor.subscribe('workPeriods',sectionID,unitID);

    if (activitiesThisUnit.ready()) { //then load the rest in the background
      var activityStatuses = Meteor.subscribe('activityStatuses',userID); 
      if (activityStatuses.ready() && Roles.userIsInRole(Meteor.userId(),'teacher'))
        Meteor.subscribe('activityStatuses');
    }
    if (workPeriodsThisUnit.ready()) {
      var workPeriods = Meteor.subscribe('workPeriods',sectionID);
      if (workPeriods.ready() && Roles.userIsInRole(Meteor.userId(),'teacher'))
        Meteor.subscribe('workPeriods');
    }
  })
})

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
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
}

Template.activityItem.helpers({
  pointsToOrID: function() {
    return this.pointsTo || this._id;
  },
  status: function() {
    var status = currentStatus(this._id);
    if (!status)
      return 'icon-notStarted'
    return 'icon-' + status.level;
  },
  statusTitle: function() {
    var status = currentStatus(this._id);
    if (!status)
      return 'not started';
    var titleDict = {
      'notStarted':'not started',
      'oneBar':'barely started',
      'twoBars':'almost half-way done',
      'threeBars':'more than half-way done',
      'fourBars':'80% there',
      'fiveBars':'just about done',
      'submitted':'work submitted, waiting for teacher response',
      'returned':'Please revise and resubmit according to comments by your teacher',
      'donewithcomments':'Done.  Revisions not required but review comments by your teacher before taking an assessment',
      'done':'Done.'};
    return titleDict[status.level];
  },
  late: function() {
    var status = currentStatus(this._id);
    if (!status)
      return '';
    return (status.late) ? 'icon-late' : '';  
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
  }
})

Template.activityItem.events({
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