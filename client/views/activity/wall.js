  /**************/
 /**** WALL ****/
/**************/

Template.wall.onCreated(function() {
  var instance = this;
//  instance.subscribe('columns', instance.data._id);
  instance.showStatus = new ReactiveVar(false);
  instance.whichGroups = new ReactiveVar("thisActivity");
})

Template.wall.onDestroyed(function() {
  Meteor.call('deleteWallIfEmpty',this.data._id);
})

Template.wall.helpers({
  title: function() {
    if (this.type == 'teacher') return 'Teacher Wall';
    if (this.type == 'student') {
      var student = Meteor.users.findOne(this.createdFor);
      if (student)
        return 'Student Wall for ' + Meteor.getname(student,'full');
    }
    if (this.type == 'group') {
      var groupies = Meteor.groupies('current',this.createdFor);
      if (groupies == 'none')
        groupies = Meteor.groupies('final',this.createdFor);
      if (groupies == 'none') 
        groupies = Meteor.groupies('former',this.createdFor);
      return 'Group Wall for ' +  groupies;
    }
    if (this.type == 'section') {
      var section = Sections.findOne(this.createdFor);
      if (section)
        return section.name + ' Wall';
    }
    return '';
  },
  showingStudentWalls: function() {
    return (activityPageSession.get('showWalls') == 'student');
  },
  studentActive: function() {
    return (this.createdFor == Meteor.impersonatedId()) ? 'bg-primary text-white' : '';
  },
  sectionActive: function() {
    return ((this.createdFor != Meteor.impersonatedId()) && (Meteor.currentSectionId(this.createdFor) == Meteor.selectedSectionId())) ? 'bg-primary text-white' : '';
  },
  wallIsNotEmpty: function() {
    return Blocks.find({wallID:this._id}).count();
  },
  pastGroups: function() {
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,['student','teacher']))
      return '';
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return '';
    var groupIDs = _.pluck(Memberships.find({memberID:studentID,collectionName:'Groups'},{fields:{itemID:1},sort:{startDate:-1}}).fetch(),'itemID');
    groupIDs = _.unique(groupIDs);
    groupIDs = _.without(groupIDs,Meteor.currentGroupId());
    return Groups.find({_id:{$in:groupIDs}});
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
  showStatus: function() {
    var tmpl = Template.instance();
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher'))
      return false;
    return tmpl.showStatus.get();
  },
  activityGroupsSelected: function() {
    var tmpl = Template.instance();
    return (tmpl.whichGroups.get() == "thisActivity") ? 'active' : '';
  },
  currentGroupsSelected: function() {
    var tmpl = Template.instance();
    return (tmpl.whichGroups.get() == "current") ? 'active' : '';
  },  
  groups: function() {
    var tmpl = Template.instance();
    var whichGroups = tmpl.whichGroups.get();
    var sectionID = Meteor.selectedSectionId();
    if (!sectionID)
      return '';
    var sectionMemberIDs = Meteor.sectionMemberIds(sectionID);

    if (whichGroups == 'current') {
      var groupIDs = [];
      sectionMemberIDs.forEach(function(studentID) {
        var currentGroupID = Meteor.currentGroupId(studentID);
        if (currentGroupID)
          groupIDs.push(currentGroupID);
      });
      groupIDs = _.unique(groupIDs);
      return Groups.find({_id:{$in:groupIDs}});
    } else if (whichGroups == 'thisActivity') {
      var groupIDs = _.pluck(Walls.find({activityID:FlowRouter.getParam('_id'),type:'group'},{fields:{createdFor:1}}).fetch(),'createdFor');
      groupIDs = _.unique(groupIDs);
      groupIDs = groupIDs.filter(function(groupID) {
        var memberIDs = Meteor.groupMemberIds('current',groupID);
        if (!memberIDs.length)
          memberIDs = Meteor.groupMemberIds('final',groupID);
        return _.intersection(sectionMemberIDs,memberIDs).length;
      })
      return Groups.find({_id:{$in:groupIDs}});
    }
    return '';
  },
  ungroupedCount: function() {
    var sectionID = Meteor.selectedSectionId();
    if (!sectionID)
      return '';
    var sectionMemberIDs = Meteor.sectionMemberIds(sectionID);
    var tmpl = Template.instance();
    var whichGroups = tmpl.whichGroups.get();
    if (whichGroups == 'current') {
      sectionMemberIDs = sectionMemberIDs.filter(function(studentID) {
        return  (!Meteor.currentGroupId(studentID));
      }); 
      return sectionMemberIDs.length;
    } else if (whichGroups == 'thisActivity') {
      var groupIDs = _.pluck(Walls.find({activityID:FlowRouter.getParam('_id'),type:'group'},{fields:{createdFor:1}}).fetch(),'createdFor');
      groupIDs = _.unique(groupIDs);
      groupIDs.forEach(function(groupID) {
        var memberIDs = Meteor.groupMemberIds('current',groupID);
        if (!memberIDs.length)
          memberIDs = Meteor.groupMemberIds('final',groupID);
        sectionMemberIDs = _.difference(sectionMemberIDs,memberIDs);
      })
      return sectionMemberIDs.length;
    }
    return '';
  },
  ungrouped: function() {
    var sectionID = Meteor.selectedSectionId();
    if (!sectionID)
      return '';
    var sectionMemberIDs = Meteor.sectionMemberIds(sectionID);
    var tmpl = Template.instance();
    var whichGroups = tmpl.whichGroups.get();
    if (whichGroups == 'current') {
      sectionMemberIDs = sectionMemberIDs.filter(function(studentID) {
        return  (!Meteor.currentGroupId(studentID));
      }); 
      if (sectionMemberIDs.length == 0)
        return '';
      return Meteor.users.find({_id:{$in:sectionMemberIDs}});
    } else if (whichGroups == 'thisActivity') {
      var groupIDs = _.pluck(Walls.find({activityID:FlowRouter.getParam('_id'),type:'group'},{fields:{createdFor:1}}).fetch(),'createdFor');
      groupIDs = _.unique(groupIDs);
      groupIDs.forEach(function(groupID) {
        var memberIDs = Meteor.groupMemberIds('current',groupID);
        if (!memberIDs.length)
          memberIDs = Meteor.groupMemberIds('final',groupID);
        sectionMemberIDs = _.difference(sectionMemberIDs,memberIDs);
      })
      if (sectionMemberIDs.length == 0)  
        return '';
      return Meteor.users.find({_id:{$in:sectionMemberIDs}});   
    }
    return '';
  }
})

Template.wall.events({
  'click .setViewStudent': function(event,tmpl) {
    event.preventDefault();
    var wall = tmpl.data;
    loginButtonsSession.set('viewAs',wall.createdFor);
  },
  'click .setViewSection': function(event,tmpl) {
    event.preventDefault();
    var wall = tmpl.data;
    var section = Meteor.currentSectionId(wall.createdFor);
    loginButtonsSession.set('viewAs',section);
  },
  'click .addGroupWall': function(event,tmpl) {
    var wall = tmpl.data;
    Meteor.call('insertWall',{
      activityID: wall.activityID,
      createdFor: wall.createdFor,
      type: 'group'
    },alertOnError)
  },
  'click .editColumns': function(event,tmpl) {
    var wall = tmpl.data._id;
    if (activityPageSession.get('editedWall') != wall) {
      activityPageSession.set('editedWall',wall)
    } else {
      activityPageSession.set('editedWall',null);
    }
  },
  'click .showStatus': function(event,tmpl) {
    var showStatus = tmpl.showStatus.get();
    tmpl.showStatus.set(!showStatus);
  },
  'click .activityGroups': function(event,tmpl) {
    tmpl.whichGroups.set('thisActivity');
  },
  'click .currentGroups': function(event,tmpl) {
    tmpl.whichGroups.set('current');
  },  
})

  /************************/
 /*** STUDENT STATUS  ****/
/************************/

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
/*var currentProgress = function(activityID,studentID) {
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityProgress.findOne({studentID:studentID,activityID:activityID});
}*/

Template.studentStatus.helpers({
  subactivities: function() {
    return Activities.find({
      pointsTo: FlowRouter.getParam('_id')
    },{sort: {suborder: 1}});
  },
  isSectionMember: function() {
    return Meteor.isSectionMember(this._id,Meteor.selectedSectionId());
  },
/*  progress: function() {
    var tmpl = Template.instance();
    var studentID = tmpl.data._id;
    var activityID = this._id;
    var progress = currentProgress(activityID,studentID);
    if (!progress)
      return 'icon-notStarted'
    return 'icon-' + progress.level;
  },*/
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
/*  progressTitle: function() {
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
  },*/
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
  },
  leftTheGroup: function(groupID) {
    return Meteor.dateLeftGroup(this._id,groupID) ? 'text-warning' : '';
  },
  leavingDate: function(groupID) {
    var dateLeftGroup = Meteor.dateLeftGroup(this._id,groupID);
    return (dateLeftGroup) ? " left on " + moment(dateLeftGroup).format("MMM D YYYY") : '';
  }
});

Template.studentStatus.events({
  'click .studentName': function(event,tmpl) {
    loginButtonsSession.set('viewAs',tmpl.data._id);
    event.preventDefault();
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

  /*****************************/
 /**** PAST GROUP SELECTOR ****/
/*****************************/

Template.pastGroupSelector.helpers({
  isInGroup: function() {
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return false;
    var currentGroupIds = Meteor.groupMemberIds('current',this._id);
    var finalGroupIds = Meteor.groupMemberIds('final',this._id);    
    var formerGroupIds = Meteor.groupMemberIds('former',this._id);
    var groupIds = _.union(currentGroupIds,finalGroupIds);
    if (!groupIds.length) 
      groupIds = formerGroupIds;
    return (_.contains(groupIds,studentID));
  },
  groupMembers: function() {
    var currentGroupies = Meteor.groupies('current',this._id);
    var finalGroupies = Meteor.groupies('final',this._id);
    var formerGroupies = Meteor.groupies('former',this._id);
    if ((currentGroupies == 'none') && (finalGroupies == 'none') && (formerGroupies == 'none'))
      return 'none';
    if ((currentGroupies == 'none') && (finalGroupies == 'none')) {
      var groupies = formerGroupies;
    } else {
      var groupies = (currentGroupies != 'none') ? currentGroupies : '';
      if (finalGroupies != 'none') {
        if (currentGroupies != 'none')
          groupies += ': ';
        groupies += finalGroupies;
      }
    }
    return groupies;
  }
})

Template.pastGroupSelector.events({
  'click .pastGroup': function(event,tmpl) {
    event.preventDefault();
    wall = Template.parentData();
    var group = this;
    Meteor.call('wallChangeGroup',wall._id,group._id,Meteor.impersonatedOrUserId());
  }
})