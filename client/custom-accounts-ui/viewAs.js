
  /***********************/
 /******* VIEW AS *******/
/***********************/

/* view as helpers */
Template.viewAs.helpers({
  selectedText: function() {
    var impersonatedUser = Meteor.impersonatedUser();
    var user = Meteor.user();
    var section = Meteor.selectedSection();
    if (!impersonatedUser) {
      if (section)
        return section.name
      if (Roles.userIsInRole(user,['teacher','parentOrAdvisor'])) 
        return 'self';
      return '';
    }
    var selectedText = "<span title='" + Meteor.getname(impersonatedUser,'full') + "'>" + Meteor.getname(impersonatedUser,'first') + "</span>";
    if (Roles.userIsInRole(user,'parentOrAdvisor')) 
      return selectedText;
    if (!section) 
      return selectedText;
    return selectedText + ' from ' + section.name;
  },
  sections: function() {
    return Sections.find({},{sort:{name:1}});
  },
  viewParents: function() {
    return (loginButtonsSession.get('viewParents') || Roles.userIsInRole(Meteor.impersonatedId(),'parentOrAdvisor'));
  },
  parents: function() {
    return Roles.getUsersInRole('parentOrAdvisor');
  }
})

  /****************************/
 /******* USER TO VIEW *******/
/****************************/

/* user to view helpers */
Template.userToView.helpers({
  active: function() {
    if ((this._id == Meteor.userId()) && !Meteor.selectedSection() && !Roles.userIsInRole(Meteor.impersonatedId(),'parentOrAdvisor'))
      return  'active';
    return (this._id == Meteor.impersonatedId()) ? 'active' : '';
  }
})

/* user to view events */
Template.userToView.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    loginButtonsSession.set('viewAs',tmpl.data._id);
    loginButtonsSession.set('sectionID',null); //resetting group menu
    loginButtonsSession.set('invitees',null);
    loginButtonsSession.set('viewParents',false);
  }
})

  /*******************************/
 /******* SECTION TO VIEW *******/
/*******************************/

/* section to view helpers */
Template.sectionToView.helpers({
  active: function() {
    var section = Meteor.selectedSection();
    if (!section) return '';
    return (this._id == section._id) ? 'active' : '';
  }
})

/* section to view events */
Template.sectionToView.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    loginButtonsSession.set('viewAs',tmpl.data._id);
    loginButtonsSession.set('viewParents',false);
  }
})

  /*******************************/
 /******* PARENTS TO VIEW *******/
/*******************************/

/* parents to view helpers */
Template.parentsToView.helpers({
  active: function() {
    return (loginButtonsSession.get('viewParents') || Roles.userIsInRole(Meteor.impersonatedId(),'parentOrAdvisor')) ? 'active' : '';
  }
})

/* parents to view events */
Template.parentsToView.events({
  'click li a': function(event,tmpl) {
    event.stopPropagation();
    loginButtonsSession.set('viewAs',null);
    loginButtonsSession.set('viewParents',true);
  }
})