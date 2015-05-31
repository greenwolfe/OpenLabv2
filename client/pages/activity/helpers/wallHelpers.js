inEditedWall = function(wallID) {
  //returns truthy value 'inEditedWall' if object is in a wall currently being edited
  wallID = wallID || this.wallID;
  return (Session.get('editedWall') == wallID) ? 'inEditedWall' : '';
}

editingActivity = function() {
  //returns truthy value 'editing' if ANY wall on the page is being edited
  return (Session.get('editedWall')) ? 'editing' : ''; 
}

inWallofType = function(type) {
  if (!Match.test(type,Match.OneOf('teacher','student','group','section')))
    return null;
  return function() {
    var wall = Walls.findOne(this.wallID);
    if (!wall) return false;
    return (wall.type == type);
  }

}

Template.registerHelper('inEditedWall',inEditedWall);

Template.registerHelper('editingActivity',editingActivity);

Template.registerHelper('inTeacherWall',inWallofType('teacher'));
Template.registerHelper('inStudentWall',inWallofType('student'));
Template.registerHelper('inGroupWall',inWallofType('group'));
Template.registerHelper('inSectionWall',inWallofType('section'));
