Meteor.sectionMemberIds = function(sectionOrID) {
  var sectionID = ((sectionOrID) && ('object' === typeof sectionOrID)) ? sectionOrID._id : sectionOrID;
  if (Meteor.isClient)
    sectionID = sectionID || Meteor.currentSectionId();
  var today = new Date();
  var memberships = Memberships.find({
      collectionName:'Sections',
      itemID:sectionID,
      startDate: {$lt: today},
      endDate: {$gt: today}
    },
    {fields:{memberID:1}}).fetch();
  return _.pluck(memberships,'memberID');
}
Meteor.isSectionMember = function(userOrID,sectionOrID) {
  var userID = ((userOrID) && ('object' === typeof userOrID)) ? userOrID._id : userOrID;
  if (Meteor.isClient)
    userID = userOrID || Meteor.impersonatedOrUserId();
  var memberIDs = Meteor.sectionMemberIds(sectionOrID);
  return _.contains(userID,memberIDs);
}