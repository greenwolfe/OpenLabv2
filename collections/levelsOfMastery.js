LevelsOfMastery = new Meteor.Collection('LevelsOfMastery');

/*
     var LoM = {
      teacherID : Meteor.userId(),
      studentID : studentID,
      activityID : this._id,
      standardID : standardID,
      level : level,
      total: {all:value,gradingPeriodID:value, ... },
      submitted : new Date().getTime(),
      comment : comment,
      visible: true,
      version: version //version of assessment taken
    };   
*/
  
  Meteor.methods({

  /***** POST LoM ****/
  postLoM: function(LoM) { 
    var cU = Meteor.user(); //currentUser
    var activity, standard, LoMId;

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to post a level of mastery");

    if (!LoM.teacherID || (cU._id != LoM.teacherID) || !Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(402, "Only a teacher can post a level of mastery.");

    if (!LoM.hasOwnProperty('studentID'))
      throw new Meteor.Error(402, "Cannot post level of mastery.  Invalid student ID.");
    var student = Meteor.users.findOne(LoM.studentID);
    if (!student || !Roles.userIsInRole(student,'student'))
      throw new Meteor.Error(403, "Cannot post level of mastery.  Invalid student ID.");

    if (!LoM.hasOwnProperty('activityID') || !Activities.findOne(LoM.activityID))
      throw new Meteor.Error(406, "Cannot post level of mastery.  Invalid activity ID.");
    activity = Activities.findOne(LoM.activityID);

    if (!LoM.hasOwnProperty('standardID') || !Standards.findOne(LoM.standardID))
      throw new Meteor.Error(406, "Cannot post level of mastery.  Invalid standard ID.");
    standard = Standards.findOne(LoM.standardID);

    if (!activity.hasOwnProperty('standardIDs') || !_.contains(activity.standardIDs,LoM.standardID))
      throw new Meteor.Error(466, "Cannot post level of mastery.  Indicated standard not assigned to indicated activity.");

    if (!LoM.hasOwnProperty('level')) {
      if (_.isArray(standard.scale)) 
        throw new Meteor.Error(467, "Cannot post level of mastery.  Level must be one of " + standard.scale.join(", ") + ".");
      if (_.isFinite(standard.scale)) 
        throw new Meteor.Error(467, "Cannot post level of mastery. Level must be a number between 0 and " + standard.scale + ".");
      throw new Meteor.Error(467, "Cannot post level of mastery. Invalid level or scale.");
    }
    if (_.isArray(standard.scale) && !_.contains(standard.scale,LoM.level)) 
      throw new Meteor.Error(467, "Cannot post level of mastery.  Level must be one of " + standard.scale.join(", ") + ".");
    if ((_.isFinite(standard.scale)) && (!_.isFinite(LoM.level) || (LoM.level < 0) || (LoM.level > standard.scale)))
      throw new Meteor.Error(467, "Cannot post level of mastery. Level must be a number between 0 and " + standard.scale + ".");

    if (!LoM.hasOwnProperty('submitted'))// || !moment(LoM.submitted,'ddd[,] MMM D YYYY',true).isValid())
      LoM.submitted = new Date().getTime();

    if (!LoM.comment || (LoM.comment == defaultText))
      LoM.comment = '';

    if (!LoM.hasOwnProperty('visible'))
      LoM.visible = true;

    LoMId = LevelsOfMastery.insert(LoM, function(error,id) {
      if (error) return;
      //if (Meteor.isClient) return;  //avoids difficulty simulating mostRecent on the client ... why?
      var newLevel = mostRecent(LoM.standardID,student._id,null);
      if (!newLevel) return;
      if (student.hasOwnProperty('LoMs')) {
        var currentLoM = _.findWhere(student.LoMs,{standardID:LoM.standardID});
        if (currentLoM) {
          Meteor.users.update({_id:student._id,"LoMs.standardID":LoM.standardID},{$set : {"LoMs.$.level":newLevel}});
        } else {
          Meteor.users.update(student._id,{$push: {LoMs: {standardID:LoM.standardID,level:newLevel} }});
        }
      } else {
        Meteor.users.update(student._id,{$push: {LoMs: {standardID:LoM.standardID,level:newLevel} }});
      }
    });

    if (!student.hasOwnProperty('LoMs') && Meteor.isClient)
      Meteor.subscribe('gradesAndStatus',Meteor.userId());
    return LoMId;
  },

  /**** DELETE LoM *****/
  deleteLoM: function(LoMId) {
    var cU = Meteor.user(); //currentUser
    var LoM = LevelsOfMastery.findOne(LoMId);

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to update a level of mastery");
 
    if (!LoM)
      throw new Meteor.Error(412, "Cannnot delete level of mastery.  Invalid ID.");

    if (!LoM.teacherID || (cU._id != LoM.teacherID) || !Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(402, "Only a teacher can delete a level of mastery, and it must be one you posted in the first place.");

    LevelsOfMastery.remove(LoMId, function(error,id) {
      if (error) return;
      var student = Meteor.users.findOne(LoM.studentID);
      if (!student) return;
      var newLevel = mostRecent(LoM.standardID,student._id,null);
      Meteor.users.update({_id:student._id,"LoMs.standardID":LoM.standardID},{$set : {"LoMs.$.level":newLevel}});
    });

    return LoMId;    
  },

  /**** UPDATE LoM *****/
  updateLoM: function(nLoM,updateTime) {
    var cU = Meteor.user(); //currentUser
    var LoM = LevelsOfMastery.findOne(nLoM._id);
    var uT = false; //updateTime

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to update a level of mastery");

    if (!LoM)
      throw new Meteor.Error(412, "Cannnot update level of mastery.  Invalid ID.");

    if (!LoM.teacherID || (cU._id != LoM.teacherID) || !Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(402, "Only a teacher can update a level of mastery, and it must be one you posted in the first place.");

    if (!LoM.hasOwnProperty('activityID') || !Activities.findOne(LoM.activityID))
      throw new Meteor.Error(406, "Cannot update level of mastery.  Invalid activity ID.");
    activity = Activities.findOne(LoM.activityID);

    if (!LoM.hasOwnProperty('standardID') || !Standards.findOne(LoM.standardID))
      throw new Meteor.Error(406, "Cannot update level of mastery.  Invalid standard ID.");
    standard = Standards.findOne(LoM.standardID);

    if (_.isArray(standard.scale) && !_.contains(standard.scale,LoM.level)) 
      throw new Meteor.Error(467, "Cannot post level of mastery.  Level must be one of " + standard.scale.join(", ") + ".");
    if ((_.isFinite(standard.scale)) && (!_.isFinite(LoM.level) || (LoM.level < 0) || (LoM.level > standard.scale)))
      throw new Meteor.Error(467, "Cannot post level of mastery. Level must be a number between 0 and " + standard.scale + ".");
    if (nLoM.hasOwnProperty('level') && (nLoM.level != LoM.level)) {
      LevelsOfMastery.update(nLoM._id,{$set: {level: nLoM.level}}, function(error,id) {
        if (error) return;
        //if (Meteor.isClient) return; //avoids difficulty simulating mostRecent on the client ... why?
        var student = Meteor.users.findOne(LoM.studentID);
        if (!student) return;
        var newLevel = mostRecent(LoM.standardID,student._id,null);
        Meteor.users.update({_id:student._id,"LoMs.standardID":LoM.standardID},{$set : {"LoMs.$.level":newLevel}});
      });
      uT = updateTime;
    }

    if (nLoM.hasOwnProperty('comment') && (nLoM.comment != LoM.comment)) {
      LevelsOfMastery.update(nLoM._id,{$set: {comment: nLoM.comment}});
      uT = updateTime;
    }

    if (nLoM.hasOwnProperty('visible') && (nLoM.visible != LoM.visible)) {
      LevelsOfMastery.update(nLoM._id,{$set: {visible: nLoM.visible}});
      uT = updateTime;
    }

    if ( nLoM.hasOwnProperty('version') && 
      !( LoM.hasOwnProperty('version') ||
         (LoM.hasOwnProperty('version') && (nLoM.version != LoM.version)) )) {
      LevelsOfMastery.update(nLoM._id,{$set: {version: nLoM.version}});
      uT = updateTime;
    }

    if (uT)
      LevelsOfMastery.update(nLoM._id,{$set: {submitted: new Date().getTime()}});

    return LoM._id;    
  }

});

//warning .. duplicated in /server/fixtures.js to convert from
//old system to new system where most recent LoMs are stored in
//the user object ... should not be needede
var mostRecent = function(standardID,studentID,activityID) { //expand to activtyID as well
  var selector = {
    standardID: standardID,
    studentID: studentID,
    visible: true
  };
  if (activityID)
    selector.activityID = activityID;
  LoM = LevelsOfMastery.find(selector,
                             {sort:[["submitted","desc"]]},
                             {limit:1}).fetch();
  return (LoM.length) ? LoM[0].level : null;
};

//pseudocode
//var currentLoM = function(standardID,studentID,activityID) {
//  var selector = {
//    standardID: standardId,
//    studentID:  studentID,
//    visible: true
//  };
//  if (activityID)
//    selector.activityID = activityID;
//  var standard = Standards.findOne(standardID)
//  if standard.calcMethod = 'mostRecent'
//    LoM = as above
//    return ... as above
//  else if standard.calcMethod = 'minimum'
//    var LoMs = LevelsOfMastery.find(selector).fetch();
//    length check and return null if no length
//    get scale as array or numerical value
//    LoM = 0;
//    LoMs.forEach(function(L) {
//      LoM = min(LoM,L.level ... converted by scale as necessary)
//    })
//    return LoM
//  else if standard.calcMethod = 'average'
//    as above except add instead of check for min in the each loop
//    return the average
//    
//                               
//}
//  ****** best method? *****
// or as mostRecent above but with no limit on the find.
// then LoMs = ... exactly as above
//  if null return
//  LoM = LoM[0].level
//   if  standard.calcMethod = mostRecent, return LoM
//  go through forEach and keep min or calc average according to standard.calcMethod
//  return LoM
//  ***** even better? ****
//  variation ... extract array of levels from LoMs ... get straight from find?
//  call function of array according to calc Method and return result

var mostRecentLoMs = function(Activity,studentID) {
  var LoMs = {};
  Activity.standardIDs.forEach(function(standardID) {
    LoMs[standardID] = mostRecent(standardID,studentID,Activity._id);
  });
  return LoMs;
}





//collection hook, on create or update computes average
//for user according to the method, and makes it part of 
//every LoM, that way its available whenever needed
//do I even need a collection hook if it never gets set
//any other way?