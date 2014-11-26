Accounts.config({
  loginExpirationInDays: null
});

/* assign student role to user if is not already teacher */
/* called by wrapper to Accounts.createUser in /client/helpers */
/*  so all new users are assigned student role */
Meteor.methods({
  enrollStudent: function(userID) {
    var currentUserId = Meteor.userId();
    if ( !(currentUserId && (userID == currentUserId)) ) {
      throw new Meteor.Error(401, "Cannot Enroll as Student");
    };
    if (!Roles.userIsInRole(userID,['teacher','student'])) {
      Roles.addUsersToRoles(userID,['student']);
    }; 
  }
});






