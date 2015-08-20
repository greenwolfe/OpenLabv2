  /*************************/
 /***** GROUP HELPERS *****/
/*************************/

//if groupOrID is not passed, returns members of current group for currently impersonated user or current user
Meteor.groupMemberIds = function(groupOrID) {
  var groupID = ((groupOrID) && ('object' === typeof groupOrID)) ? groupOrID._id : groupOrID;
  if (Meteor.isClient)
    groupID = groupID || Meteor.currentGroupId();
  var today = new Date();
  var memberships = Memberships.find({
      collectionName:'Groups',
      itemID:groupID,
//      startDate: {$lt: today}, //want to list this for all members, even if they have left
//      endDate: {$gt: today}  //to do otherwise creates problems for the users past groups
    },
    {fields:{memberID:1}}).fetch();
  return _.pluck(memberships,'memberID');
}
Meteor.isGroupMember = function(userOrID,groupOrID) {
  var userID = ((userOrID) && ('object' === typeof userOrID)) ? userOrID._id : userOrID;
  if (Meteor.isClient)
    userID = userID || Meteor.impersonatedOrUserId();
  var memberIDs = Meteor.groupMemberIds(groupOrID);
  return _.contains(memberIDs,userID);
}

//on client, if memberID is not passed, returns id of current group for currently impersonated user or current user
Meteor.currentGroupId = function(memberID) {
  var today = new Date();
  if (Meteor.isClient)
    memberID = memberID || Meteor.impersonatedOrUserId();
  var membership = Memberships.find({
      memberID:memberID,
      collectionName:'Groups',
      startDate: {$lt: today}, //startDate < today < endDate
      endDate: {$gt: today}
    },
    {sort:[["endDate","desc"]]}, 
    {limit:1}
  ).fetch().pop();
  if (!membership)
    return ''; 
  return membership.itemID;
}