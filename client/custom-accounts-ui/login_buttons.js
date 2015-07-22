  /**********************************/
 /******* LOGIN BUTTONS ************/
/**********************************/

Template.loginButtons.helpers({
  greeting: function() {
    var user = Meteor.user();
    if (Roles.userIsInRole(user,'teacher'))
      user = Meteor.impersonatedOrUser();
    return (user && !Meteor.loggingIn()) ? (user.profile.firstName + ' ' + user.profile.lastName) || user.username : 'Sign in/Join';
  },
  selectedForm: function() {
    var user = Meteor.user();
    var selectedForm = loginButtonsSession.get('selectedForm');
    var validLoggedinForms = ['loggedInForm','changePasswordForm','editProfileForm'];
    var validLoggedoutForms = ['loginForm','createAccountForm','forgotPasswordForm'];
    if (user && !Meteor.loggingIn()) {
      if (_.contains(validLoggedinForms,selectedForm)) {
        return Template[selectedForm];
      } else {
        return Template['loggedInForm'];
        loginButtonsSession.set('selectedForm','loggedInForm'); //set default
      }
    } else {
      if (_.contains(validLoggedoutForms,selectedForm)) {
        return Template[selectedForm];
      } else {
        return Template['loginForm'];
        loginButtonsSession.set('selectedForm','loginForm'); //set default
      }
    }
  }
})


Template.loginButtons.events({
  'click input': function(event) {
    event.stopPropagation();
  },
  'click .dropdown-toggle': function(event) {
    event.stopPropagation();
    Template.loginButtons.toggleDropdown();
  },
  'click select': function(event) {
    event.stopPropagation();
  }  
});

Template.loginButtons.toggleDropdown = function() {
  toggleDropdown();
  focusInput();
};

var toggleDropdown = function() {
  $("#login-dropdown-list").toggleClass("open");
}

var focusInput = function() {
  setTimeout(function() {
    $("#login-dropdown-list input").first().focus();
  }, 0);
};

 
  /********************************/
 /******* LOGGED IN FORM *********/
/********************************/

/* sign out form events */
Template.loggedInForm.events({
  'click #login-buttons-logout': function(event,tmpl) {
    Meteor.logout(function(error) {
      //set error message and toggle dropdown back up?
      //toggleDropdown();
    });
  },
  'click #login-buttons-open-change-password': function(event,tmpl) {
    event.stopPropagation();
    loginButtonsSession.set('selectedForm','changePasswordForm');
  },
  'click #login-buttons-logout-message-only-OK': function(event,tmpl) {
    loginButtonsSession.closeDropdown();
  },
  'click #login-buttons-edit-profile': function(event,tmpl) {
    event.stopPropagation();
    loginButtonsSession.set('selectedForm','editProfileForm');
  }
})

  /**********************************/
 /******* LOGIN FORM ***************/
/**********************************/
var ForgotPasswordMessage = 'Enter your e-mail address, and a message will be sent to you with a link allowing you to change your password.'

Template.loginForm.onCreated(function() { 
  this.Session = new ReactiveDict; //private session for each instance of the template
  this.Session.set('message',null); //{type:[danger,success, info, warning, primary],text:'some message'}
})

/* loginform helpers */
Template.loginForm.helpers({
  session: function(key) {
    var tmpl = Template.instance();
    return tmpl.Session.get(key);
  }
});

/* loginform events */
Template.loginForm.events({
  "focus .form-control": function(event,tmpl) {
    tmpl.Session.set('message',null);
  },
  'click #login-buttons-signin': function(event,tmpl) {
    event.stopPropagation();
    login(event,tmpl);
  },
  'keypress #login-username-or-email, keypress #login-password': function(event,tmpl) {
    if (event.keyCode === 13) {
      login(event,tmpl);
    }
  },
  'click #signup-link': function(event,tmpl) {
    event.stopPropagation();
    tmpl.Session.set('message',null);

    // store values of fields before switching to the signup form
    var usernameOrEmail = getTrimmedVal(tmpl,'login-username-or-email');
    loginButtonsSession.set('selectedForm','createAccountForm');
    // force the ui to update so that we have the approprate fields to fill in
    Meteor.flush();
    // update new fields with appropriate defaults
    if (usernameOrEmail){
      if (Match.test(usernameOrEmail,Match.email)) {
        $('#login-create-email').val(usernameOrEmail);
      } else {
        $('#login-create-username').val(usernameOrEmail);
      }
    }
  },
  'click #forgot-password-link': function(event,tmpl) {
    event.stopPropagation();
    tmpl.Session.set('message',{type:'info',text:ForgotPasswordMessage});

    var usernameOrEmail = getTrimmedVal(tmpl,'login-username-or-email');

    loginButtonsSession.set('selectedForm','forgotPasswordForm')
    Meteor.flush();

    if ((usernameOrEmail) && Match.test(usernameOrEmail,Match.email))
        $('#forgot-password-email').val(usernameOrEmail);
  }
});

 /* login */
var login = function(event,tmpl) {
  tmpl.Session.set('message',null);

  var usernameOrEmail = getTrimmedVal(tmpl,'login-username-or-email');
    //simple validation as string ... not sure how to handle all the cases or whether I should try
    if (!Match.test(usernameOrEmail,Match.nonEmptyString)) return tmpl.Session.set('message',{type:'danger',text:'You must enter a username or an e-mail.'});
  var password = getVal(tmpl,'login-password');
    //no validation necessary?

  Meteor.loginWithPassword(usernameOrEmail, password, function(error, result) {
    if (error) {
      if (error.reason == 'User not found') {
        tmpl.Session.set('message',{type:'danger',text:'User not found.'});
      } else if (error.reason == 'Incorrect password'){
        tmpl.Session.set('message',{type:'danger',text:'Incorrect password.'});
      } else {
        tmpl.Session.set('message',{type:'danger',text:error.reason || "Unknown error"});
      }
    } else {
      toggleDropdown();
    }
  });
}

  /**********************************/
 /******* CREATE ACCOUNT FORM ******/
/**********************************/

Template.createAccountForm.onCreated(function() { 
  this.Session = new ReactiveDict; //private session for each instance of the template
  this.Session.set('newEmails', null);
  this.Session.set('childrenOrAdvisees',null);
  this.Session.set('message',null); //{type:[danger,success, info, warning, primary],text:'some message'}
})

/* create account form helpers */
Template.createAccountForm.helpers({
  session: function(key) {
    var tmpl = Template.instance();
    return tmpl.Session.get(key);
  },
  sections: function() {
    return Sections.find();
  }
})

/* create account form events */
Template.createAccountForm.events({
  'change #login-create-role' : function(event,tmpl) {
    tmpl.Session.set('message',null);
    $section = tmpl.$('#login-create-section');
    if ($(tmpl.find('#login-create-role')).val() == 'student') {
      $section.removeClass('hidden').focus();
    } else {
      $section.addClass('hidden');
    }
    $chooseStudents = tmpl.$('#login-create-choose-students');
    $chooseStudent = tmpl.$('input.login-create-choose-student');
    if ($(tmpl.find('#login-create-role')).val() == 'parentOrAdvisor') {
      $chooseStudents.removeClass('hidden');
      $chooseStudent.focus();
    } else {
      $chooseStudents.addClass('hidden');
    }
  },
  "focus .form-control[type!='role'][type!='section'][type!='student']": function(event,tmpl) {
    tmpl.Session.set('message',null);
  },
  "change .form-control[type='section'], change .form-control[type='student']": function(event,tmpl) {
    tmpl.Session.set('message',null);
  },
  'keypress .login-create-choose-student': function(event,tmpl) {
    if (event.keyCode === 13){
      var childrenOrAdvisees = [];
      tmpl.$('.login-create-choose-student').each(function(i,s) {
        var cleanValue = _.clean(s.value);
        if (cleanValue) {
          childrenOrAdvisees.push({name:cleanValue});
        }
      })
      tmpl.Session.set('childrenOrAdvisees',childrenOrAdvisees);
      $(event.target).val('');
    }
  },
  'click #login-buttons-cancel-create': function(event,tmpl) {
    event.stopPropagation();
    tmpl.Session.set('message',null);

    var username = getTrimmedVal(tmpl,'login-create-username');
    var email = getTrimmedVal(tmpl,'login-create-email');
    loginButtonsSession.set('selectedForm','loginForm');

    // force the ui to update so that we have the approprate fields to fill in
    Meteor.flush();
    // update new fields with appropriate defaults
    if (username) {
      $('#login-username-or-email').val(username);
    } else if (email) {
      $('#login-username-or-email').val(email);
    }
  },
  'click #login-buttons-create': function(event,tmpl) {
    event.stopPropagation();
    createUser(event,tmpl);
  },
  "keypress .form-control[type!='role'][type!='section'][type!='student']": function(event,tmpl) {
    event.stopPropagation();
    if (event.keyCode === 13) {
      createUser(event,tmpl);
    } 
  }
});

/* Create user */
var createUser = function(event,tmpl) {
  tmpl.Session.set('message',null);

  // to be passed to Accounts.createUser
  var options = {};
  options.username = getTrimmedVal(tmpl,'login-create-username');
    if (!Match.test(options.username,Match.nonEmptyString)) return tmpl.Session.set('message',{type:'danger',text:'You must specify a username.'});
    if (options.username.length > 12)  return tmpl.Session.set('message',{type:'danger',text:'Keep your user name short (12 characers or less) but unique and recognizable.'});
  options.profile = {};
  options.profile.firstName = getTrimmedVal(tmpl,'login-create-firstname');
    if (!Match.test(options.profile.firstName,Match.nonEmptyString)) return tmpl.Session.set('message',{type:'danger',text:'Please enter your first name.'});
  options.profile.lastName = getTrimmedVal(tmpl,'login-create-lastname');
    if (!Match.test(options.profile.lastName,Match.nonEmptyString)) return tmpl.Session.set('message',{type:'danger',text:'Please enter your last name.'});

  options.email = getTrimmedVal(tmpl,'login-create-email');
    if (!Match.test(options.email,Match.email)) return tmpl.Session.set('message',{type:'danger',text:'Enter a valid e-mail address.'});

  var pEi = {}; //post Enrollment info
  pEi.role = $(tmpl.find('#login-create-role')).val();
    if (!Match.test(pEi.role,Match.OneOf('student','teacher','parentOrAdvisor'))) return tmpl.Session.set('message',{type:'danger',text:"You must select a role."});
    if (pEi.role == 'student') {
      pEi.sectionID = $(tmpl.find('#login-create-section')).val();
      if (!Match.test(pEi.sectionID,Match.idString)) return tmpl.Session.set('message',{type:'danger',text:"You must choose a section."});
      var section = Sections.findOne(pEi.sectionID);
      if (!section) return tmpl.Session.set('message',{type:'danger',text:"Invalid section."});
    } else if (pEi.role == 'parentOrAdvisor') {
      pEi.childrenOrAdvisees = [];
      tmpl.$('.login-create-choose-student').each(function(i,s) {
        var cleanValue = _.clean(s.value);
        if (Match.test(cleanValue,Match.nonEmptyString)) {
          pEi.childrenOrAdvisees.push(cleanValue);
        }
      })
    } 
  //currently no extra fields for teacher
  options.profile.postEnrollmentInfo = pEi;
  Meteor.call('createUnvalidatedUser',options,function(error) {
    if (error) {
      tmpl.Session.set('message',{type:'danger',text:error.reason || "Unknown error creating user."});
    } else {
      tmpl.Session.set('message',{type:'success',text:'Once a teacher validates your information, you will receive an e-mail with a link to set your password and activate your account.'});
    }
  })
}



  /**********************************/
 /******* FORGOT PASSWORD FORM******/
/**********************************/
Template.forgotPasswordForm.onCreated(function() { 
  this.Session = new ReactiveDict; //private session for each instance of the template
  this.Session.set('message',{type:'info',text:ForgotPasswordMessage}); //{type:[danger,success, info, warning, primary],text:'some message'}
})

/* forgot password form helpers */
Template.forgotPasswordForm.helpers({
  session: function(key) {
    var tmpl = Template.instance();
    return tmpl.Session.get(key);
  }
});

/* forgot password form events */
Template.forgotPasswordForm.events({
  "focus .form-control": function(event,tmpl) {
    tmpl.Session.set('message',{type:'info',text:ForgotPasswordMessage});
  },
  'click #login-buttons-cancel-forgot-password': function(event,tmpl) {
    event.stopPropagation();
    tmpl.Session.set('message',{type:'info',text:ForgotPasswordMessage});

    var email = getTrimmedVal(tmpl,'forgot-password-email');

    loginButtonsSession.set('selectedForm','loginForm');

    // force the ui to update so that we have the approprate fields to fill in
    Meteor.flush();
    // update new fields with appropriate defaults
    if (email) 
      $('#login-username-or-email').val(email);  
  },
  'keypress #forgot-password-email': function(event,tmpl) {
    event.stopPropagation();
    if (event.keyCode === 13){
      forgotPassword(event,tmpl);
    }
  },
  'click #login-buttons-forgot-password': function(event,tmpl) {
    event.stopPropagation();
    forgotPassword(event,tmpl);
  }
})

 /* forgot password */
var forgotPassword = function(event,tmpl) {
  tmpl.Session.set('message',{type:'info',text:ForgotPasswordMessage});

  var email = getTrimmedVal(tmpl,'forgot-password-email');
  if (!Match.test(email,Match.email)) return tmpl.Session.set('message',{type:'danger',text:'Invalid email.'});
  Meteor.call('isEmailVerified',email,function(error,isVerified) {
    if (error) {
      tmpl.Session.set('message',{type:'danger',text:error.reason || 'Email not found. No user on the system has registered this email.'})
    } else {
      if (isVerified) {
        Accounts.forgotPassword({
          email: email
        }, function(error) {
          if (error) {
            tmpl.Session.set('message',{type:'danger',text:error.reason || "Unknown error"});
          } else {
            tmpl.Session.set('message',{type:'success',text:'Email sent.'});
          }
        })
      } else {
        tmpl.Session.set('message',{type:'danger',text:'This email has not been verified.  To reset your password, you must use the email you verified when you created your account.'})
      }
    }
  })
};

  /**********************************/
 /******* CHANGE PASSWORD FORM******/
/**********************************/

Template.changePasswordForm.onCreated(function() { 
  this.Session = new ReactiveDict; //private session for each instance of the template
  this.Session.set('message',null); //{type:[danger,success, info, warning, primary],text:'some message'}
})

/* change password form helpers */
Template.changePasswordForm.helpers({
  session: function(key) {
    var tmpl = Template.instance();
    return tmpl.Session.get(key);
  }
});

/* change password form events */
Template.changePasswordForm.events({
  'keypress #change-password-old, keypress #change-password-new, keypress #change-password-new-again': function(event,tmpl) {
    event.stopPropagation();
    if (event.keyCode === 13){
      changePassword(event,tmpl);
    }    
  },
  "focus .form-control": function(event,tmpl) {
    tmpl.Session.set('message',null);
  },
  'click #login-buttons-do-change-password': function(event,tmpl) {
    event.stopPropagation();
    changePassword(event,tmpl);
  },
  'click #login-buttons-cancel-change-password': function(event,tmpl) {
    event.stopPropagation();
    tmpl.Session.set('message',null);
    loginButtonsSession.set('selectedForm','loggedInForm');
  }
});

 /* change password */
var changePassword = function(event,tmpl) {
  tmpl.Session.set('message',null);
  // notably not trimmed. a password could (?) start or end with a space
  var oldPassword = getVal(tmpl,'change-password-old');
  var password = getVal(tmpl,'change-password-new');
  var passwordAgain = getVal(tmpl,'change-password-new-again');
  
  if (password == oldPassword) return tmpl.Session.set('message',{type:'danger',text:"New and old passwords must be different"});
  if (!Match.test(password,Match.password)) return tmpl.Session.set('message',{type:'danger',text:'Passwords must be at least 8 characters long and contain one lowercase letter, one uppercase letter, and one digit or special character (@#$%^&+=_-)'});
  if (!passwordAgain) return tmpl.Session.set('message',{type:'danger',text:'Enter password again to confirm.'});
  if (passwordAgain != password) return tmpl.Session.set('message',{type:'danger',text:"Passwords don't match."});

  Accounts.changePassword(oldPassword, password, function(error) {
    if (error) {
      tmpl.Session.set('message',{type:'danger',text:error.reason || "Unknown error"});
    } else {
      tmpl.Session.set('message',{type:'success',text:'Password changed.'});
    }
  });
};

  /********************************/
 /******* EDIT PROFILE FORM ******/
/********************************/

Template.editProfileForm.onCreated(function() { 
  this.Session = new ReactiveDict; //private session for each instance of the template
  this.Session.set('newEmails', null);
  this.Session.set('childrenOrAdvisees',null);
  this.Session.set('message',null); //{type:[danger,success, info, warning, primary],text:'some message'}
})

Template.editProfileForm.onRendered(function() {
  //this template also used on the account verification page, where a return button is not needed
  this.Session.set('isInDropdown',this.$('#edit-profile-username').closest('.dropdown').length);
})

/* edit profile form helpers */
Template.editProfileForm.helpers({
  session: function(key) {
    var tmpl = Template.instance();
    return tmpl.Session.get(key);
  },
  sections: function() {
    return Sections.find();
  },
  //emailCountIsOne guarantees that validate e-mail button only shows if there is just one e-mail in the list and it is unvalidated
  //i.e. only if the user has not yet registered and doensn't have a password yet
  //ideally I should add in handling for email verification and not just enrollment      
  emailCountIsOne: function() { 
    var tmpl = Template.instance();
    var user = tmpl.data;
    return (('emails' in user) && _.isArray(user.emails)) ?  (user.emails.length == 1) : false; 
  },
  sectionSelected: function () {
    var tmpl = Template.instance();
    var user = tmpl.data
    var cS = Meteor.currentSection(user._id);
    return ((cS) && (this._id == cS._id)) ? 'selected' : '';
  },
  noSectionSelected: function() {
    var tmpl = Template.instance();
    var user = tmpl.data
    var cS = Meteor.currentSection(user._id);
    return (cS) ? '' : 'selected';
  },
  verifiedStudents: function() { 
    var tmpl = Template.instance();
    var user = tmpl.data
    if (!Roles.userIsInRole(user,'parentOrAdvisor'))
      return '';
    var cOA = [];
    var students = user.childrenOrAdvisees || '';
    if (students) {
      students.forEach(function(s,index,students) {
        var student = Meteor.users.findOne(s.idOrFullname);
        if (student && s.verified) {
          var name = (student.profile.firstName + ' ' + student.profile.lastName) || student.userName || 'Name not found?';
          student.name = name;
          cOA.push(student);
        }
      });
    }
    return cOA;
  },
  unverifiedStudents: function() {  
    var tmpl = Template.instance();
    var user = tmpl.data
    if (!Roles.userIsInRole(user._id,'parentOrAdvisor'))
      return '';
    var cOA = [];
    var students = user.childrenOrAdvisees || '';
    if (students) {
      students.forEach(function(s,index,students) {
        var student = Meteor.users.findOne(s.idOrFullname);
        if (student && !s.verified) {
          var name = (student.profile.firstName + ' ' + student.profile.lastName) || student.userName || 'Name not found?';
          student.name = name;
          cOA.push(student);
        }
      });
    }
    return cOA;
  },
  lostStudents: function() {
    var tmpl = Template.instance();
    var user = tmpl.data
    if (!Roles.userIsInRole(user._id,'parentOrAdvisor'))
      return '';
    var cOA = [];
    var students = user.childrenOrAdvisees || '';
    if (students) {
      students.forEach(function(s,index,students) {
        if (!Match.test(s.idOrFullname,Match.idString))
          cOA.push({_id:s.idOrFullname,name:s.idOrFullname});
      });
    }
    return cOA;    
  },
  roleSelected: function(role) {
    var tmpl = Template.instance();
    var user = tmpl.data;
    return Roles.userIsInRole(user,role) ? 'selected' : '';
  },
  isSelf: function() {
    var tmpl = Template.instance();
    var user = tmpl.data;
    return (Meteor.userId() == user._id);    
  }
})

/* edit profile form events */
Template.editProfileForm.events({
  "keypress .form-control[type!='student'][type!='email']": function(event,tmpl) {
    event.stopPropagation();
    if (event.keyCode === 13){
      updateProfile(event,tmpl);
    } 
  },
  "focus .form-control": function(event,tmpl) {
    tmpl.Session.set('message',null);
  },
  'keypress .edit-profile-choose-student': function(event,tmpl) {
    if (event.keyCode === 13){
      var childrenOrAdvisees = [];
      tmpl.$('.edit-profile-choose-student').each(function(i,s) {
        var cleanValue = _.clean(s.value);
        if (cleanValue) {
          childrenOrAdvisees.push({name:cleanValue});
        }
      })
      tmpl.Session.set('childrenOrAdvisees',childrenOrAdvisees);
      $(event.target).val('');
    }
  },
  'keypress .edit-profile-add-email': function(event,tmpl) {
    if (event.keyCode === 13){
      var emails = [];
      tmpl.$('.edit-profile-add-email').each(function(i,s) {
        if (s.value) {
          emails.push({address:s.value,verified:false});
        }
      })
      tmpl.Session.set('newEmails',emails);
      $(event.target).val('');
    }
  },
  'click .remove-email': function(event,tmpl) {
    event.stopPropagation();
    var tmpl = Template.instance();
    var user = tmpl.data;
    Meteor.call('removeEmail',user._id,this.address,function(error,id) {
      if (error) {
        tmpl.Session.set('message',{type:'danger',text:error.reason || 'Could not remove e-mail.  Unknown error.'});
      } else {
        tmpl.Session.set('message',{type:'success',text:'Email successfully removed.'});
      }
    });
  },
  'click .send-enrollment-email': function(event,tmpl) {
    event.stopPropagation();
    var user = tmpl.data;
    Meteor.call('sendEnrollmentEmail',user._id,function(error) {
      if (error) {
        tmpl.Session.set('message',{type:'danger',text:error.reason || 'Could not send enrollment e-mail.  Unknown error.'});
      } else {
        tmpl.Session.set('message',{type:'success',text:'Enrollment e-mail sent.'});
      }
    });
  },
  'click #edit-profile-save': function(event,tmpl) {
    event.stopPropagation();
    updateProfile(event,tmpl);
  },
  'click #edit-profile-cancel': function(event,tmpl) {
    event.stopPropagation();
    var tmpl = Template.instance();
    tmpl.Session.set('message',null);
    loginButtonsSession.set('selectedForm','loggedInForm');
  },
  'click .stop-observing': function(event,tmpl) {
    event.stopPropagation();
    var tmpl = Template.instance();
    var user = tmpl.data;
    //needs to be edited!
    var successMessage = (Match.test(this._id,Match.idString)) ? 'You have stopped observing ' : 'You have withdrawn your request to observe ';
    successMessage += this.name + '.';
    Meteor.call('removeChildOrAdvisee',user._id,this._id,function(error,id) {
      if (error) {
        tmpl.Session.set('message',{type:'danger',text:error.reason || 'Could not remove child or advisee.  Unknown error.'});
      } else {
        tmpl.Session.set('message',{type:'success',text:successMessage});
      }
    });
  },
  'click .verify-child-or-advisee': function(event,tmpl) {
    event.stopPropagation();
    var tmpl = Template.instance();
    var user = tmpl.data;
    var s = this;
    Meteor.call('verifyChildOrAdvisee',user._id,this._id,function(error,id) {
      if (error) {
        tmpl.Session.set('message',{type:'danger',text:error.reason || 'Could not verify child or advisee.  Unknown error.'});
      } else {
        tmpl.Session.set('message',{type:'success',text:s.name + ' has been verified.'});
      }
    });
  }
})

 /* update profile */
var updateProfile = function(event,tmpl) {
  var cU = Meteor.users.findOne(tmpl.data._id); //get latest data for target user
  var user = {
    _id:cU._id,
    profile:{}
  }; 
  var username = getTrimmedVal(tmpl,'edit-profile-username');
    if (!Match.test(username,Match.nonEmptyString)) return tmpl.Session.set('message',{type:'danger',text:'You must specify a username.'});
    if (username.length > 12)  return tmpl.Session.set('message',{type:'danger',text:'Keep your user name short (12 characers or less) but unique and recognizable.'});
    if (username != cU.username) user.username = username;
  var firstName = getTrimmedVal(tmpl,'edit-profile-firstname');
    if (!Match.test(firstName,Match.nonEmptyString)) return tmpl.Session.set('message',{type:'danger',text:'Please enter your first name.'});
    if (firstName != cU.profile.firstName) user.profile.firstName = firstName;
  var lastName = getTrimmedVal(tmpl,'edit-profile-lastname');
    if (!Match.test(lastName,Match.nonEmptyString)) return tmpl.Session.set('message',{type:'danger',text:'Please enter your last name.'});
    if (lastName != cU.profile.lastName) user.profile.lastName = lastName;
  user.emails = [];
  var emailError = null;
  tmpl.$('.edit-profile-add-email').each(function(i,s) {
    var email = s.value;
    if (Match.test(email,Match.nonEmptyString)) {
      if (!Match.test(email,Match.email)) {
        emailError = 'Invalid email address.'; //not setting message straight from here because we can only return from array.each and not from the whole updateProfile
      } else {
        user.emails.push(email);
      }
    }    
  });
  if (emailError) return tmpl.Session.set('message',{type:'danger',text:emailError});

  var pEi = {}; //post Enrollment info ... is there a better name for this here?
    if (Roles.userIsInRole(Meteor.userId(),'teacher')) { //checking if actually logged in user is teacher
       if (Meteor.userId() != cU._id) { //forbid teacher changing own role
        var role = tmpl.$('#edit-profile-role').val();
        if (!Match.test(role,Match.OneOf('student','teacher','parentOrAdvisor')) && !Roles.userIsInRole(cU,['student','teacher','parentOrAdvisor'])) 
          return tmpl.Session.set('message',{type:'danger',text:"You must select a role."});
        if (!Roles.userIsInRole(cU,role)) { 
          pEi.role = role;
        }
      }
    }
    if (Roles.userIsInRole(cU,'student')) {
      var sectionID = $(tmpl.find('#edit-profile-section')).val();
      if (!Match.test(sectionID,Match.idString)) return tmpl.Session.set('message',{type:'danger',text:"You must choose a section."});
      var section = Sections.findOne(sectionID);
      if (!section) return tmpl.Session.set('message',{type:'danger',text:"Invalid section."});
      var cS = Meteor.currentSection();
      if ((!cS) || (sectionID != cS._id))
        pEi.sectionID = sectionID;
    } else if (Roles.userIsInRole(cU,'parentOrAdvisor')) {
      pEi.childrenOrAdvisees = [];
      tmpl.$('.edit-profile-choose-student').each(function(i,s) {
        var cleanValue = _.clean(s.value);
        if (Match.test(cleanValue,Match.nonEmptyString)) {
          pEi.childrenOrAdvisees.push(cleanValue);
        }
      })
    } 
  user.profile.postEnrollmentInfo = pEi; 

  Meteor.call('updateUser',user,function(error,userID) {
    if (error) {
      tmpl.Session.set('message',{type:'danger',text:error.reason || 'Unknown error updating profile.'});
    } else {
      //Meteor.flush();
      tmpl.Session.set('message',{type:'success',text:'Profile successfully updated.'});
      tmpl.Session.set('newEmails',null);
      tmpl.Session.set('childrenOrAdvisees',null);
      $('.edit-profile-choose-student').val('');
      $('.edit-profile-add-email').val('');
    }
  });

}

  /********************************************/
 /****************** HELPERS *****************/
/********************************************/


var getVal = function(tmpl,id) {
  var $element = $(tmpl.find("#" + id));
  if (!$element){
    return null;
  } else {
    return $element.val();
  }
};

var getTrimmedVal = function(tmpl,id) {
  var $element = $(tmpl.find("#" + id));
  if (!$element){
    return null;
  } else {
    return $element.val().replace(/^\s*|\s*$/g, ""); // trim;
  }
};






