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

Meteor.publish('calendarEvents',function(userOrSectionID) {
  check(userOrSectionID,Match.idString);
  var participantList = [];
  var site = Site.findOne();
  if (site)
    participantList.push(site._id);
  if (Meteor.users.find(userOrSectionID).count()) { 
    participantList.push(userOrSectionID);
    var sectionID = Meteor.currentSectionId(userOrSectionID);
    if (sectionID)
      participantList.push(sectionID);
    //if teacher viewing as self, include events for whole sections as well
    if (Roles.userIsInRole(this.userId,'teacher') && (this.userId == userOrSectionID)) {
      var sectionIds = _.pluck(Sections.find({},{fields:{_id:1}}).fetch(),'_id');
      participantList = _.union(participantList,sectionIds);
    }
  } else if (Sections.find(userOrSectionID).count() && (Roles.userIsInRole(this.userId,['teacher','parentOrAdvisor']))) {
    participantList.push(userOrSectionID);
    //if teacher viewing single section, include events for all students in that section    
    if (Roles.userIsInRole(this.userId,'teacher'))
      participantList = _.union(participantList,Meteor.sectionMemberIds(userOrSectionID));
  }

  return CalendarEvents.find({participants: {$in: participantList}});
})

Meteor.publish('calendarInvitations',function(userID) {
  check(userID,Match.idString);
  return CalendarEvents.find({invite: {$in:[userID]}});
})

Meteor.publish('todos',function(calendarEventID) {
  check(calendarEventID,Match.idString);
  return Todos.find({calendarEventID:calendarEventID});
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

Meteor.publish('openlabPagePubs',function(studentIDs) {
  check(studentIDs,[Match.idString]);
  var studentIDs = studentIDs.filter(function(studentID) {
    return Roles.userIsInRole(studentID,'student');
  });
  if (Roles.userIsInRole(this.userId,'student'))
    studentIDs.push(this.userId);
  var isNotTeacher = !Roles.userIsInRole(this.userId,'teacher');


  //activity status and progress
  if (studentIDs.length == 0) { //return nothing
    var statusProgressSelector = {_id:'none'};
  } else {
    var statusProgressSelector = {studentID:{$in:studentIDs}};
  }

  //levels of mastery
  if (studentIDs.length == 0) { //return nothing
    var LoMSelector = {_id:'none'};
  } else {
    var LoMSelector = {studentID:{$in:studentIDs}};
    if (isNotTeacher)
      LoMSelector.visible = true; //send only visible LoMs
  }

  //calendar events
  //loaded one user at a time in calendar.js

  return [
    ActivityStatuses.find(statusProgressSelector),
    ActivityProgress.find(statusProgressSelector),
    LevelsOfMastery.find(LoMSelector)
  ];
})

/* send initial wall, column, block and file information
   as well as subactivityStatuses, subactivityProgresses
   with initial page info
   (note all activities, tags, standards and workperiods loaded at site level)
   Call with increasingly longer student list to load for all students in background once initial page loads
*/
//for later ... more limited publish/subscribe for memberships and groups ??
Meteor.publish('activityPagePubs',function(studentOrSectionIDs,activityID) {
  check(studentOrSectionIDs,[Match.idString]); 
  check(activityID,Match.idString);
  var studentIDs = studentOrSectionIDs.filter(function(studentID) {
    return Roles.userIsInRole(studentID,'student');
  });
  if (Roles.userIsInRole(this.userId,'student'))
    studentIDs.push(this.userId);
  var sectionIDs = studentOrSectionIDs.filter(function(sectionID) {
    return Sections.find(sectionID,{limit:1}).count();
  });
  var isNotTeacher = !Roles.userIsInRole(this.userId,'teacher');

  //walls
  var selector = {};
  var createdFors = [Site.findOne()._id]
  studentIDs.forEach(function(studentID) {
    createdFors.push(studentID);
    var studentsGroupSectionIds = _.pluck(Memberships.find({
      memberID:studentID,
      collectionName: {$in: ['Groups','Sections']},
    },{fields: {itemID: 1}}).fetch(), 'itemID');
    createdFors = _.union(createdFors,studentsGroupSectionIds);
  });
  sectionIDs.forEach(function(sectionID) {
    //create section walls for this activity
    createdFors.push(sectionID);
  });
  selector.createdFor = {$in: createdFors};
  if (Activities.find({_id:activityID},{limit:1}).count() > 0)
    selector.activityID = activityID;
  if (isNotTeacher)
    selector.visible = true; //send only visible walls
  var wallIds = _.pluck(Walls.find(selector,{fields:{_id:1}}).fetch(),'_id');

  //columns,just return all columns for all walls, nothing more to do

  //blocks
  var blockSelector = {};
  //if parent, only publish locks in teacher wall and some blocks in student wall)
  if (Roles.userIsInRole(this.userId,'parentOrAdvisor')) {
    studentWallIds = wallIds.filter(function(wallID) { 
      var wall = Walls.findOne(wallID);
      return ((wall) && (wall.type == 'student'));
    })
    teacherWallIds = wallIds.filter(function(wallID) { 
      var wall = Walls.findOne(wallID);
      return ((wall) && (wall.type == 'teacher'));
    })
    blockSelector = {$or: [
      {wallID:{$in:studentWallIds},type:{$in:['file','assessment','text']}},
      {wallID:{$in:teacherWallIds}}
    ]}
  } else {
    blockSelector.wallID = {$in:wallIds};
  }

  //files,just return all files for all walls, nothing more to do
  //parents not given live link to student files (but could ferret out file URL if clever and uses the console?),
  //doesn't see blocks on section/group walls anyway

  //activity status and progress
  if (studentIDs.length == 0) { //return nothing
    var statusProgressSelector = {_id:'none'};
  } else {
    var statusProgressSelector = {studentID:{$in:studentIDs}};
    if (Activities.find({_id:activityID},{limit:1}).count() > 0)
      statusProgressSelector.pointsTo = activityID;
  }

  //levels of mastery
  if (studentIDs.length == 0) { //return nothing
    var LoMSelector = {_id:'none'};
  } else {
    var LoMSelector = {studentID:{$in:studentIDs}};
    if (isNotTeacher)
      LoMSelector.visible = true; //send only visible LoMs
  }

  return [
    Walls.find(selector),
    Columns.find({wallID:{$in:wallIds}}),
    Blocks.find(blockSelector,{fields:{text:0}}),
    Files.find({wallID:{$in:wallIds}}),
    ActivityStatuses.find(statusProgressSelector),
    ActivityProgress.find(statusProgressSelector),
    LevelsOfMastery.find(LoMSelector)
  ];
});

Meteor.publish('blockText',function(blockID) {
  check(blockID,Match.idString);
  var block = Blocks.findOne(blockID);
  if (!block)
    throw new Meteor.Error('blockNotFound','Cannot publish text field.  Block not found.');
  var wall = Walls.findOne(block.wallID);
  if (!wall)
    throw new Meteor.Error('wallNotFound','Cannot publish text field.  Wall not found.')

  //if parent, only publish blocks in teacher wall and some blocks in student wall)
  if (Roles.userIsInRole(this.userId,'parentOrAdvisor')) {
    if (!_.contains(['teacher','student'],wall.type))
      return this.ready();  //return empty cursor
    if (wall.type == 'student') {
      if (!_.contains(['file','assessment','text'],block.type))
        return this.ready(); 
    }
  }

  return Blocks.find(blockID,{fields:{text:1}});
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

//to provide teacher with access to a list of current groups for the activity page
Meteor.publish('groupWalls',function(activityID) {
  check(activityID,Match.idString);
  var activity = Activities.findOne(activityID);
  if (!activity) return this.ready();
  if (!Roles.userIsInRole(this.userId,'teacher')) return this.ready();
  return Walls.find({type:'group',activityID:activity.pointsTo});
});

var currentWallIds = function(studentOrSectionID,activityID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  var studentID = studentOrSectionID || Meteor.userId(); 

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

  return _.pluck(Walls.find(selector,{fields:{_id:1}}).fetch(),'_id');
};

Meteor.publish('columns',function(studentOrSectionID,activityID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(studentOrSectionID,Match.Optional(Match.OneOf(Match.idString,null))); 
  check(activityID,Match.idString); 
  var wallIds = currentWallIds(studentOrSectionID,activityID);
  return Columns.find({wallID:{$in:wallIds}});
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

//deprecated if subscribing to all activities at site default level
Meteor.publish('assessmentSubactivity',function(activityID) {
  check(activityID,Match.idString);
  if (Roles.userIsInRole(this.userId,'teacher')) {
    return Activities.find({_id:activityID});
  }  
});

Meteor.publish('blocks',function(studentOrSectionID,activityID)  {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(studentOrSectionID,Match.Optional(Match.OneOf(Match.idString,null))); 
  check(activityID,Match.idString); 
  var wallIds = currentWallIds(studentOrSectionID,activityID);
  //if parent, only publish titles (except for text blocks in student wall)
  if (Roles.userIsInRole(this.userId,'parentOrAdvisor')) {
    studentWallIds = wallIds.filter(function(wallID) { 
      var wall = Walls.findOne(wallID);
      return ((wall) && (wall.type == 'student'));
    })
    teacherWallIds = wallIds.filter(function(wallID) { 
      var wall = Walls.findOne(wallID);
      return ((wall) && (wall.type == 'teacher'));
    })
    return Blocks.find({$or: [
      {wallID:{$in:studentWallIds},type:{$in:['file','assessment','text']}},
      {wallID:{$in:teacherWallIds}}
    ]});
  }
  return Blocks.find({wallID:{$in:wallIds}});
});

Meteor.publish('files',function(studentOrSectionID,activityID) {  //change to user or section ID in order to generate summary page for whole activity and section ... later!
  check(studentOrSectionID,Match.Optional(Match.OneOf(Match.idString,null))); 
  check(activityID,Match.idString); 
  var wallIds = currentWallIds(studentOrSectionID,activityID);
  return Files.find({wallID:{$in:wallIds}});
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

Meteor.publish('tags',function() {
  return Tags.find()
})

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

  check(unitID,Match.Optional(Match.OneOf(Match.idString,'',null)));
  if (unitID)
    selector.unitID = unitID;

  return WorkPeriods.find(selector);
});

Meteor.publish('gradingPeriods',function() {
  return GradingPeriods.find();
})

