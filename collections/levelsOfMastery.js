LevelsOfMastery = new Meteor.Collection('LevelsOfMastery');

Meteor.methods({

  /***** INSERT LoM ****/
  insertLoM: function(LoM) { 
    check(LoM,{
      studentID: Match.idString,
      standardID: Match.idString,
      level: Match.OneOf(Match.nonEmptyString,Number),

      assessmentID: Match.Optional(Match.idString), //blockID for an assessment block on which this standard appears
      comment: Match.Optional(String),
      version: Match.Optional(String),

      /* not passed in, will be filled automatically
      teacherID: Match.idString,
      average: Match.ObjectIncluding{ // {schoolyear:value,gradingPeriodID:value, ... }
        schoolyear: Match.OneOf(Match.nonEmptyString,Number)
      },
      submitted: Date,
      copiedAndPasted: Match.OneOf(Date,null),
      activityID: Match.Optional(Match.idString), // denormalized value filled in from a block on that activity page
      visible: true
      */
    })
    LoM.assessmentID = LoM.assessmentID || null;
    LoM.comment = LoM.comment || '';
    LoM.version = LoM.version || null;
    LoM.submitted = new Date();
    LoM.copiedAndPasted = null; 
    LoM.visible = true;
    //total will be calculated below after this LoM is created

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to post a level of mastery.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can grade a student.')
    LoM.teacherID = cU._id;

    var student = Meteor.users.findOne(LoM.studentID);
    if (!student || !Roles.userIsInRole(student,'student'))
      throw new Meteor.Error('notAStudent', "Cannot post level of mastery.  Invalid student ID.");

    var standard = Standards.findOne(LoM.standardID);
    if (!standard)
      throw new Meteor.Error('invalidStandardID', "Cannot post level of mastery.  Invalid standard ID.");

    if (_.isArray(standard.scale) && !_.contains(standard.scale,LoM.level)) 
      throw new Meteor.Error('invalidLevel', "Cannot post level of mastery.  Level must be one of " + standard.scale.join(", ") + ".");
    if (_.isNumber(standard.scale)) {
      LoM.level = (_.isNumber(LoM.level)) ? LoM.level : _.str.toNumber(LoM.level,3);
      if ((!_.isFinite(LoM.level) || (LoM.level < 0) || (LoM.level > standard.scale)))
      throw new Meteor.Error('levelOutOfRange', "Cannot post level of mastery. Level must be a number between 0 and " + standard.scale + ".");
    }

    if (LoM.assessmentID) {
      var assessmentBlock = Blocks.findOne(LoM.assessmentID);
      if (!assessmentBlock)
        throw new Meteor.Error('invalidAssessmentID','Cannot post level of mastery.  Invalid assessment (block) ID.');
      LoM.activityID = assessmentBlock.activityID; 
      var activity = Activities.findOne(LoM.activityID); //could be null if no activity passed  
      if (!activity)
        throw new Meteor.Error('invalidActivityID','Cannot post level of mastery.  Invalid activity ID.');
    } else {
      LoM.activityID = null;
    }
    //review this and put in a check (maybe?) once a standards wall or block is created in the activity pages
    //if (!activity.hasOwnProperty('standardIDs') || !_.contains(activity.standardIDs,LoM.standardID))
    //  throw new Meteor.Error(466, "Cannot post level of mastery.  Indicated standard not assigned to indicated activity.");

    var LoMId = LevelsOfMastery.insert(LoM, function(error,id) {
      if (error) return;
      //if (Meteor.isClient) return;  //is this needed? ... avoids difficulty simulating mostRecent on the client ... why?
      Meteor.updateLoMaverages(id);
    });

    return LoMId;
  },

  /**** DELETE LoM *****/
  deleteLoM: function(LoMId) {
    check(LoMId,Match.idString);
    var cU = Meteor.user(); //currentUser
    var LoM = LevelsOfMastery.findOne(LoMId);

    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a level of mastery");
 
    if (!LoM)
      throw new Meteor.Error('invalidID', "Cannnot delete level of mastery.  Invalid ID.");

    if (!LoM.teacherID || (cU._id != LoM.teacherID) || !Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notPostingTeacher', "Only a teacher can delete a level of mastery, and it must be one you posted in the first place.");

    LevelsOfMastery.remove(LoMId, function(error,id) {
      if (error) return;
      //if (Meteor.isClient) return;  //is this needed? ... avoids difficulty simulating mostRecent on the client ... why?
      Meteor.updateLoMaverages(LoM);
    });

    return LoMId;    
  },

  /**** UPDATE LoM *****/

  /* list of properties of LoM object and where/how set

  studentID: Match.idString, //not reset ... level of mastery cannot transfer form student to student
  standardID: Match.idString, //not reset ...
  *level: Match.Optional(Match.OneOf(Match.nonEmptyString,Number)), // see method below, requires additional checks to be sure its consistent with the scale set by the standard
  activityID: Match.idString, //not reset ...
  *comment: Match.Optional(String), //see method below
  *version: Match.Optional(String), //see method below
  teacherID: Match.idString, //not reset
  average: Match.Optional(Match.OneOf(Match.nonEmptyString,Number)), //auto calculated from level values, ignored if passed in
  submitted: Date, //not reset ... to change the date, teacher should copy the comment, delete the old comment and submit a new one
  visible:  Match.Optional(Boolean), //set by show/hide methods
  */

  updateLevelOfMastery: function(LoM) {
    check(LoM,{
      _id: Match.idString,
      level: Match.Optional(Match.OneOf(Match.nonEmptyString,Number)),
      comment: Match.Optional(String),
      version: Match.Optional(String),
      copiedAndPasted: Match.Optional(Date)
    })
    var cU = Meteor.user(); //currentUser
    var originalLoM = LevelsOfMastery.findOne(LoM._id);

    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a level of mastery");
 
    if (!originalLoM)
      throw new Meteor.Error('invalidID', "Cannnot update level of mastery.  Invalid ID.");

    if (!originalLoM.teacherID || (cU._id != originalLoM.teacherID) || !Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notPostingTeacher', "Only a teacher can update a level of mastery, and it must be one you posted in the first place.");

    if ('level' in LoM) { 
      var standard = Standards.findOne(originalLoM.standardID);
      if (!standard)
        throw new Meteor.Error('invalidStandard', "Cannot update level of mastery.  Invalid standard ID.");

      if (_.isNumber(standard.scale)) 
        LoM.level = (_.isNumber(LoM.level)) ? LoM.level : _.str.toNumber(LoM.level,3);
      if (LoM.level != originalLoM.level) {
        if (_.isArray(standard.scale) && !_.contains(standard.scale,LoM.level)) 
          throw new Meteor.Error('invalidLevel', "Cannot post level of mastery.  Level must be one of " + standard.scale.join(", ") + ".");
        if ((_.isFinite(standard.scale)) && (!_.isFinite(LoM.level) || (LoM.level < 0) || (LoM.level > standard.scale)))
          throw new Meteor.Error('levelOutOfRange', "Cannot post level of mastery. Level must be a number between 0 and " + standard.scale + ".");

        LevelsOfMastery.update(LoM._id,{$set: {level:LoM.level}}, function(error,num) {
          if (error) return;
          //if (Meteor.isClient) return;  //is this needed? ... avoids difficulty simulating mostRecent on the client ... why?
          Meteor.updateLoMaverages(LoM._id);        
        })
      }
    }

    if (('comment' in LoM) && (LoM.comment != originalLoM.comment)) {
      LevelsOfMastery.update(LoM._id,{$set: {comment:LoM.comment}});
    }

    if (('version' in LoM) && (LoM.version != originalLoM.version)) {
      LevelsOfMastery.update(LoM._id,{$set: {version:LoM.version}});      
    }

    if (('copiedAndPasted' in LoM) && (LoM.copiedAndPasted != originalLoM.copiedAndPasted)) {
      LevelsOfMastery.update(LoM._id,{$set: {copiedAndPasted:LoM.copiedAndPasted}});      
    }

    return LoM._id;    
  }

});

  /*********************/
 /****  UTILITIES  ****/
/*********************/

//pass in id of a newly inserted or modified level of mastery
//calculates average values for school year and each grading period
//according to the calculation method and scale for the associated standard
//and attaches them to all of the LoMs for this standard and this student
Meteor.updateLoMaverages = function(LoMorID) {
  var LoM = (_.isObject(LoMorID)) ? LoMorID : LevelsOfMastery.findOne(LoMorID);
  var standard = Standards.findOne(LoM.standardID);
  var selector = {
    studentID: LoM.studentID,
    standardID: LoM.standardID,
    visible: true
  }
  var LoMs = LevelsOfMastery.find(selector,{fields:{level:1,submitted:1}}).fetch();
  //sort with most recent first
  LoMs.sort(function(L1,L2) { return (L2.submitted > L1.submitted) });

  //find new average value for school year for this student
  var IDs = LoMs.map(function(thisLoM) {
    return thisLoM._id
  });
  var levels = LoMs.map(function(thisLoM) {
    return thisLoM.level;
  });
  var average = {schoolyear: Meteor.getLoMaverage(standard,levels)};

  //filter and find values for each grading period
  GradingPeriods.find().forEach(function(gradingPeriod) {
    var levels = LoMs.reduce(function(levelsThisGP,thisLoM) {
      if ((gradingPeriod.startDate < thisLoM.submitted) && (thisLoM.submitted < gradingPeriod.endDate))
        levelsThisGP.push(thisLoM.level);
      return levelsThisGP
    },[]);
    average[gradingPeriod._id] = Meteor.getLoMaverage(standard,levels);
  });

  //update average field for all LoMs
  LevelsOfMastery.update({_id: {$in: IDs}}, {$set: {average:average}}, {multi: true});
}

Meteor.getLoMaverage = function(standard,levels) {
  //levels must be sorted most recent first in order for these functions to work properly
  var calcMethod = standard.calcMethod.split(/[0-9]/)[0]; 
  var calcParam = _.str.toNumber(_.str.strRight(standard.calcMethod,calcMethod)); 
  return calcAverageUsing[calcMethod](calcParam,standard.scale,levels);
}

var calcAverageUsing = {
  mostRecent: function(p,scale,levels) { //p not used, should be null
    return (levels.length > 0) ? levels[0] : null;
  },
  average: function(p,scale,levels) { //average of most recent p marks, or all marks if p is null
    if (levels.length == 0) return null;
    if (levels.length == 1) return levels[0];
    var numericalLevels = levels;
    if (_.isArray(scale)) 
      numericalLevels = levels.map(function(level) { return scale.indexOf(level)} );
    p = p || levels.length;
    var total = numericalLevels.reduce(function(t,L,i) { return (i < p) ? t + L : t },0);
    var average = total/Math.min(p,levels.length);
    if (_.isArray(scale)) {
      average = Math.round(average);
      average = Math.max(average,0);
      average = Math.min(average,scale.length - 1);
      return scale[average];
    } else {
      return average;
    }
  },
  decayingAverage: function(p,scale,levels) { //p% of the most recent mark + (100-p)% of the average of all past marks
    if (levels.length == 0) return null;
    if (levels.length == 1) return levels[0];
    var numericalLevels = levels;
    if (_.isArray(scale)) 
      numericalLevels = levels.map(function(level) { return scale.indexOf(level)} );
    var pastTotal = numericalLevels.reduce(function(t,L,i) { return (i > 0) ? t + L : t },0);
    var pastAverage = pastTotal/(levels.length - 1);
    var average = (numericalLevels[0]*p + pastAverage*(100-p))/100;
    if (_.isArray(scale)) {
      average = Math.round(average);
      average = Math.max(average,0);
      average = Math.min(average,scale.length - 1);
      return scale[average];
    } else {
      return average;
    }
  }
}

   /****************/
  /**** HOOKS *****/
 /****************/
 
LevelsOfMastery.after.update(function (userID, doc, fieldNames, modifier) {
  if (doc.visible != this.previous.visible) 
    Meteor.updateLoMaverages(doc);
});