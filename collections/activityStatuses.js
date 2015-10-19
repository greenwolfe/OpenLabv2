ActivityStatuses = new Meteor.Collection('ActivityStatuses');

Meteor.methods({
  incrementStatus: function(studentID,activityID) {
    check(studentID,Match.idString);
    check(activityID,Match.idString);
    var student = Meteor.users.findOne(studentID);
    if (!student)
      throw new Meteor.Error('studentNotFound','Cannot increment activity status.  Student not found.');
    if (!Roles.userIsInRole(student,'student'))
      throw new Meteor.Error('notStudent','Only students have activity status.');
    var activity = Activities.findOne(activityID);
    if (!activity)
      throw new Meteor.Error('activityNotFound','Cannot increment activity status.  Activity not found.');
    var cU = Meteor.user();
    if (!cU)
      throw new Meteor.Error('notLoggedIn','You must be logged in to increment an activity status.');
    var cUisStudent = Roles.userIsInRole(cU,'student');
    var cUisTeacher = Roles.userIsInRole(cU,'teacher');
    if (!cUisStudent && !cUisTeacher)
      throw new Meteor.Error('notTeacherOrStudent','You must be a teacher or a student to increment an activity status.');
    if (cUisStudent && (cU._id != student._id))
      throw new Meteor.Error('onlyChangeOwnStatus',"Only a teacher can change someone else's activity status.")

    var statuses = ['nostatus','submitted','returned','donewithcomments','done']
    var oldStatus = ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
    var oneMinuteAgo = moment().subtract(1,'minute').toDate();
    var rightNow = new Date();
    if (oldStatus) {
      var status = {increment:oldStatus.increment};
      var i = statuses.indexOf(oldStatus.level);
      doneIndex = statuses.length - 1;
      if (oldStatus.incrementedAt < oneMinuteAgo) status.increment = 1; //going up by default
      if (i == 0) status.increment = 1; //only way to go
      if (cUisTeacher) {
        if (i == doneIndex) { /*DONE*/
          if ((status.increment == 1) && !status.late) {
            status.late = true; //mark as late (can mark as on time again by clicking on late icon)
            status.increment = 0; //and don't increment this time
          } else {
            status.increment = -1; //no where else to go
          } 
        }
      } else if (cUisStudent) {
        if (i == doneIndex) /*DONE*/ status.increment = 0; //once teacher marks as done, student cannot change
        if (i == doneIndex - 1) /*DONEWITHCOMMENTS*/ status.increment = 1; //student can increment from donewithcomments to done, but cannot decrement from here
        if (i == doneIndex - 2) /*RETURNED*/ status.increment = -1; //teacher returned work, so student decrements to indicate they are working on revisions or have submitted them
        if (i == doneIndex - 3) /*SUBMITTED*/ status.increment = -1; //only teacher marks as returned or done
      }
      status.level = statuses[i + status.increment];
      status.incrementedBy = cU._id;
      status.incrementedAt = new Date();
      return ActivityStatuses.update(oldStatus._id,{$set:status});
    } else { //no status exists yet, level has been displayed as 0 by default  
      status = {
        studentID:studentID,
        activityID:activityID,
        unitID: activity.unitID,
        pointsTo: activity.pointsTo,
        level: statuses[1], //First increment sets it to level 1 
        incrementedBy: cU._id,
        incrementedAt: rightNow,
        increment: 1, //+1 or -1 to show direction of latest travel
        late: false,
        tag: '',
      }
      return ActivityStatuses.insert(status);
    }
  },
  //late icon appears at end of increment Status sequence
  //therefore no separate markAsLate method
  //once the late icon is present, clicking on it should call markOnTime
  markOnTime: function(studentID,activityID) {
    check(studentID,Match.idString);
    check(activityID,Match.idString);
    var student = Meteor.users.findOne(studentID);
    if (!student)
      throw new Meteor.Error('studentNotFound','Cannot mark activity on time.  Student not found.');
    if (!Roles.userIsInRole(student,'student'))
      throw new Meteor.Error('notStudent','Only students have activity status.');
    var activity = Activities.findOne(activityID);
    if (!activity)
      throw new Meteor.Error('activityNotFound','Cannot mark activity on time.  Activity not found.');
    var cU = Meteor.user();
    if (!cU)
      throw new Meteor.Error('notLoggedIn','You must be logged in to mark an activity on time.');
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher','You must be a teacher to mark an activity on time.');

    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
    if (!status) 
      throw new Meteor.Error('statusNotFound','There should already be a status if you are trying to mark it as on time.'); 
    
    ActivityStatuses.update(status._id,{$set: {late:false}});
  },
  statusSetTag: function(studentID,activityID,tag) {
    check(studentID,Match.idString);
    check(activityID,Match.idString);
    check(tag,String);
    var student = Meteor.users.findOne(studentID);
    if (!student)
      throw new Meteor.Error('studentNotFound','Cannot designate activity as a reassessment.  Student not found.');
    if (!Roles.userIsInRole(student,'student'))
      throw new Meteor.Error('notStudent','Only students have activity status.');
    var activity = Activities.findOne(activityID);
    if (!activity)
      throw new Meteor.Error('activityNotFound','Cannot designate activity as a reassessment.  Activity not found.');
    var cU = Meteor.user();
    if (!cU)
      throw new Meteor.Error('notLoggedIn','You must be logged in to designate an activity as a reassessment.');
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher','You must be a teacher to designate an activity as a reassessment.');

    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
    var rightNow = new Date();
    if (!status) {
       status = {
        studentID:studentID,
        activityID:activityID,
        unitID: activity.unitID,
        pointsTo: activity.pointsTo,
        level: 'nostatus',  
        incrementedBy: cU._id,
        incrementedAt: rightNow,
        increment: 1, //+1 or -1 to show direction of latest travel
        late: false,
        tag: tag
      }
      Meteor.call('insertTag',tag);
      return ActivityStatuses.insert(status);
    } else {
      Meteor.call('insertTag',tag);
      ActivityStatuses.update(status._id,{$set: {tag:tag}});
    }
  }
})