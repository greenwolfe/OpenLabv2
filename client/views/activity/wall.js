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
  canEditWall: function() {
    var cU = Meteor.user();
    if (!cU)
      return false;
    if (Roles.userIsInRole(cU,'teacher'))
      return true;
    if (Roles.userIsInRole(cU,'parent'))
      return false;
    if ('Site' in this.createdFor)
      return false;
    if (Roles.userIsInRole(cU,'student')) { //should be true by default, but being sure
      if (('Meteor.users' in this.createdFor) && (this.createdFor['Meteor.users'] == cU._id))
        return true;
      if (('Groups' in this.createdFor) && (Meteor.isGroupMember(cU,this.createdFor.Groups)))
        return true;
      if (('Sections' in this.createdFor) && (Meteor.isSectionMember(cU,this.createdFor.Sections)))
        return true;
    }
    return false;
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
    if (activityPageSession.get('editedWall') != wall) {
      activityPageSession.set('editedWall',wall)
    } else {
      activityPageSession.set('editedWall',null);
    }
  }
})