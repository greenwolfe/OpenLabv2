//Must be placed in a subfolder so that it is loaded before
//the templates that use its global variables

var VALID_KEYS = [
  'selectedForm',
  'resetPasswordToken', 
  'enrollAccountToken',
  'viewAs', //either a userId or a sectionId
  'invitees', //array of user to invite
  'sectionID', //section ID for choosing a group
  'viewParents' //boolean (what is its function?  Would a better name be viewingAsParent?)
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
  loginButtonsSession.set('invitees',[]);
  loginButtonsSession.set('viewParents',false);
  openlabSession.set('editingMainPage',false);

  var cU = Meteor.user();
  //select lastViewed unit or units
  if ('profile' in cU) {
    var activeUnit = cU.profile.lastViewedUnit || null;
    var activeUnit2 = cU.profile.lastViewedUnit2 || null;
    if (activeUnit) 
      openlabSession.set('activeUnit',activeUnit);
    if (activeUnit2)
      openlabSession.set('activeUnit2',activeUnit2);
  }
  //select lastViewed category or categories
  if ('profile' in cU) {
    var activeCategory = cU.profile.lastViewedCategory || null;
    var activeCategory2 = cU.profile.lastViewedCategory2 || null;
    if (activeCategory) 
      openlabSession.set('activeCategory',activeCategory);
    if (activeUnit2)
      openlabSession.set('activeCategory2',activeCategory2);
  }


  //students cannot impersonate
  if (Roles.userIsInRole(cU,'student'))
    loginButtonsSession.set('viewAs',null);

  //select lastViewed or a random section ID for teacher's initial view
  var sectionID = Meteor.currentSectionId();
  if (Roles.userIsInRole(cU,'teacher') && !sectionID) {
    if ('profile' in cU) {
      sectionID = cU.profile.lastViewedSectionID || Sections.findOne();
    } else {
      sectionID = Sections.findOne();
    }
    loginButtonsSession.set('viewAs',sectionID);
  }
  loginButtonsSession.set('sectionID',sectionID);

  //select lastViewed or random child or advisee for parent or advisors initial view
  var studentID = Meteor.impersonatedId() || null;
  if (Roles.userIsInRole(cU,'parentOrAdvisor')) {
    if ('profile' in cU) 
      studentID = cU.profile.lastViewedChildOrAdvisee || null;
    var childrenOrAdvisees = Meteor.childrenOrAdvisees();
    if ((childrenOrAdvisees) && (childrenOrAdvisees.length > 0) && (!studentID))
      studentID = childrenOrAdvisees[0]._id;
    loginButtonsSession.set('viewAs',studentID);
  }
})

  /*****************************/ 
 /***** ONLOGOUT CALLBACK *****/
/*****************************/

Tracker.autorun(function() {
  if (!Meteor.userId() && !Meteor.loggingIn()) {
    loginButtonsSession.set('viewAs',null);
    var firstUnit = null;
    if (FlowRouter.subsReady('units'))
      firstUnit = Units.findOne({visible:true},{sort: {order: 1},fields:{_id:1}});
    firstUnit = firstUnit || {_id:null};
    var firstCategory = null;
    if (FlowRouter.subsReady('categories'))
      firstCategory = Categories.findOne({visible:true},{sort: {order: 1},fields:{_id:1}});
    firstCategory = firstCategory || {_id:null};    
    openlabSession.set('activeUnit',firstUnit._id)
    openlabSession.set('activeUnit2',null);
    openlabSession.set('activeCategory',firstCategory._id)
    openlabSession.set('activeCategory2',null);
    openlabSession.set('editingMainPage',null);
    FlowRouter.go("/"); //redirect to main page on logout
  }
})


  /*********************************/ 
 /***** IMPERSONATION HELPERS *****/
/*********************************/

Meteor.impersonatedId = function() {
  var viewAs = loginButtonsSession.get('viewAs');
  var user = Meteor.users.findOne(viewAs);

  //pausing to set last viewed child or advisee for parent or advisor before sending result
  //so long as this is used in at least on reactive setting, it will be called
  //when viewAs changes.  If it's not used in a reactive setting, then it doesn't matter anyway
  var cU = Meteor.user();
  if ((user) && Roles.userIsInRole(cU,'parentOrAdvisor'))
    Meteor.call('updateUser',{
      _id:cU._id,
      profile: {
        lastViewedChildOrAdvisee: user._id
      }
    });  

  //possible cause of Error: Permission denied to access property "toString"
  //as it appears when I added this to the studentStatus template
  //??? probably not, but just noting the clue here
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
Meteor.getname = function(userOrId,full) {
  check(full,Match.OneOf('full','first',null));
  var user =  ('object' === typeof userOrId ) ? userOrId : Meteor.users.findOne(userOrId);
  user = user || Meteor.impersonatedOrUser();
  if (!user)
    return 'error: user not found';
  var name = user.username;
  if (('profile' in user) && ('firstName' in user.profile) && ('lastName' in user.profile)) {
    name = user.profile.firstName;
    if (full == 'full') 
      name +=  ' ' + user.profile.lastName;
  }
  return name;
}
Meteor.getUserOrSectionName = function(userOrSectionId) {
  var student = Meteor.users.findOne(userOrSectionId);
  var section = Sections.findOne(userOrSectionId);
  var cU = Meteor.userId();
  if (student) {
    return Meteor.getname(userOrSectionId,'full');
  } else if (section) {
    return section.name;
  } else if (cU) {
    return Meteor.getname(cU,'full')
  }
  return '';
}
Template.registerHelper('getname',function(userOrId,full) {
  return Meteor.getname(userOrId,full);
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
Meteor.selectedSectionId = function() {
  var viewAs = loginButtonsSession.get('viewAs');
  var section = Sections.findOne(viewAs);
  if (!section) //viewAs is null or is a userId
    return Meteor.currentSectionId(); //could be undefined if no one is logged in or logged or impersonated user has no curren section

  //pausing to set last viewed section for teacher before sending result
  //so long as this is used in at least one reactive setting, it will be called
  //when viewAs changes.  If it's not used in a reactive setting, then it doesn't matter anyway
  var cU = Meteor.user();
  if (Roles.userIsInRole(cU,'teacher'))
    Meteor.call('updateUser',{
      _id:cU._id,
      profile: {
        lastViewedSectionID: section._id
      }
    });

  return section._id;  
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