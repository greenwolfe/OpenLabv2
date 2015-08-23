//Must be placed in a subfolder so that it is loaded before
//the templates that use its global variables
var VALID_KEYS = [
  'editedWall',
  'assessmentID' //ID of assessment block passed to chooseStandardsModal
];

var validateKey = function (key) {
  if (!_.contains(VALID_KEYS, key)){
    throw new Error("Invalid key in activityPageSession: " + key);
  }
};

var KEY_PREFIX = "Meteor.openlab.activityPage.";

//Template helpers
VALID_KEYS.forEach(function(key) {
  Template.registerHelper(key,function() { 
    return Session.get(KEY_PREFIX + key);
  })
});

activityPageSession = {
  set: function(key, value) {
    validateKey(key);
    if (_.contains(['errorMessage', 'infoMessage'], key)){
      throw new Error("Don't set errorMessage or infoMessage directly. Instead, use errorMessage() or infoMessage().");
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

  initializePage: function () {
    this.set('editedWall', null);
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