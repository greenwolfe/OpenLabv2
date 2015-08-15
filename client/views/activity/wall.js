Template.wall.onCreated(function() {
  var instance = this;
  instance.autorun(function() {
    console.log('Template.wall.onCreated');
    console.log(instance.data._id);
    var columnSubscription = instance.subscribe('columns', instance.data._id);
  });
})

Template.wall.onDestroyed(function() {
  Meteor.call('deleteWallIfEmpty',this.data._id);
})

Template.wall.helpers({
  title: function() {
    if (this.type == 'teacher') return 'Teacher Wall';
    if (this.type == 'student') {
      var student = Meteor.impersonatedOrUser();
      if (student)
        return 'Student Wall for ' + Meteor.getname(student,'full');
    }
    if (this.type == 'group') return 'Group Wall for ' +  Meteor.groupies(this.createdFor);
    if (this.type == 'section') {
      var section = Sections.findOne(this.createdFor);
      if (section)
        return section.name + ' Wall';
    }
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
    if (!cU) return false;
    if (Roles.userIsInRole(cU,'teacher')) return true;
    if (Roles.userIsInRole(cU,'parentOrAdvisor')) return false;
    if (Roles.userIsInRole(cU,'student')) { //should be true by default, but being sure
      return Meteor.studentCanEditWall(cU._id,this);
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