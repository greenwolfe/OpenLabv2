   /******************************/
  /***** MEMBERSHIP HELPERS *****/
 /********* (general) **********/
/******************************/
/*
Meteor.currentMembershipFor = function(memberID,collectionName) {
  var today = new Date();
  var membership = Memberships.find(
    {memberID:memberID,collectionName:collectionName},
    {sort:{endDate:-1}},
    {limit:1}
  ).fetch().pop();
  if (!membership)
    return undefined; //no current membership
  if ((today < membership.startDate) || (membership.endDate < today)) 
    return undefined; //no current membership, probably indicates a problem
  var collection = Mongo.Collection.get(membership.collectionName);  
  return collection.findOne(membership.itemID);
}

Meteor.openInvitationsFor = function(memberID,collectionName) {
  var today = new Date(); 
  return Memberships.find(
    {
      memberID:memberID,
      collectionName:collectionName,
      invitedUntil: {$gt: today}
    },
    {sort:{invitedUntil:-1}}
  )
}

//if no memberID is passed, gets memberships for impersonatedUser (or by default currently logged in user)
//see group_helpers.js and section_helpers.js for specific use 
var currentMembershipFactory = function(collectionName) {
  return function(memberID) {
    var today = new Date();
    var memberID = memberID || Meteor.impersonatedOrUserId();
    var membership = Memberships.find(
      {memberID:memberID,collectionName:collectionName},
      {sort:[["endDate","desc"]]},
      {limit:1}
    ).fetch().pop();
    if (!membership)
      return undefined; //no current membership
    if ((today < membership.startDate) || (membership.endDate < today)) 
      return undefined; //latest membership not current, probably indicates a problem
    var collection = Mongo.Collection.get(membership.collectionName);  
    return collection.findOne(membership.itemID);
  }
}

var currentMembersFactory = function(collectionName,idsOnly) {
  return function(itemOrID) {
    var itemID;
    if (itemOrID) {
      itemID = itemOrID._id || itemOrID;
    } else {
      var item = currentMembershipFactory(collectionName)(); //defaults to current group, section, etc if any
      if (item) {
        itemID = item._id;
      } else {
        if (idsOnly) return [];
        var nullCollection = new Meteor.Collection(null);
        return nullCollection.find(); //empty cursor, but ensures function consistently returns a cursor
      }
    }
    var today = new Date();
    var memberships = Memberships.find({
        collectionName:collectionName,
        itemID:itemID,
        startDate: {$lt: today},
        endDate: {$gt: today}
      },
      {fields:{memberID:1}}).fetch();

    var memberIDs = _.pluck(memberships,'memberID');
    if (idsOnly) return memberIDs;
    return Meteor.users.find({_id: {$in: memberIDs}});
  }
}
*/
  /*****************************/
 /***** EXTRA ROLE HELPER *****/
/*****************************/
/*
Template.registerHelper('userIsInRole',function(user,role) {
  return Roles.userIsInRole(user,role);
});
*/

  /***************************/
 /***** SECTION HELPERS *****/
/***************************/

//Meteor.currentSection = currentMembershipFactory('Sections');
//Template.registerHelper('currentSection',Meteor.currentSection);

//Meteor.sectionMembers = currentMembersFactory('Sections',false);  
//Meteor.sectionMemberIds = currentMembersFactory('Sections',true);
//Template.registerHelper('sectionMembers',Meteor.sectionMembers);


  /*************************/
 /***** GROUP HELPERS *****/
/*************************/

/*
Meteor.openInvites = function() {
  var userID = Meteor.impersonatedOrUserId();
  return Meteor.openInvitationsFor(userID,'Groups');
}
Template.registerHelper('openInvites',Meteor.openInvites)
*/

/*
Meteor.invitedMembers = function(itemOrID,idsOnly) {
  var itemID;
  if (itemOrID) {
    itemID = itemOrID._id || itemOrID;
  } else {
    if (idsOnly) return [];
    var nullCollection = new Meteor.Collection(null);
    return nullCollection.find(); //empty cursor, but ensures function consistently returns a cursor
  }
  var today = new Date();
  var memberships = Memberships.find({
      collectionName:'Groups',
      itemID:itemID,
      invitedUntil: {$gt: today},
    },
    {fields:{memberID:1}}).fetch();
  var memberIDs = _.pluck(memberships,'memberID');
  if (idsOnly) return memberIDs;
  return Meteor.users.find({_id: {$in: memberIDs}});
}
Template.registerHelper('invitedMembers',function(itemOrId) {
  return Meteor.invitedMembers(itemOrId,false);
})
*/

//Meteor.currentGroup = currentMembershipFactory('Groups');
//Template.registerHelper('currentGroup',Meteor.currentGroup);

//Meteor.groupMembers = currentMembersFactory('Groups',false);
//Meteor.groupMemberIds = currentMembersFactory('Groups',true); 
//Template.registerHelper('groupMembers',Meteor.groupMembers);

/*
Meteor.groupies = function(itemID) { //returns a string with the names of all group members
  var groupies = '';
  var groupMembers = Meteor.groupMembers(itemID);
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

Template.registerHelper('groupies',Meteor.groupies);
*/

