Template.wall.onCreated(function() {
  var instance = this;
  instance.subscribe('columns', instance.data._id);
//edited Aug 21, 2015 ... delete if it causes no problems
/*  instance.autorun(function() {
    var columnSubscription = instance.subscribe('columns', instance.data._id);
  });*/
})

Template.wall.onDestroyed(function() {
  Meteor.call('deleteWallIfEmpty',this.data._id);
})

Template.wall.helpers({
  title: function() {
    if (this.type == 'teacher') return 'Teacher Wall';
    if (this.type == 'student') {
      var student = Meteor.impersonatedOrUser();
      if (student)
        return 'Student Wall for ' + Meteor.getname(student,'full');
    }
    if (this.type == 'group') return 'Group Wall for ' +  Meteor.groupies(this.createdFor);
    if (this.type == 'section') {
      var section = Sections.findOne(this.createdFor);
      if (section)
        return section.name + ' Wall';
    }
    return '';
  },
  helpMessages: function () {
    return [
      'Use the add block menu to add a block to a column in this wall.',
      'Edit any <span class="blue-outlined">blue-outlined text.</span>  Just click inside the blue outline and start typing.',
      'Select text to reveal the formatting toolbar.',
      'Click anywhere outside the blue outline to save changes. ',
      'Drag and drop to rearrange blocks.  You can drag a block to another column or even another wall.',
      'Use the modify menu to expand, shrink, add and delete columns.'
    ]
  },
  columns: function() {
    return Columns.find({wallID:this._id},{sort: {order:1}});
  },
  canEditWall: function() {
    var cU = Meteor.user();
    if (!cU) return false;
    if (Roles.userIsInRole(cU,'teacher')) return true;
    if (Roles.userIsInRole(cU,'parentOrAdvisor')) return false;
    if (Roles.userIsInRole(cU,'student')) { //should be true by default, but being sure
      return Meteor.studentCanEditWall(cU._id,this);
    }
    return false;
  },
  editColumns: function() {
    return (inEditedWall(this._id)) ? 'Done' : 'Edit Wall';
  },
  visibleOrEditing: function() {
    return (this.visible || inEditedWall(this._id));
  },
  groups: function() {
    var sectionID = Meteor.selectedSectionId();
    if (!sectionID)
      return '';
    var groupIDs = [];
    var sectionMemberIDs = Meteor.sectionMemberIds(sectionID);
    sectionMemberIDs.forEach(function(studentID) {
      var currentGroupID = Meteor.currentGroupId(studentID);
      if (currentGroupID)
        groupIDs.push(currentGroupID);
    });
    groupIDs = _.unique(groupIDs);
    return Groups.find({_id:{$in:groupIDs}});
  },
  ungroupedCount: function() {
    var sectionID = Meteor.selectedSectionId();
    if (!sectionID)
      return '';
    var sectionMemberIDs = Meteor.sectionMemberIds(sectionID);
    sectionMemberIDs = sectionMemberIDs.filter(function(studentID) {
      return  (!Meteor.currentGroupId(studentID));
    }); 
    return sectionMemberIDs.length;
  },
  ungrouped: function() {
    var sectionID = Meteor.selectedSectionId();
    if (!sectionID)
      return '';
    var sectionMemberIDs = Meteor.sectionMemberIds(sectionID);
    sectionMemberIDs = sectionMemberIDs.filter(function(studentID) {
      return  (!Meteor.currentGroupId(studentID));
    }); 
    if (sectionMemberIDs.length == 0)
      return '';
    return Meteor.users.find({_id:{$in:sectionMemberIDs}});
  }
})

Template.wall.events({
  'click .editColumns': function(event,tmpl) {
    var wall = tmpl.data._id;
    if (activityPageSession.get('editedWall') != wall) {
      activityPageSession.set('editedWall',wall)
    } else {
      activityPageSession.set('editedWall',null);
    }
  }
})

  /************************/
 /*** STUDENT STATUS  ****/
/************************/

Template.studentStatus.onCreated(function() {
  instance = this;

  instance.autorun(function() {
    var userID = instance.data._id;
    var activity = Activities.findOne(FlowRouter.getParam('_id'));

    if (activity) {
      var thisUnitSubscription = instance.subscribe('subActivityStatuses',userID,activity.pointsTo);
      var thisUnitProgress = instance.subscribe('subActivityProgress',userID,activity.pointsTo);
    }
  })
})

Template.studentStatus.onRendered(function() {
  instance = this;
  instance.$('[data-toggle="tooltip"]').tooltip();
})

/* currentStatus */
var currentStatus = function(activityID,studentID) {
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
}
/* currentProgress */
var currentProgress = function(activityID,studentID) {
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityProgress.findOne({studentID:studentID,activityID:activityID});
}

Template.studentStatus.helpers({
  subactivities: function() {
    return Activities.find({
      pointsTo: FlowRouter.getParam('_id')
    },{sort: {suborder: 1}});
  },
  isSectionMember: function() {
    return Meteor.isSectionMember(this._id,Meteor.selectedSectionId());
  },
  progress: function() {
    var tmpl = Template.instance();
    var studentID = tmpl.data._id;
    var activityID = this._id;
    var progress = currentProgress(activityID,studentID);
    if (!progress)
      return 'icon-notStarted'
    return 'icon-' + progress.level;
  },
  status: function() {
    var tmpl = Template.instance();
    var studentID = tmpl.data._id;
    var activityID = this._id;
    var status = currentStatus(activityID,studentID);
    if (!status)
      return 'icon-nostatus'
    return 'icon-' + status.level;
  },
  statusTitle: function() {
    var tmpl = Template.instance();
    var studentID = tmpl.data._id;
    var activityID = this._id;
    var status = currentStatus(activityID,studentID);
    if (!status)
      return 'not started';
    var titleDict = {
      'nostatus':'empty inbox: not started',
      'submitted':'full inbox: work submitted, waiting for teacher response',
      'returned':'full outbox:  Returned with comments by your teacher.  Please revise and resubmit.',
      'donewithcomments':'Done.  Revisions not required but review comments by your teacher before taking an assessment',
      'done':'Done.'};
    return titleDict[status.level];
  },
  progressTitle: function() {
    var tmpl = Template.instance();
    var studentID = tmpl.data._id;
    var activityID = this._id;
    var progress = currentProgress(activityID,studentID);
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
    var tmpl = Template.instance();
    var studentID = tmpl.data._id;
    var activityID = this._id;
    var status = currentStatus(activityID,studentID);
    if (!status)
      return '';
    return (status.late) ? 'icon-late' : '';  
  },
  theImpersonated: function() {
    return (this._id == Meteor.impersonatedId()) ? 'bg-primary' : '';
  }
});

Template.studentStatus.events({
  'click .studentName': function(event,tmpl) {
    loginButtonsSession.set('viewAs',tmpl.data._id);
  },
  'click .activityProgress': function(event,tmpl) {
    var studentID = tmpl.data._id;
    var activityID = this._id;
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('incrementProgress',studentID,activityID,alertOnError);  
  },
  'click .activityStatus': function(event,tmpl) {
    var studentID = tmpl.data._id;
    var activityID = this._id;
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('incrementStatus',studentID,activityID,alertOnError);  
  },
  'click .activityPunctual': function(event,tmpl) {
    var studentID = tmpl.data._id;
    var activityID = this._id;
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('markOnTime',studentID,activityID,alertOnError);  
  }
})