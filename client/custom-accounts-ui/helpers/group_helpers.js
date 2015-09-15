  /*****************************/
 /***** EXTRA ROLE HELPER *****/
/*****************************/

Template.registerHelper('userIsInRole',function(user,role) {
  return Roles.userIsInRole(user,role);
});

  /*************************/
 /***** GROUP HELPERS *****/
/*************************/

Meteor.currentGroup = function(memberID) {
  var groupID = Meteor.currentGroupId(memberID);
  return Groups.findOne(groupID);
}
Template.registerHelper('currentGroup',Meteor.currentGroup);

//if memberID is not passed, returns open invitations for currently impersonated user or current user
Meteor.openInvites = function(memberID) {
  var today = new Date();
  var memberID = memberID || Meteor.impersonatedOrUserId();
  return Memberships.find({
      memberID:memberID,
      collectionName:'Groups',
      invitedUntil: {$gt: today}
    },
    {sort:[["invitedUntil","desc"]]}
  )
}
Template.registerHelper('openInvites',Meteor.openInvites)

Meteor.groupMembers = function(groupOrID) {
  var memberIDs = Meteor.groupMemberIds(groupOrID);
  return Meteor.users.find({_id: {$in: memberIDs}});
}
Template.registerHelper('groupMembers',Meteor.groupMembers);

//if groupOrID is not passed, returns invitees of current group for currently impersonated user or current user
Meteor.invitedMemberIds = function(groupOrID) {
  var groupID = ((groupOrID) && ('object' === typeof groupOrID)) ? groupOrID._id : groupOrID;
  groupID = groupID || Meteor.currentGroupId();
  var today = new Date();
  var memberships = Memberships.find({
      collectionName:'Groups',
      itemID:groupID,
      invitedUntil: {$gt: today}
    },
    {fields:{memberID:1}}).fetch();
  return _.pluck(memberships,'memberID');
}
Meteor.invitedMembers = function(groupOrID) {
  var memberIDs = Meteor.invitedMemberIds(groupOrID);
  return Meteor.users.find({_id: {$in: memberIDs}});
}
Template.registerHelper('invitedMembers',Meteor.invitedMembers);


//returns a string with the names of all group members
//if groupID is not passed, defaults to groupies of current group for currently impersonated user or current user
Meteor.groupies = function(groupID) { 
  var groupies = '';
  var groupMembers = Meteor.groupMembers(groupID);
  var groupSize = groupMembers.count();
  groupMembers.forEach(function(user,i,gMs) {
    var fullname =  user.profile.firstName + " " + user.profile.lastName;
    var expired = "";
    var dateLeftGroup = Meteor.dateLeftGroup(user._id,groupID)
    if (dateLeftGroup) {
      fullname += " left on " + moment(dateLeftGroup).format("MMM D YYYY");
      expired = " class='text-warning'";
    }
    groupies += "<span title='" + fullname  + "'" + expired + ">" + user.profile.firstName + "</span>";
    if (i == groupSize - 2) {
      groupies += ' and ';
    } else if (i < groupSize - 2) {
      groupies += ', ';
    };
  })
  return groupies;
}
Template.registerHelper('groupies',Meteor.groupies);

Meteor.groupFirstNames = function(groupID) { 
  var groupies = '';
  var groupMembers = Meteor.groupMembers(groupID);
  var groupSize = groupMembers.count();
  groupMembers.forEach(function(user,i,gMs) {
    groupies +=  user.profile.firstName;
    if (i == groupSize - 2) {
      groupies += 'and';
    };
  })
  return groupies;
}

   /******************************************/
  /*********** OTHER GROUP HELPERS **********/
 /**** DEFINED IN LOGIN BUTTONS SESSION ****/
/******************************************/

//none at the present time

   /*********************************************/
  /*********** OTHER GROUP HELPERS *************/
 /**** DEFINED IN /METHODS/groupMETHODS.JS ****/
/*********************************************/

//Meteor.groupMemberIds
//Meteor.isGroupMember
//Meteor.currentGroupId

