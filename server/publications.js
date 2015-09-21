Meteor.publish('activities',function() {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  /*var userToShow = Meteor.users.findOne(userID);
  var Acts = Activities.find({visible:true});
  if (!userToShow) return Acts;
  if (Roles.userIsInRole(userToShow,'teacher')) 
    return Activities.find();  */
  //check(userID,Match.oneOf(Match.idString,null));
  return Activities.find();
});

Meteor.publish('standards',function() {  
  return Standards.find();
});

Meteor.publish('calendarEvents',function(userID) {
  check(userID,Match.idString);
  return CalendarEvents.find({group: {$in: [userID]}});
})

Meteor.publish('levelsOfMastery',function(standardOrCategoryID,studentID,activityID) {
  check(standardOrCategoryID,Match.OneOf(Match.idString,[Match.idString],null));
  check(studentID,Match.OneOf(Match.idString,null));
  check(activityID,Match.OneOf(Match.idString,null));
  if (!standardOrCategoryID && !studentID && !activityID)
    return this.ready();

  var selector = {}
  if (standardOrCategoryID) {
    if (_.isArray(standardOrCategoryID) && standardOrCategoryID.length > 0) {
      selector.standardID = {$in: standardOrCategoryID};
    } else {
      var standard = Standards.findOne(standardOrCategoryID);
      if (standard) {
        selector.standardID = standardOrCategoryID;
      } else {
        var category = Categories.findOne(standardOrCategoryID);
        if (category) {
          var standardIds = _.pluck(Standards.find({categoryID:standardOrCategoryID},{fields:{_id:1}}).fetch(),'_id');
          if (standardIds.length > 0)
            selector.standardID = {$in:standardIds};
        }
      }
    }
  }

  if (studentID)
    selector.studentID = studentID;
  if (activityID)
    selector.activityID = activityID;
  if (!Roles.userIsInRole(this.userId,'teacher'))
    selector.visible = true; //return only visible items
  return LevelsOfMastery.find(selector);
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
Meteor.publish('walls',function(studentOrSectionID,activityID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(studentOrSectionID,Match.Optional(Match.OneOf(Match.idString,null))); 
  check(activityID,Match.idString); 
  var studentID = studentOrSectionID || this.userId; 

  var selector = {};
  var createdFors = [Site.findOne()._id]
  if (Roles.userIsInRole(studentID,'student')) {
    createdFors.push(studentID);
    var studentsGroupSectionIds = _.pluck(Memberships.find({
      memberID:studentID,
      collectionName: {$in: ['Groups','Sections']},
    },{fields: {itemID: 1}}).fetch(), 'itemID');
    createdFors = _.union(createdFors,studentsGroupSectionIds);
  } else { //check if section selected without selecting a student 
    var section = Sections.findOne(studentOrSectionID);
    if (section)
      createdFors.push(studentOrSectionID);
  }
  selector.createdFor = {$in: createdFors};
  if (Activities.find({_id:activityID}).count() > 0)
    selector.activityID = activityID;

  return Walls.find(selector);
});

Meteor.publish('groupWalls',function(activityID) {
  check(activityID,Match.idString);
  var activity = Activities.findOne(activityID);
  if (!activity) return this.ready();
  if (!Roles.userIsInRole(this.userId,'teacher')) return this.ready();
  return Walls.find({type:'group',activityID:activity.pointsTo});
});

Meteor.publish('columns',function(wallID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(wallID,Match.idString);
  return Columns.find({wallID:wallID});
});

Meteor.publish('assessment',function(assessmentID){
  check(assessmentID,Match.idString);
  if (Roles.userIsInRole(this.userId,'teacher')) {
    return Blocks.find({_id:assessmentID});
  } //else if teacher or student ?
  //this was intended to load the single assessment for the assessment page
  //which currently is intended only for the teacher to grade the assessment is not
  //supposed to be visible to parents or students.  
});

Meteor.publish('assessmentSubactivity',function(activityID) {
  check(activityID,Match.idString);
  if (Roles.userIsInRole(this.userId,'teacher')) {
    return Activities.find({_id:activityID});
  }  
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

Meteor.publish('activityProgress',function(studentID,unitID) { 
  check(studentID,Match.Optional(Match.OneOf(Match.idString,null))); 
  studentID = studentID || this.userId;  
  var selector = {}
  if (Roles.userIsInRole(studentID,'student'))
    selector.studentID = studentID;

  check(unitID,Match.Optional(Match.OneOf(Match.idString,null)));
  if (unitID)
    selector.unitID = unitID;

  return ActivityProgress.find(selector);
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

Meteor.publish('subActivityProgress',function(studentID,pointsTo){
  check(studentID,Match.Optional(Match.idString)); 
  studentID = studentID || this.userId;  //setting default here because flow router cannot pass in user id
  var selector = {}
  if (Roles.userIsInRole(studentID,'student'))
    selector.studentID = studentID;

  check(pointsTo,Match.Optional(Match.idString));
  if (pointsTo)
    selector.pointsTo = pointsTo;

  return ActivityProgress.find(selector);  
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

