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
      startDate: {$lt: today},
      endDate: {$gt: today}
    },
    {fields:{memberID:1}}).fetch();
  return _.pluck(memberships,'memberID');
}
Meteor.isGroupMember = function(userOrID,groupOrID) {
  var userID = ((userOrID) && ('object' === typeof userOrID)) ? userOrID._id : userOrID;
  if (Meteor.isClient)
    userID = userOrID || Meteor.impersonatedOrUserId();
  var memberIDs = Meteor.groupMemberIds(groupOrID);
  return _.contains(userID,memberIDs);
}