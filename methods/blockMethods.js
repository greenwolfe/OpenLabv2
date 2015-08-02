Meteor.studentCanEditBlock = function(studentID,block) {
  if (Roles.userIsInRole(block.createdBy,'teacher'))
    return false;
  if (studentID == block.createdBy)
    return true;
  if (Meteor.isGroupMember(studentID,block.createdFor))
    return true;
  if (Meteor.isSectionMember(studentID,block.createdFor))
    return true;
  return false;
}

Meteor.studentCanEditWall = function(studentID,wall) {
  if (wall.type == 'teacher')
    return false;
  if (studentID == wall.createdFor)
    return true;
  if (Meteor.isGroupMember(studentID,wall.createdFor))
    return true;
  if (Meteor.isSectionMember(studentID,wall.createdFor))
    return true;
  return false;
}

//returns ids for current section and group
//as well as old sections and groups with wall contents
//created during the student's membership in that section or group
//this failed - caused infinite loop with creation of default walls
//and is not currently being used
Meteor.currentAndOldGroupAndSectionIDs = function(studentID,activityID) {
  var memberships = Memberships.find({
    memberID:studentID,
    collectionName: {$in: ['Groups','Sections']}
  });
  if (!memberships)
    return [];
  var today = new Date();
  memberships.forEach(function(membership) {
    var blockCount = Blocks.find({
      activityID: activityID,
      createdFor: membership.itemID,
      createdOn: {$gt:membership.startDate,$lt:membership.endDate}
    },{fields:{createdFor:1}}).count();
    var isCurrent = ((membership.startDate < today) && (today < membership.endDate));
    if (blockCount || isCurrent)
      createdFors.push(membership.itemID);
  })
  return createdFors;
}