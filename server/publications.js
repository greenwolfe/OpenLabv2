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

Meteor.publish('files',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  return Files.find();
});

Meteor.publish('walls',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  return Walls.find();
});

Meteor.publish('columns',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  return Columns.find();
});

Meteor.publish('blocks',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  return Blocks.find();
});

Meteor.publish('activityStatuses',function(studentID,unitID) { 
  check(studentID,Match.Optional(Match.OneOf(Match.idString,null))); 
  studentID = studentID || this.userId;  
  var selector = {}
  if (Roles.userIsInRole(studentID,'student'))
    selector.studentID = studentID;

  check(unitID,Match.Optional(Match.OneOf(Match.idString,null)));
  if (unitID)
    selector.unitID = unitID;

  return ActivityStatuses.find(selector);
});

Meteor.publish('subActivityStatuses',function(studentID,pointsTo){
  check(studentID,Match.Optional(Match.idString)); 
  studentID = studentID || this.userId;  //setting default here because flow router cannot pass in user id
  var selector = {}
  if (Roles.userIsInRole(studentID,'student'))
    selector.studentID = studentID;

  check(pointsTo,Match.Optional(Match.idString));
  if (pointsTo)
    selector.pointsTo = pointsTo;

  return ActivityStatuses.find(selector);  
})

//passing in sectionID and unitID allows initial loading of just enough data to render the visible unit
//passing in just sectionID allows loading workperiods for other units in the background after the first data comes through
//passing in neither allows loading all workperiods for teacher
Meteor.publish('workPeriods',function(sectionID,unitID) { 
  check(sectionID,Match.Optional(Match.OneOf(Match.idString,'',null)));
  var selector = {};
  if (sectionID)
    selector.sectionID = sectionID;

  check(unitID,Match.Optional(Match.idString));
  if (unitID)
    selector.unitID = unitID;

  return WorkPeriods.find(selector);
});

