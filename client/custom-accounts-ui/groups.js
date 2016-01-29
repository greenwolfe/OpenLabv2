  /**********************/
 /******* GROUPS *******/
/**********************/

Template.groups.onCreated(function() {
  var instance = this;
  instance.showHistory = new ReactiveVar(false);
})

/* groups helpers */
Template.groups.helpers({
  openGroups: function() {
    var groupIDs = [];
    var students = Roles.getUsersInRole('student');
    students.forEach(function(student) {
      var currentGroupID = Meteor.currentGroupId(student._id);
      if (currentGroupID)
        groupIDs.push(currentGroupID);
    });
    groupIDs = _.unique(groupIDs);
    var today = new Date();
    return Groups.find({_id:{$in:groupIDs},openUntil:{$gt:today}});
  },
  openGroupsCount: function() {
    var groupIDs = [];
    var students = Roles.getUsersInRole('student');
    students.forEach(function(student) {
      var currentGroupID = Meteor.currentGroupId(student._id);
      if (currentGroupID)
        groupIDs.push(currentGroupID);
    });
    groupIDs = _.unique(groupIDs);
    var today = new Date();
    return Groups.find({_id:{$in:groupIDs},openUntil:{$gt:today}}).count();
  },
  groupIsOpen: function() {
    var today = new Date();
    return (today < this.openUntil);
  },
  pollIsOpen: function() {
    var today = new Date();
    return (today < this.pollClosesAt);
  },
  voteIsYes: function() {
    var today = new Date();
    if (today > this.pollClosesAt)
      return false;
    return _.contains(this.votesToOpen,Meteor.impersonatedOrUserId());
  },
  membersWhoVotedToOpen: function() {
    var today = new Date();
    if (today > this.pollClosesAt)
      return '';
    var verb = (this.votesToOpen.length > 1) ? ' have' : ' has';
    return groupToString(this.votesToOpen) + verb;
  },
  formerMembers: function() {
    if (this.status == 'active') {
      return Meteor.groupMemberIds(['former','final'],this._id).length;
    } else {
      return Meteor.groupMemberIds('former',this._id).length;
    }
  },
  showHistory: function() {
    var tmpl = Template.instance();
    return tmpl.showHistory.get();
  },
  hasPastGroups: function() {
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,['student','teacher']))
      return 0;
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return 0;
    var groupIDs = _.pluck(Memberships.find({memberID:studentID,collectionName:'Groups'},{fields:{itemID:1}}).fetch(),'itemID');
    groupIDs = _.unique(groupIDs);
    //groupIDs = _.without(groupIDs,Meteor.currentGroupId());
    return groupIDs.length;
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
    //groupIDs = _.without(groupIDs,Meteor.currentGroupId());
    if (!groupIDs.length)
      return '';
    var pastGroups = [];
    groupIDs.forEach(function(groupID) {
      var pastGroupies = Meteor.groupies('current',groupID);
      if (pastGroupies == 'none') 
        pastGroupies = Meteor.groupies('final',groupID);
      if (pastGroupies == 'none')
        pastGroupies = Meteor.groupies('former',groupID);
      if (pastGroupies == 'none')
        return '';
      var membership = Memberships.findOne({
        memberID:studentID,
        collectionName:'Groups',
        itemID:groupID
      },{sort:{startDate:-1}});
      if (membership.status == 'former')
        pastGroupies = 'with ' + pastGroupies;
      var preposition = (membership.status == 'former') ? ' left on ' : ' to ';
      var today = new Date();
      var endDate = (membership.endDate > today) ? 'present' : moment(membership.endDate).format("MMM D, YYYY");
      pastGroupies += ' from ' + moment(membership.startDate).format("MMM D, YYYY") + preposition + endDate;
      pastGroups.push({names:pastGroupies});
    })
    return pastGroups;
  }
})

/* groups events */
Template.groups.events({
  'click #leave-group': function(event,tmpl) {
    event.stopPropagation();
    var user = Meteor.user();
    if (!Roles.userIsInRole(user,['student','teacher']))
      return;
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return;
    var groupID = Meteor.currentGroupId();
    var today = new Date();
    var membership = Memberships.findOne({
      itemID:groupID,
      collectionName:'Groups',
      memberID: studentID,
      status: 'current',
      startDate: {$lt:today},
      endDate: {$gt:today}
    });
    if (!membership)
      return;
    Meteor.call('removeMember',membership._id,'final',alertOnError);
  },
  'click #open-group': function(event,tmpl) {
    event.stopPropagation();
    var user = Meteor.user();
    if (!Roles.userIsInRole(user,['student','teacher']))
      return;
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return;
    var groupID = Meteor.currentGroupId();
    Meteor.call('voteToOpenGroup',groupID,studentID,alertOnError);
  },
  'click #close-group': function(event,tmpl) {
    event.stopPropagation();
    var user = Meteor.user();
    if (!Roles.userIsInRole(user,['student','teacher']))
      return;
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return;
    var groupID = Meteor.currentGroupId();
    Meteor.call('closeGroup',groupID,studentID,alertOnError);
  },
  'click #form-new-group': function(event,tmpl) {
    event.stopPropagation();
    var user = Meteor.user();
    if (!Roles.userIsInRole(user,['student','teacher']))
      return;
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return;
    //make new group and keep it open to new members for two minutes
    var twoMinutesFromNow = moment().add(2,'minutes').toDate();
    Meteor.call('addGroup',twoMinutesFromNow,function(error,groupID) {
      if (error) {
        alert(Error.Reason);
      } else {  //add current user to new group 
        Meteor.call('addMember',{
          memberID:studentID,
          itemID: groupID,
          collectionName: 'Groups'
        },function(error,membershipID){
          if (error) {
            alert(Error.Reason)
          } else { //and then close it
            Meteor.call('closeGroup',groupID,studentID,alertOnError);
          }
        });
      }
    })
  },
  'click #show-history': function(event,tmpl) {
    event.stopPropagation();
    tmpl.showHistory.set(true);
  },
  'click #hide-history': function(event,tmpl) {
    event.stopPropagation();
    tmpl.showHistory.set(false);
  }
})

Template.joinGroup.events({
  'click #join-group': function(event,tmpl) {
    event.preventDefault();
    var user = Meteor.user();
    if (!Roles.userIsInRole(user,['student','teacher']))
      return;
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return;
    Meteor.call('addMember',{
      memberID: studentID,
      itemID: this._id,
      collectionName: 'Groups'
    },alertOnError);    
  }
})

/* groups helper functions */
var groupToString = function(invitees) {
  var groupies = '';
  var groupMembers = Meteor.users.find({_id:{$in:invitees}});
  var groupSize = groupMembers.count();
  groupMembers.forEach(function(user,i,gMs) {
    var fullname =  user.profile.firstName + " " + user.profile.lastName;
    groupies += "<span title='" + fullname  + "'>" + user.profile.firstName + "</span>";
    if (i == groupSize - 2) {
      groupies += ' and ';
    } else if (i < groupSize - 2) {
      groupies += ', ';
    };
  })
  return groupies;
}


/* EVERYTHING DEPRECATED BELOW I THINK */

  /****************************/
 /******* USER TO VIEW *******/
/****************************/

/* user to view helpers */
/*Template.userChooseGroupMembers.helpers({
  active: function() {
    return (_.contains(loginButtonsSession.get('invitees'),this._id)) ? 'active' : '';
  },
  disabled: function() {
    if (Meteor.currentGroup()) {
      return (Meteor.impersonatedOrUserId() == this._id) ? 'disabled' : ''; 
    } else {
      return (_.contains(Meteor.groupMemberIds(),this._id) || (Meteor.impersonatedOrUserId() == this._id)) ? 'disabled' : '';
    }
  }
})*/

/* user to view events */
/*Template.userChooseGroupMembers.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    if (tmpl.$('li').hasClass('disabled'))
      return;
    loginButtonsSession.toggleArray('invitees',tmpl.data._id);
  }
})*/

  /*******************************/
 /******* SECTION TO VIEW *******/
/*******************************/

/* section to view helpers */
/*Template.sectionChooseGroupMembers.helpers({
  active: function() {
    var sectionID = loginButtonsSession.get('sectionID')
    if (!sectionID) return '';
    return (this._id == sectionID) ? 'active' : '';
  }
})*/

/* section to view events */
/*Template.sectionChooseGroupMembers.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    loginButtonsSession.set('sectionID',tmpl.data._id);
  }
})*/

  /***************************/
 /******* OPEN INVITE *******/
/***************************/

/* open invite helpers */
/*Template.openInvite.helpers({
  invitingMembers: function() {
    var invitingMembers = Meteor.groupMemberIds(this.itemID);
    return groupToString(invitingMembers);
  },
  haveHas: function() {
    return (Meteor.groupMembers(this.itemID).count() == 1) ? 'has': 'have';
  },
  alsoInvited: function() {
    var invitedMembers = Meteor.invitedMemberIds(this.itemID);
    invitedMembers = _.without(invitedMembers,Meteor.impersonatedOrUserId());
    return groupToString(invitedMembers);
  },
  someoneElseInvited: function() {
    return (Meteor.invitedMembers(this.itemID).count() > 1);
  }
})*/

/* open invite events */
/*emplate.openInvite.events({
  'click #accept-invite': function(event,tmpl) {
    event.stopPropagation();
    Meteor.call('acceptInvite',tmpl.data._id,alertOnError);
  },
  'click #decline-invite': function(event,tmpl) {
    event.stopPropagation();
    Meteor.call('declineInvite',tmpl.data._id,alertOnError);
  }
})*/
