  /**********************/
 /******* GROUPS *******/
/**********************/

/* groups helpers */
Template.groups.helpers({
  sections: function() {
    return Sections.find({},{sort:{name:1}});
  },
  selectedSection: function() {
    return loginButtonsSession.get('sectionID');
  },
  invitees: function() {
    var invitees = loginButtonsSession.get('invitees');
    if (!invitees || !_.isArray(invitees))
      return '_____';
    if (invitees.length == 0)
      return '_____';
    return groupToString(invitees);
  },
  inviteesMinusCurrent: function() {
    var invitees = loginButtonsSession.get('invitees');
    if (!invitees || !_.isArray(invitees))
      return '_____';
    if (invitees.length == 0)
      return '_____';
    var currentGroup = Meteor.groupMemberIds();
    if ((currentGroup) && _.isArray(currentGroup))
      invitees = _.difference(invitees,currentGroup);
    if (invitees.length == 0)
      return '_____';    
    return groupToString(invitees);        
  },
  openInvitesCount: function() {
    return Meteor.openInvites().count();
  }
})

/* groups events */
Template.groups.events({
  'click #join-group': function(event,tmpl) {
    var user = Meteor.user();
    if (!Roles.userIsInRole(user,['student','teacher']))
      return;
    var student = Meteor.impersonatedOrUser();
    if (!Roles.userIsInRole(student,'student'))
      return;
    var invitees = loginButtonsSession.get('invitees');
    if (!invitees || !_.isArray(invitees))
      return;
    if (invitees.length == 0)
      return;
    var memberIDs = Meteor.groupMemberIds();
    if ((memberIDs) && _.isArray(memberIDs))
      invitees = _.difference(invitees,memberIDs);
    if (invitees.length == 0)
      return; 
    var currentGroup = Meteor.currentGroup();
    invitees.forEach(function(studentID){
      Meteor.call('inviteMember',{
        memberID:studentID,
        itemID: currentGroup._id,
        collectionName: 'Groups'
      },
      alertOnError);
    });
  },
  'click #form-new-group': function(event,tmpl) {
    var user = Meteor.user();
    if (!Roles.userIsInRole(user,['student','teacher']))
      return;
    var student = Meteor.impersonatedOrUser();
    if (!Roles.userIsInRole(student,'student'))
      return;
    var invitees = loginButtonsSession.get('invitees');
    if (!invitees || !_.isArray(invitees))
      return;
    if (invitees.length == 0)
      return;
    //make new group
    Meteor.call('addGroup',function(error,groupID) {
      if (error) {
        alert(Error.Reason);
      } else {
        //add current user to new group (automatically expired fromm old one)
        Meteor.call('addMember',{
          memberID:student._id,
          itemID: groupID,
          collectionName: 'Groups'
        },alertOnError)
        //invite others
        // (passed through from context above?) var invitees = loginButtonsSession.get('invitees');
        invitees.forEach(function(userID){
          Meteor.call('inviteMember',{
            memberID:userID,
            itemID: groupID,
            collectionName: 'Groups'
          },alertOnError);
        });
      }
    })
  }
})

/* groups helper functions */
var groupToString = function(invitees) {
  var groupies = '';
  var groupMembers = Meteor.users.find({_id:{$in:invitees}});
  var groupSize = groupMembers.count();
  groupMembers.forEach(function(user,i,gMs) {
    var fullname =  user.profile.firstName + " " + user.profile.lastName;
    groupies += "<span title='" + fullname  + "'>" + user.profile.firstName + "</span>";
    if (i == groupSize - 2) {
      groupies += ' and ';
    } else if (i < groupSize - 2) {
      groupies += ', ';
    };
  })
  return groupies;
}

  /****************************/
 /******* USER TO VIEW *******/
/****************************/

/* user to view helpers */
Template.userChooseGroupMembers.helpers({
  active: function() {
    return (_.contains(loginButtonsSession.get('invitees'),this._id)) ? 'active' : '';
  },
  disabled: function() {
    if (Meteor.currentGroup()) {
      return (Meteor.impersonatedOrUserId() == this._id) ? 'disabled' : ''; 
    } else {
      return (_.contains(Meteor.groupMemberIds(),this._id) || (Meteor.impersonatedOrUserId() == this._id)) ? 'disabled' : '';
    }
  }
})

/* user to view events */
Template.userChooseGroupMembers.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    if (tmpl.$('li').hasClass('disabled'))
      return;
    loginButtonsSession.toggleArray('invitees',tmpl.data._id);
  }
})

  /*******************************/
 /******* SECTION TO VIEW *******/
/*******************************/

/* section to view helpers */
Template.sectionChooseGroupMembers.helpers({
  active: function() {
    var sectionID = loginButtonsSession.get('sectionID')
    if (!sectionID) return '';
    return (this._id == sectionID) ? 'active' : '';
  }
})

/* section to view events */
Template.sectionChooseGroupMembers.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    loginButtonsSession.set('sectionID',tmpl.data._id);
  }
})

  /***************************/
 /******* OPEN INVITE *******/
/***************************/

/* open invite helpers */
Template.openInvite.helpers({
  invitingMembers: function() {
    var invitingMembers = Meteor.groupMemberIds(this.itemID);
    return groupToString(invitingMembers);
  },
  haveHas: function() {
    return (Meteor.groupMembers(this.itemID).count() == 1) ? 'has': 'have';
  },
  alsoInvited: function() {
    var invitedMembers = Meteor.invitedMemberIds(this.itemID);
    invitedMembers = _.without(invitedMembers,Meteor.impersonatedOrUserId());
    return groupToString(invitedMembers);
  },
  someoneElseInvited: function() {
    return (Meteor.invitedMembers(this.itemID).count() > 1);
  }
})

/* open invite events */
Template.openInvite.events({
  'click #accept-invite': function(event,tmpl) {
    event.stopPropagation();
    Meteor.call('acceptInvite',tmpl.data._id,alertOnError);
  },
  'click #decline-invite': function(event,tmpl) {
    event.stopPropagation();
    Meteor.call('declineInvite',tmpl.data._id,alertOnError);
  }
})

