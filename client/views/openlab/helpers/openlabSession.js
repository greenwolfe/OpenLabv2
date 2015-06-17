//Must be placed in a subfolder so that it is loaded before
//the templates that use its global variables
var VALID_KEYS = [
  'activeUnit',
  'activeUnit2',
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
    if (key == 'impersonatedID') {
      //set security ... is teacher
      //or is parent impersonating one of their own childrenOrAdvisees
      //can I set up an autorun on this variable that
      //does the validation as well?
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

  initializePage: function () {
    this.set('editingMainPage', null);
    //set active unit or active unit 2 here from user profile?
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