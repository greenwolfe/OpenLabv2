Meteor.publish('activities',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  /*var userToShow = Meteor.users.findOne(userID);
  var Acts = Activities.find({visible:true});
  if (!userToShow) return Acts;
  if (Roles.userIsInRole(userToShow,'teacher')) 
    return Activities.find();  */
  //check(userID,Match.oneOf(Match.idString,null));
  return Activities.find();
});

Meteor.publish('units',function(showHidden) {
  /*if (showHidden) {
    return Units.find();
  } else {
    return Units.find({visible:true});
  }*/
  check(showHidden,Boolean);
  return Units.find();
});

Meteor.publish('site',function() {
  return Site.find();
});

