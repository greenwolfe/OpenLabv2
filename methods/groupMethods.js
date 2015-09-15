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
      startDate: {$lt: today},   //don't include invited members
      //endDate: {$gt: today}   //want to list this for all members, even if they have left
                               //to do otherwise creates problems for the users past groups

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
Meteor.dateLeftGroup = function(userOrID,groupOrID) {
  var userID = ((userOrID) && ('object' === typeof userOrID)) ? userOrID._id : userOrID;
  if (Meteor.isClient)
    userID = userID || Meteor.impersonatedOrUserId();
  var groupID = ((groupOrID) && ('object' === typeof groupOrID)) ? groupOrID._id : groupOrID;
  if (Meteor.isClient)
    groupID = groupID || Meteor.currentGroupId();
  var today = new Date();
  var expiredMembership = Memberships.findOne({
      collectionName:'Groups',
      memberID: userID,
      itemID:groupID,
      startDate: {$lt: today}, //don't include invited members, who haven't entered the group yet
      endDate: {$lt: today}  //implies they have already left
    },{sort:[["endDate","desc"]]}); 
  var currentMemberships = Memberships.find({
      collectionName:'Groups',
      memberID: userID,
      itemID:groupID,
      startDate: {$lt: today}, //don't include invited members, who haven't entered the group yet
      endDate: {$gt: today}  //so is current member
    }).count(); 
  if (expiredMembership && !currentMemberships) return expiredMembership.endDate;
  return false;
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