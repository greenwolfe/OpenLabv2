inEditedWall = function(wallID) {
  //returns truthy value 'inEditedWall' if object is in a wall currently being edited
  wallID = wallID || this.wallID;
  return (Session.get('editedWall') == wallID) ? 'inEditedWall' : '';
}

editingActivity = function() {
  //returns truthy value 'editing' if ANY wall on the page is being edited
  return (Session.get('editedWall')) ? 'editing' : ''; 
}

Template.registerHelper('inEditedWall',inEditedWall);

Template.registerHelper('editingActivity',editingActivity);