  /*************************/
 /***** BLOCK HELPERS *****/
/*************************/

Meteor.canEditBlock = function(userID,block) { //rights for specific fields will be checked below
  if (Roles.userIsInRole(userID,'parentOrAdvisor')) return false;
  if (Roles.userIsInRole(userID,'teacher')) return true;
  if (Roles.userIsInRole(userID,'student')) {
    var wall = Walls.findOne(block.wallId);
    if ((!wall) || (wall.type == 'teacher')) return false;
    if (block.createdBy == userID) return true;
    if ('Site' in block.createdFor) return true;
    if (('users' in block.createdFor) && 
        (block.createdFor.users == cU._id))
      return true;
    if (('Groups' in block.createdFor) &&
       (Meteor.isGroupMember(userID,block.createdFor.Groups)))
      return true;
    if (('Sections' in block.createdFor) &&
       (Meteor.isSectionMember(userID,block.createdFor.Sections)))
      return true;
  }
  return false
}