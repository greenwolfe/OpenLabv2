//Must be placed in a subfolder so that it is loaded before
//the templates that use its global variables
var VALID_KEYS = [
  'editedWall',
  'assessmentID', //ID of assessment block passed to chooseStandardsModal
  'showWalls' //allTypes, or just teacher, student, group, or section
];

var validateKey = function (key) {
  if (!_.contains(VALID_KEYS, key)){
    throw new Error("Invalid key in activityPageSession: " + key);
  }
};

var validateValue = function(key,value) {
  if ((key == 'showWalls') && !_.contains(['allTypes','teacher','student','group','section'],value)) 
    throw new Error("Invalid value for key, " + key + " in activityPageSession: " + value);
}

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
    validateValue(key,value);
    Session.set(KEY_PREFIX + key, value);
  },

  get: function(key) {
    validateKey(key);
    return Session.get(KEY_PREFIX + key);
  },

  initializePage: function () {
    this.set('editedWall', null);
    this.set('showWalls','allTypes');
  }
};