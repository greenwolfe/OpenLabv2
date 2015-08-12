ActivityProgress = new Meteor.Collection('ActivityProgress')

Meteor.methods({
  incrementProgress: function(studentID,activityID) {
    check(studentID,Match.idString);
    check(activityID,Match.idString);
    var student = Meteor.users.findOne(studentID);
    if (!student)
      throw new Meteor.Error('studentNotFound','Cannot increment activity progress.  Student not found.');
    if (!Roles.userIsInRole(student,'student'))
      throw new Meteor.Error('notStudent','Only students have activity progress.');
    var activity = Activities.findOne(activityID);
    if (!activity)
      throw new Meteor.Error('activityNotFound','Cannot increment activity progress.  Activity not found.');
    var cU = Meteor.user();
    if (!cU)
      throw new Meteor.Error('notLoggedIn','You must be logged in to increment activity progress.');
    var cUisStudent = Roles.userIsInRole(cU,'student');
    var cUisTeacher = Roles.userIsInRole(cU,'teacher');
    if (!cUisStudent && !cUisTeacher)
      throw new Meteor.Error('notTeacherOrStudent','You must be a teacher or a student to increment activity progress.');
    if (cUisStudent && (cU._id != student._id))
      throw new Meteor.Error('onlyChangeOwnProgress',"Only a teacher can change someone else's activity progress.")

    var progresses = ['notStarted','oneBar','twoBars','threeBars','fourBars','fiveBars']
    var progress = ActivityProgress.findOne({studentID:studentID,activityID:activityID});
    var oneMinuteAgo = moment().subtract(1,'minute').toDate();
    var rightNow = new Date();
    if (progress) {
      var i = progresses.indexOf(progress.level);
      doneIndex = progresses.length - 1;
      if (progress.incrementedAt < oneMinuteAgo) progress.increment = 1; //going up by default
      if (i == 0) progress.increment = 1; //only way to go
      if (i == doneIndex)  /*DONE*/
        progress.increment = -1; //no where else to go
      progress.level = progresses[i + progress.increment];
      progress.incrementedBy = cU._id;
      progress.incrementedAt = new Date();
      ActivityProgress.update(progress._id,progress);
    } else { //no progress exists yet, level has been displayed as 0 by default  
      progress = {
        studentID:studentID,
        activityID:activityID,
        unitID: activity.unitID,
        pointsTo: activity.pointsTo,
        level: progresses[1], //First increment sets it to level 1 
        incrementedBy: cU._id,
        incrementedAt: rightNow,
        increment: 1, //+1 or -1 to show direction of latest travel
      }
      return ActivityProgress.insert(progress);
    }
  }
})