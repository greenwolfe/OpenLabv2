  /*************************/
 /*** ACTIVITIES LIST  ****/
/*************************/

//Template.activitiesList.rendered = function() {
//  $('#activities').accordion({heightStyle: "content"});
//}

Template.activitiesList.helpers({
  units: function() {
    var selector = {};
    if (!editingMainPage())
      selector.visible = true; //show only visible units
    return Units.find(selector,{sort: {order: 1}});
  },
  activeUnit: function() {
    return Units.findOne(Session.get('activeUnit'));
  },
  activeUnit2: function() {
    return Units.findOne(Session.get('activeUnit2'));
  },
  sortableOpts: function() {
    return {
      draggable:'.unittitle',
      handle: '.sortUnit',
      collection: 'Units',
      selectField: 'app', //selects all units
      selectValue: 'openlab', //as openlab is only allowed value of app field
      disabled: !editingMainPage() 
    }
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
  active2: function() {
    return (this._id == Session.get('activeUnit2')) ? 'active2':'';
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
  'click li > a': function(event,tmpl) {
    event.preventDefault();
    if (event.ctrlKey) {
      var activeUnit2 = Session.get('activeUnit2');
      var activeUnit = Session.get('activeUnit');
      if (tmpl.data._id == activeUnit2) {
        Session.set('activeUnit2',null);
      } else if (tmpl.data._id == activeUnit){
        return;
      } else if ((activeUnit2) && (tmpl.data._id == activeUnit)) {
        Session.set('activeUnit',activeUnit2);
        Session.set('activeUnit2',null);
        var cU = Meteor.user();
        if (cU && ('profile' in cU)) {
          Meteor.users.update({_id:cU._id}, { $set:{"profile.lastOpened.studentActivityList":activeUnit2} });
        }
      } else {
        Session.set('activeUnit2',tmpl.data._id);
      }
    } else {
      Session.set('activeUnit',tmpl.data._id);
      if (tmpl.data._id == Session.get('activeUnit2'))
        Session.set('activeUnit2',null);
      var cU = Meteor.user();
      if (cU && ('profile' in cU)) {
        Meteor.users.update({_id:cU._id}, { $set:{"profile.lastOpened.studentActivityList":tmpl.data._id} });
      }
    }
  },
  'dragstart li > a': function(event,tmpl) {
    //bootstrap navs are draggable by default
    //disabling this behavior so you have to grab
    //the draggable handle to sort the units
    event.preventDefault();
  }
})

  /*************************/
 /** ACTIVITY LIST  *******/
/*************************/

Template.activityList.helpers({
  activities0: function() {
    var activeUnit2 = Session.get('activeUnit2');
    var columns = [];
    var selector = {
      unitID: this._id,
      ownerID: {$in: [null,'']} //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    columns[1] = Activities.find(selector,{sort: {order: 1}}).fetch(); 
    if (activeUnit2)
      return columns[1];
    var half = Math.ceil(columns[1].length/2)
    columns[0] = columns[1].splice(0,half); 
    return columns[0];
  },
  activities1: function() {
    var activeUnit2 = Session.get('activeUnit2');
    var columns = [];
    var selector = {
      unitID: this._id,
      ownerID: {$in: [null,'']} //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    columns[1] = Activities.find(selector,{sort: {order: 1}}).fetch(); 
    if (activeUnit2)
      return null;
    var half = Math.ceil(columns[1].length/2)
    columns[0] = columns[1].splice(0,half); 
    return columns[1];
  },
  bgsuccess: function() {
    return Session.get('activeUnit2') ? 'bgsuccess' : '';
  },
  bgprimary: function() {
    return Session.get('activeUnit2') ? 'bgprimary' : '';
  },
  activities2: function() {
    var activeUnit2 = Session.get('activeUnit2');
    if (!activeUnit2) return null;
    var selector = {
      unitID: activeUnit2,
      ownerID: {$in: [null,'']} //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    return Activities.find(selector,{sort: {order: 1}})
  },
  activeUnit2: function() {
    var id = Session.get('activeUnit2');
    if (!id) return null;
    return Units.findOne(id);
  },
  sortableOpts2: function() {
    var activeUnit2 = Session.get('activeUnit2');
    return {
      draggable:'.aItem',
      handle: '.sortActivity',
      group: 'activityColumn',
      collection: 'Activities',
      selectField: 'unitID',
      selectValue: activeUnit2,
      disabled: !editingMainPage() //currently not working
      //disabled: (!Session.get('editedWall')), //!= this.wallID to apply to a single wall 
      //onAdd: function(evt) {
      //  Meteor.call('denormalizeBlock',evt.data._id,alertOnError);
      //}
    }    
  },
  sortableOpts: function() {
    return {
      draggable:'.aItem',
      handle: '.sortActivity',
      group: 'activityColumn',
      collection: 'Activities',
      selectField: 'unitID',
      selectValue: this._id,
      disabled: !editingMainPage() //currently not working
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

  /*************************/
 /*** NEW ACTIVITY  *******/
/*************************/

Template.newActivity.helpers({
  fixedFields: function() {
    return {unitID:this._id}
  }
})