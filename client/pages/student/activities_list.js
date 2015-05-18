  /*************************/
 /*** ACTIVITIES LIST  ****/
/*************************/

//Template.activitiesList.rendered = function() {
//  $('#activities').accordion({heightStyle: "content"});
//}

Template.activitiesList.helpers({
  units: function() {
    return Units.find({visible:true},{sort: {order: 1}});
  },
  activeUnit: function() {
    return Units.findOne(Session.get('activeUnit'));
  }
});

  /*********************/
 /** UNIT TITLE      **/
/*********************/

Template.unitTitle.helpers({
  active: function() {
    var activeUnit = Session.get('activeUnit');
    if (!activeUnit) {
      var units = Units.find({visible:true},{sort: {order: 1}}).fetch();
      var cU = Meteor.user();
      activeUnit = units[0]._id;
      if (cU && ('profile' in cU) && ('lastOpened' in cU.profile) && 
        ('studentActivityList' in cU.profile.lastOpened) && 
        Units.findOne(cU.profile.lastOpened.studentActivityList)) 
          activeUnit = cU.profile.lastOpened.studentActivityList;
      Session.set('activeUnit', activeUnit);
    }
    return (this._id == activeUnit) ? 'active' : '';
  },
  hidden: function() {
    var activeUnit = Session.get('activeUnit');
    return (this._id == activeUnit) ? '' : 'hidden';
  },
  editable: function() {
    var activeUnit = Session.get('activeUnit');
    return (this._id == activeUnit) ? 'true' : '';
  }  
});

Template.unitTitle.events({
  'click li a': function(event,tmpl) {
    event.preventDefault();
    Session.set('activeUnit',tmpl.data._id);
    var cU = Meteor.user();
    if (cU && ('profile' in cU)) {
      Meteor.users.update({_id:cU._id}, { $set:{"profile.lastOpened.studentActivityList":tmpl.data._id} });
    }
  },
  "blur div[contenteditable='true'][class~='editUnitTitle']": function(event,tmpl) {
    var $element = $(event.target);
    var title = _.trim(_.stripTags($element.text()));
    Meteor.call('updateUnit',{
      _id:tmpl.data._id,
      title: title
    },function(error,unitID) {
      if (error) {
        alert(error.reason)
      } else { //reset displayed text
        $element.text(title); 
      }
    });                          
  }
})

Template.unitTitle.onRendered(function() {
  console.log(this);
  $editTitleElement = $(this.find('.editUnitTitle'));
  $editTitleElement.text(this.data.title);
});

  /*************************/
 /** ACTIVITY LIST  **/
/*************************/

/*** HELPERS ****/

Template.activityList.helpers({
  activities0: function() {
    var columns = [];
    columns[1] = Activities.find({unitID: this._id, 
      ownerID: {$in: [null,'']}, //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
      visible: true},
      {sort: {order: 1}}).fetch(); 
    var half = Math.ceil(columns[1].length/2)
    columns[0] = columns[1].splice(0,half); 
    return columns[0];
  },
  activities1: function() {
    var columns = [];
    columns[1] = Activities.find({unitID: this._id, 
      ownerID: {$in: [null,'']}, //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
      visible: true},
      {sort: {order: 1}}).fetch(); 
    var half = Math.ceil(columns[1].length/2)
    columns[0] = columns[1].splice(0,half); 
    return columns[1];
  },
  sortableOpts: function() {
    return {
      draggable:'.aItem',
      //handle: '.blockSortableHandle',
      group: 'activityColumn',
      collection: 'Activities',
      selectField: 'unitID',
      selectValue: this._id //,
      //disabled: (!Session.get('editedWall')), //!= this.wallID to apply to a single wall 
      //onAdd: function(evt) {
      //  Meteor.call('denormalizeBlock',evt.data._id,alertOnError);
      //}
    }
  },
  reassessments: function() {
    var userToShow = Meteor.userId();
    if (Roles.userIsInRole(userToShow,'teacher')) {
      userToShow = Session.get('TeacherViewAs');
    };
    return Activities.find({unitID: this._id, 
      ownerID: {$in: [userToShow]},
      type: 'assessment',
      visible: true},
      {sort: {rank: 1}});
  }
});