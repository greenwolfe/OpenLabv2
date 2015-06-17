//Must be placed in a subfolder so that it is loaded before
//the templates that use its global variables

var VALID_KEYS = [
  'selectedForm',
  'resetPasswordToken', 
  'enrollAccountToken',
  'viewAs', //either a userId or a sectionId
  'invitees', //array of user to invite
  'sectionID', //section ID for choosing a group
  'viewParents' //boolean
];

var validateKey = function (key) {
  if (!_.contains(VALID_KEYS, key))
    throw new Meteor.Error("invalidKey","Invalid key in loginButtonsSession: " + key);
};

var KEY_PREFIX = "Meteor.loginButtons.";

loginButtonsSession = {
  set: function(key, value) {
    validateKey(key);
    var user = Meteor.user();
    if ( (key == 'viewAs') && 
          ( // a little security regarding impersonation, it is still important that publications and subscriptions be managed to prevent improper access to information
          Roles.userIsInRole(user,'student') || //students cannot impersonate
          (value == Meteor.userId()) || //cannot impersonate self
          (Roles.userIsInRole(user,'parentOrAdvisor') && !_.contains(Meteor.childOrAdviseeIds(),value)) //parent or advisor can only impersonate verified students in their list
          ))
            value = null; 
    Session.set(KEY_PREFIX + key, value);
  },
  get: function(key) {
    validateKey(key);
    var user = Meteor.user();
    var value = Session.get(KEY_PREFIX + key);
    if ( (key == 'viewAs') && 
         ( // and a little extra security against the user setting viewAs directly through Session.set rather than loginButtonsSession.set
          Roles.userIsInRole(user,'student') || //students cannot impersonate
          (value == Meteor.userId()) || //cannot impersonate self
          (Roles.userIsInRole(user,'parentOrAdvisor') && !_.contains(Meteor.childOrAdviseeIds(),value)) //parent or advisor can only impersonate verified students in their list
          ))
            value = null;
    return value;
  },
  push: function (key,value) {
    validateKey(key);
    var currentValue = Session.get(KEY_PREFIX + key);
    if (!currentValue) {
      Session.set(KEY_PREFIX + key,[value]);
    } else if (_.isArray(currentValue)) {
      currentValue.push(value)
      Session.set(KEY_PREFIX + key,currentValue)
    } else {
      throw new Meteor.Error("notArray","Push only works for arrays.  Use set for a non-array variable.")
    }
  },
  pull: function(key,value) {
    validateKey(key);
    var currentValue = Session.get(KEY_PREFIX + key);
    if (!currentValue)
      return; //nothing to pull
    if (_.isArray(currentValue)) {
      Session.set(KEY_PREFIX + key,_.without(currentValue,value))
    } else {
      throw new Meteor.Error("notArray","Pull only works for arrays.  Use set for a non-array variable.")      
    }
  },
  toggleArray: function(key,value) {
    validateKey(key);
    var currentValue = Session.get(KEY_PREFIX + key);
    if (!currentValue) {
      Session.set(KEY_PREFIX + key,[value]);
    } else if (_.isArray(currentValue)) {
      currentValue = (_.indexOf(currentValue,value) == -1) ? 
              _.union(currentValue,[value]) : _.without(currentValue,value);
      Session.set(KEY_PREFIX + key,currentValue);
    } else {
      throw new Meteor.Error("notArray","Toggle only works for arrays.  Use set for a non-array variable.")      
    }    
  }
};

  /****************************/ 
 /***** ONLOGIN CALLBACK *****/
/****************************/

/* is there a better place to do this?  Will this constrain any future use of onlogin callback? */
Accounts.onLogin(function(){
  loginButtonsSession.set('viewAs',null);
  loginButtonsSession.set('invitees',[]);
  loginButtonsSession.set('viewParents',false);
  loginButtonsSession.set('sectionID',Meteor.currentSectionId());
})

  /*********************************/ 
 /***** IMPERSONATION HELPERS *****/
/*********************************/

Meteor.impersonatedId = function() {
  var viewAs = loginButtonsSession.get('viewAs');
  var user = Meteor.users.findOne(viewAs);
  return (user) ? user._id: '';
                          //!user => viewAs is null or is a sectionId
}
Template.registerHelper('impersonatedId',function() {
  return Meteor.impersonatedId();
});
Meteor.impersonatedUser = function() {
  return Meteor.users.findOne(Meteor.impersonatedId());
}
Template.registerHelper('impersonatedUser',function() {
  return Meteor.impersonatedUser();
});

Meteor.impersonatedOrUserId = function() {
  return Meteor.impersonatedId() || Meteor.userId(); //could be null 
}
Template.registerHelper('impersonatedOrUserId',function() {
  return Meteor.impersonatedOrUserId();
});
Meteor.impersonatedOrUser = function() {
  return Meteor.users.findOne(Meteor.impersonatedId()) || Meteor.user();
}
Template.registerHelper('impersonatedOrUser',function() {
  return Meteor.impersonatedOrUser();
});

  /****************************/ 
 /***** SELECTED SECTION *****/
/****************************/

Meteor.selectedSection = function() {
  var viewAs = loginButtonsSession.get('viewAs');
  var section = Sections.findOne(viewAs);
  if (!section) //viewAs is null or is a userId
    return Meteor.currentSection(); //could be undefined if no one is logged in or logged or impersonated user has no curren section
  return section;
}
Template.registerHelper('selectedSection',function() {
  return Meteor.selectedSection();
});

  /****************************************/ 
 /***** CHILDREN OR ADVISEES HELPERS *****/
/****************************************/

Meteor.childrenOrAdvisees = function(parentOrAdvisor) {
  var user = parentOrAdvisor || Meteor.user();
  if (!Roles.userIsInRole(user,'parentOrAdvisor'))
    return null;
  var cOA = [];
  var students = user.childrenOrAdvisees || '';
  if (students) {
    students.forEach(function(s,index,students) {
      var student = Meteor.users.findOne(s.idOrFullname);
      if (student && s.verified) 
        cOA.push(student);
    });
  }
  return cOA;
}
Meteor.childOrAdviseeIds = function(parentOrAdvisor) {
  var cOA = Meteor.childrenOrAdvisees(parentOrAdvisor);
  return _.pluck(cOA,'_id');
}
Template.registerHelper('childrenOrAdvisees',function() {
  return Meteor.childrenOrAdvisees();
});