//Must be placed in a subfolder so that it is loaded before
//the templates that use its global variables
var VALID_KEYS = [
  'activeUnit',
  'activeUnit2',
  'activeCategory',
  'activeCategory2',
  'impersonatedID', 
  'editingMainPage',
  'errorMessage', //deprecated
  'infoMessage' //deprecated
];

var validateKey = function (key) {
  if (!_.contains(VALID_KEYS, key)){
    throw new Error("Invalid key in activityPageSession: " + key);
  }
};

if (!('openlab' in Meteor)) {
  Meteor.openlab = {};
}
var KEY_PREFIX = "Meteor.openlab.";

//Template helpers
VALID_KEYS.forEach(function(key) {
  if ((key == 'activeUnit') || (key == 'activeUnit2')) {
    Template.registerHelper(key,function() {
      return Units.findOne(Session.get(KEY_PREFIX + key));
    })
  } else if ((key == 'activeCategory') || (key == 'activeCategory2')) {
    Template.registerHelper(key,function() {
      return Categories.findOne(Session.get(KEY_PREFIX + key));
    })
  } else if (key == 'impersonatedID') {
    Template.registerHelper(key,function() { 
      return Session.get(KEY_PREFIX + key);
    });
    Template.registerHelper('impersonated',function() {
      return Meteor.users.findOne(Session.get(KEY_PREFIX + key));
    });    
  } else {
    Template.registerHelper(key,function() { 
      return Session.get(KEY_PREFIX + key);
    })
  }
});

//These return the impersonated user or the current user 
//if impersonation is not allowed or if it is not happening at the moment
//intended to be a drop-in for Meteor.userId() and Meteor.user()
//just use Meteor.openlab.userId() or Meteor.openlab.user()
//are these redundant with helpers from loginButtonsSession?
Meteor.openlab.userId = function() {
  //privide security
  return Session.get(KEY_PREFIX + 'impersonatedID') || Meteor.userId();
}
Template.registerHelper('openlab.currentUser',function() { 
  return Meteor.openlab.user();
});
Meteor.openlab.user = function() {
  //provide security
  return Meteor.users.findOne(Session.get(KEY_PREFIX + key)) || Meteor.user();
}

openlabSession = {
  set: function(key, value) {
    validateKey(key);
    if (_.contains(['errorMessage', 'infoMessage'], key)){
      throw new Error("Don't set errorMessage or infoMessage directly. Instead, use errorMessage() or infoMessage().");
    }
    var cU;
    if (key == 'impersonatedID') { //set security 
      //must be teacher
      //or parent or advisor impersonating one of their own chidren or advisees
      cU = Meteor.user(); 
      if (Roles.userIsInRole(cU,'teacher')) {
        this._set(key,value);
      } else if (Roles.userIsInRole(cU,'parentOrAdvisor') && _.contains(Meteor.childOrAdviseeIds(),value)) {
        this._set(key,value);
      }
      return; //else don't set this key
    }
    if (key == 'activeUnit' || key == 'activeUnit2') {
      //set users last active units
      cU = Meteor.user();
      if (cU) {
        var profile = (_.str.contains(key,'2')) ? {lastViewedUnit2 : value} : {lastViewedUnit : value};
        Meteor.call('updateUser',{
          _id:cU._id,
          profile: profile
        });
      }
    }
    if (key == 'activeCategory' || key == 'activeCategory2') {
      //set users last active categories
      cU = Meteor.user();
      if (cU) {
        var profile = (_.str.contains(key,'2')) ? {lastViewedCategory2 : value} : {lastViewedCategory : value};
        Meteor.call('updateUser',{
          _id:cU._id,
          profile: profile
        });
      }
    }
    if (key == 'editingMainPage') {
      cU = Meteor.user(); 
      if (Roles.userIsInRole(cU,'teacher')) 
        this._set(key,value);
      return;
    }

    this._set(key, value);
  },

  _set: function(key, value) {
    Session.set(KEY_PREFIX + key, value);
  },

  get: function(key) {
    validateKey(key);
    return Session.get(KEY_PREFIX + key);
  },

  impersonatedID: function() {
    //set security here too in case someone bypasses openlabSession
    //and directly sets impersonatedID
    return Session.get(KEY_PREFIX + 'impersonatedID') || Meteor.UserId();
  },

  impersonated: function() {
      return Meteor.users.findOne(Session.get(KEY_PREFIX + 'impersonatedID')) || Meteor.user();
  },

  initializePage: function () { //replaced by startup callback
    this.resetMessages();
  },

  infoMessage: function(message) {
    this._set("errorMessage", null);
    this._set("infoMessage", message);
    this.ensureMessageVisible();
  },

  errorMessage: function(message) {
    this._set("errorMessage", message);
    this._set("infoMessage", null);
    this.ensureMessageVisible();
  },

  /*  POSSIBLY ADD MESSAGE HANDLING LATER?
  // is there a visible dialog that shows messages (info and error)
  isMessageDialogVisible: function () {
    return this.get('resetPasswordToken') ||
      this.get('enrollAccountToken') ||
      this.get('justVerifiedEmail');
  },

  // ensure that somethings displaying a message (info or error) is
  // visible.  if a dialog with messages is open, do nothing;
  // otherwise open the dropdown.
  //
  // notably this doesn't matter when only displaying a single login
  // button since then we have an explicit message dialog
  // (_loginButtonsMessageDialog), and dropdownVisible is ignored in
  // this case.
  ensureMessageVisible: function () {
    if (!this.isMessageDialogVisible()){
      this.set("dropdownVisible", true);
    }
  },
  */

  resetMessages: function () {
    this._set("errorMessage", null);
    this._set("infoMessage", null);
  }
};