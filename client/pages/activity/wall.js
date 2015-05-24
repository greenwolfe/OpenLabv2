//put button bar in wall header with option to hide 
Template.wall.helpers({
  title: function() {
    if (this.type == 'teacher') return 'Teacher Wall';
    if (this.type == 'student') return 'Student Wall';
    if (this.type == 'group') return 'Group Wall: list of names';
    if (this.type == 'section') return 'B block Wall';
    return '';
  },
  columns: function() {
    return Columns.find({wallID:this._id},{sort: {order:1}});
  },
  editColumns: function() {
    return (inEditedWall(this._id)) ? 'Done' : 'Edit Wall';
  },
  visibleOrEditing: function() {
    return (this.visible || inEditedWall(this._id));
  },
  showWallHelp: function() {
    return (inEditedWall(this._id) && Session.get('showWallHelp'));
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
  },
  'click .editHelp': function(event,tmpl) {
    var help = Session.get('showWallHelp');
    Session.set('showWallHelp',!help);
  }
})