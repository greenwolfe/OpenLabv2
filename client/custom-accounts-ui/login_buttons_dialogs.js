

  /**********************************/
 /******* SET PASSWORD DIALOG ******/
/**********************************/

var doneCallback; //part of accounts-password that has to be handled this way to
                  //complete the set or reset password cycle and invalidate the token

//set Session variable to be read by modal
Accounts.onEnrollmentLink(function(token,done) {
  loginButtonsSession.set('enrollAccountToken',token);
  doneCallback = done;
}) 

Accounts.onResetPasswordLink(function(token,done) {
  loginButtonsSession.set('resetPasswordToken',token);
  doneCallback = done;
}) 

Template.setPasswordDialog.onCreated(function() { 
  this.Session = new ReactiveDict; //private session for each instance of the template
  this.Session.set('message',null); //{type:[danger,success, info, warning, primary],text:'some message'}
  this.Session.set('messageOnly',false);
})

Template.setPasswordDialog.onRendered(function() {
  //get session variable for token and make it visible
  this.autorun(function() {
    var token = loginButtonsSession.get('enrollAccountToken') ||
                loginButtonsSession.get('resetPasswordToken');
    if (token) 
      $('#login-set-password-modal').modal();
  })
})

/* set password events */
Template.setPasswordDialog.events({
	'click #login-set-password': function(event,tmpl) {
    setPassword(event,tmpl);
  },
  'keypress #login-create-password, keypress #login-create-password-again': function(event,tmpl) {
    if (event.keyCode === 13) {
      setPassword(event,tmpl);
    }
  },
  'click #login-cancel-set-password-dialog': function(event,tmpl) {
    loginButtonsSession.set('enrollAccountToken',null);
    loginButtonsSession.set('resetPasswordToken',null);
    $('#login-set-password-modal').modal('hide');
    tmpl.Session.set('message',null);
    tmpl.Session.set('messageOnly',false);
  }  
}) 


/* set password helpers */
Template.setPasswordDialog.helpers({
  session: function(key) {
    var tmpl = Template.instance();
    return tmpl.Session.get(key);
  },
  OkCancel: function() {
    var tmpl = Template.instance();
    return tmpl.Session.get('messageOnly') ? 'OK' : 'Cancel';
  }
})

/* set password */
var setPassword = function(event,tmpl) {
  tmpl.Session.set('message',null);
  var token = loginButtonsSession.get('enrollAccountToken') || 
              loginButtonsSession.get('resetPasswordToken');
    if (!Match.test(token,Match.enrollmentTokenString)) return tmpl.Session.set('message',{type:'danger',text:'Invalid enrollment token.'});
  var password = getVal(tmpl,'login-create-password');
    if (!Match.test(password,Match.password)) return tmpl.Session.set('message',{type:'danger',text:'Passwords must be at least 8 characters long and contain one lowercase letter, one uppercase letter, and one digit or special character (@#$%^&+=_-)'})
  var confirm = getVal(tmpl,'login-create-password-again');
    if (confirm != password) return tmpl.Session.set('message',{type:'danger',text:"Passwords don't match."});

  Accounts.resetPassword(token,password, function(error) {
    if (error) {
      if (error.message === 'Token expired [403]') {
        tmpl.Session.set('message',{type:'danger',text:'Sorry, this link has expired.'});
      } else {
        tmpl.Session.set('message',{type:'danger',text:'Sorry, there was a problem resetting your password.'});          
      }
    } else {
      tmpl.Session.set('message',{type:'success',text:'Success!  Your password has been changed.'});  
    }
    tmpl.Session.set('messageOnly',true);
    loginButtonsSession.set('enrollAccountToken', null);
    loginButtonsSession.set('resetPasswordToken',null);
    // Call done before navigating away from here
    if (doneCallback) {
      doneCallback();
    }
    FlowRouter.go('/');
  }); 
}

  /**********************/
 /******* HELPERS ******/
/**********************/

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


