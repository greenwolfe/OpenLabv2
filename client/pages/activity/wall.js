//put button bar in wall header with option to hide 
Template.wall.helpers({
  title: function() {
    if (this.type == 'teacher') return 'Teacher Wall';
    if (this.type == 'student') return 'Student Wall';
    if (this.type == 'group') return 'Group Wall: list of names';
    if (this.type == 'section') return 'B block Wall';
    return '';
  },
  helpMessages: function () {
    return [
      'Use the add block menu to add a block to a column in this wall.',
      'Edit any <span class="blue-outlined">blue-outlined text.</span>  Just click inside the blue outline and start typing.',
      'Select text to reveal the formatting toolbar.',
      'Click anywhere outside the blue outline to save changes. ',
      'Drag and drop to rearrange blocks.  You can drag a block to another column or even another wall.',
      'Use the modify menu to expand, shrink, add and delete columns.'
    ]
  },
  columns: function() {
    return Columns.find({wallID:this._id},{sort: {order:1}});
  },
  editColumns: function() {
    return (inEditedWall(this._id)) ? 'Done' : 'Edit Wall';
  },
  visibleOrEditing: function() {
    return (this.visible || inEditedWall(this._id));
  }
})

Template.wall.events({
  'click .editColumns': function(event,tmpl) {
    var wall = tmpl.data._id;
    if (Session.get('editedWall') != wall) {
      Session.set('editedWall',wall)
    } else {
      Session.set('editedWall',null);
    }
  }
})