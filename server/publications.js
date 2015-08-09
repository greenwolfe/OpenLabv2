Meteor.publish('activities',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  /*var userToShow = Meteor.users.findOne(userID);
  var Acts = Activities.find({visible:true});
  if (!userToShow) return Acts;
  if (Roles.userIsInRole(userToShow,'teacher')) 
    return Activities.find();  */
  //check(userID,Match.oneOf(Match.idString,null));
  return Activities.find();
});

Meteor.publish('standards',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  /*var userToShow = Meteor.users.findOne(userID);
  var Acts = Activities.find({visible:true});
  if (!userToShow) return Acts;
  if (Roles.userIsInRole(userToShow,'teacher')) 
    return Activities.find();  */
  //check(userID,Match.oneOf(Match.idString,null));
  return Standards.find();
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

Meteor.publish('categories',function(showHidden) {
  /*if (showHidden) {
    return Units.find();
  } else {
    return Units.find({visible:true});
  }*/
  check(showHidden,Boolean);
  return Categories.find();
});

Meteor.publish('site',function() {
  return Site.find();
});

Meteor.publish('files',function(blockID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(blockID,Match.idString);
  return Files.find({blockID:blockID});
});

//issue with sections - right now sending all of a user's
//sections, even if the student switched sections in the past and has two
//memberships.  How to select also those section walls with content that
//overlaps the time period of the student's past membership
//and only serve those blocks created during that overlap time
//does not arise to the same degree with groups, because the
//group will not tend to continue creating content for other activities
//once it is disolved.  Still should be handled in a similar way
Meteor.publish('walls',function(studentID,activityID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(studentID,Match.Optional(Match.OneOf(Match.idString,null))); 
  check(activityID,Match.idString); 
  studentID = studentID || this.userId; 

  var selector = {};
  var createdFors = [Site.findOne()._id]
  if (Roles.userIsInRole(studentID,'student')) {
    createdFors.push(studentID);
    var studentsGroupSectionIds = _.pluck(Memberships.find({
      memberID:studentID,
      collectionName: {$in: ['Groups','Sections']},
    },{fields: {itemID: 1}}).fetch(), 'itemID');
    createdFors = _.union(createdFors,studentsGroupSectionIds);
  }
  selector.createdFor = {$in: createdFors};
  if (Activities.find({_id:activityID}).count() > 0)
    selector.activityID = activityID;

  return Walls.find(selector);
});

Meteor.publish('columns',function(wallID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(wallID,Match.idString);
  return Columns.find({wallID:wallID});
});

Meteor.publish('blocks',function(columnID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(columnID,Match.idString);
  //if parent, only publish titles (except for text blocks in student wall)
  if (Roles.userIsInRole(this.userId,'parentOrAdvisor')) {
    var column = Columns.findOne(columnID);
    if (!column) return this.ready();
    var wall = Walls.findOne(column.wallID);
    if (!wall) return this.ready();
    if ((wall.type == 'group') || (wall.type == 'section'))
      return this.ready();
    if (wall.type == 'student') 
      return Blocks.find({columnID:columnID,type:'file'});
  }
  //below includes teacher wall for parent
  return Blocks.find({columnID:columnID});
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

Meteor.publish('gradingPeriods',function() {
  return GradingPeriods.find();
})

