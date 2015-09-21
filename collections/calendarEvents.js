CalendarEvents = new Meteor.Collection('CalendarEvents');

Meteor.methods({

  /***** INSERT CALENDAREVENT ****/
  insertCalendarEvent: function(calendarEvent) {
    check(calendarEvent,{
      //required fields to create the new calendar event
      activityID: Match.OneOf(Match.idString,null),
      date: Date,
      group: [Match.idString], //contains userIDs, sectionIDs, or siteID
      invite: [Match.idString], //contains only userIDs
                                //only a teacher would invite the entire section or all students, in which case the event should 
                                //show up in the calendar with no chance to decline and no need to accept an invitation
      workplace: Match.OneOf('OOC','FTF','HOM'),

      title: Match.Optional(Match.nonEmptyString), //must be present if activityID is null, otherwise filled from activity
      note: Match.Optional(String), 
      startTime: Date,
      endTime: Date,
      nameOfTimePeriod: Match.Optional(String)

      /*fields that will be initially filled based on the information passed in
      createdBy: Match.idString,              //current user
      createdOn: Match.Optional(Date),            //today's date
      modifiedBy: Match.Optional(Match.idString), //current user
      modifiedOn: Match.Optional(Date),           //current date
      visible: Match.Optional(Boolean),           //true
      */
    });

    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a calendar event.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new calendar events.");
    if (!Roles.userIsInRole(cU,['student','teacher']))
      throw new Meteor.Error('notStudentOrTeacher','Only teachers and students may post events to the calendar.'); 
    //if student, check if frozen

    calendarEvent.createdBy = cU._id;
    calendarEvent.modifiedBy = cU._id;
    var today = new Date();
    calendarEvent.createdOn = today;
    calendarEvent.modifiedOn = today;
    calendarEvent.visible = true;
    if (!('note' in calendarEvent))
      calendarEvent.note = '';
    if (!('nameOfTimePeriod' in calendarEvent))
      calendarEvent.nameOfTimePeriod = '';

    if (!calendarEvent.activityID && !('title' in calendarEvent)) {
      throw new Meteor.Error('mustHaveTitle','Cannot post calendar event.  Must have a valid activityID or title');
    } else {
      var activity = Activities.findOne(calendarEvent.activityID);
      if (!activity)
        throw new Meteor.Error('invalidActivity','Cannot post calendar event.  Invalid activity ID.');
      calendarEvent.title = activity.title;
    }

    //group list contains valid users (students or teachers), sections or site
    calendarEvent.group.forEach(function(ID) {
      var studentOrTeacher = Meteor.users.findOne(ID);
      if (studentOrTeacher) {
        if (!Roles.userIsInRole(studentOrTeacher,['student','teacher'])) 
          throw new Meteor.Error('notStudentOrTeacher','Only students and teachers may be included in calendar events.')
      } else {
        if (!Roles.userIsInRole(cU,'teacher'))
          throw new Meteor.Error('invalidGroupMember', "Cannot create calendar event.  Group members must be valid users.");
        //teachers can also create events for an entire section or for all students
        if (!Sections.findOne(ID) && !Site.findOne(ID)) 
          throw new Meteor.Error('invalidGroupMember', "Cannot create calendar event.  Group members must be valid users, or section or site.");
      }
    });
    if (Roles.userIsInRole(cU,'student') && !_.contains(calendarEvent.group,cU._id))
      throw new Meteor.Error('notPartOfGroup', 'Cannot create calendar event unless you are part of the group.');      

    calendarEvent.invite.forEach(function(ID) {
      //invite list can only contain IDs of teachers or students
      //if a teacher creates an event for a whole section or all students, they cannot decline and there is no need to accept an invite
      var studentOrTeacher = Meteor.users.findOne(ID);
      if (!studentOrTeacher)
        throw new Meteor.Error('invalidUserID','Invalid user ID.  Only valid users be invited to calendar events.')
      if (!Roles.userIsInRole(studentOrTeacher,['student','teacher'])) 
        throw new Meteor.Error('notStudentOrTeacher','Only students and teachers may be invited to calendar events.')
    });

    return CalendarEvents.insert(calendarEvent);
  },

  /***** ACCEPT CALENDAR INVITE ****/
  acceptCalendarInvite: function(eventID) {
    //allow teacher to accept for a student?
    check(eventID,Match.idString);
    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    var cU = Meteor.user(); //currentUser

    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to accept an invitation.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to accept an invite to a calendar event.') 

    if (!cE)
      throw new Meteor.Error('invalidCalendarEvent', "Cannot accept invite.  Invalid event ID.");

    if (_.contains(cE.group,cU._id) || !_.contains(cE.invite,cU._id))
      throw new Meteor.Error('notInvitedOrAlreadyInGroup', "You must be in the invitation list, and not yet part of the group in order to accept an invitation.")

    //if student, check if frozen

    CalendarEvents.update(eventID,{$addToSet: {group : cU._id} });
    CalendarEvents.update(eventID,{$pull: {invite : cU._id}});
    return eventID;
  },

  /***** DECLINE CALENDAR INVITE ****/
  declineCalendarInvite: function(eventID,userID) {
    check(eventID,Match.idString);
    check(userID,Match.OneOf(Match.idString,null));
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to decline an invitation.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to invite others to collaborate.');

    //A teacher can decline on behalf of a student, otherwise throw error
    if (!userID) {
      var invitedMember = cU;
    } else {
      var invitedMember = Meteor.users.findOne(userID);
      if (Roles.userIsInRole(cU,'student') && (userID != cU._id))
        throw new Meteor.Error('canOnlyDeclineForSelf','Students cannot decline an invitation on behalf of another user.');
      if (Roles.userIsInRole(cU,'teacher') && Roles.userIsInRole(invitedMember,'teacher') && (cU._id != invitedMember._id)) 
        throw new Meteor.Error('cannotDeclineForAnotherTeacher','One teacher may not decline an invitation for another teacher.');
    }

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot decline invite.  Invalid event ID.");

    if (!_.contains(cE.invite,invitedMember._id))
      throw new Meteor.Error('notInvited', "You can't decline a invitation unless you've first been invited.")

    return CalendarEvents.update(eventID,{$pull: {invite : invitedMember._id}});
  },

  /***** INVITE ANOTHER ****/
  addToCalendarInviteList: function(eventID,userID) {
    check(eventID,Match.idString);
    check(userID,Match.idString);
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to decline an invitation.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to invite others to collaborate.');

    //if student, check if frozen

    var user = Meteor.users.findOne(userID);
    if (!user)
      throw new Meteor.Error('invaliduserId','Cannot invite user to calendar event.  Invalid user ID.');
    if (!Roles.userIsInRole(user,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent','Only teachers and students may be invited to calendar events.');

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot decline invite.  Invalid event ID.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(cE.group,cU._id))
        throw new Meteor.Error('mustBeInGroup','Cannot invite another user to this event unless you are already in the group.');
    }
    if (_.contains(cE.invite,user._id))
      throw new Meteor.Error('alreadyInvited', "This user is already on the invite list.  No need to invite again.");

    CalendarEvents.update(eventID,{$addToSet: {invite : user._id} });
  },

  /***** INVITE ANOTHER ****/
  addToCalendarGroup: function(eventID,ID) {
    check(eventID,Match.idString);
    check(ID,Match.idString);
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to decline an invitation.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'You must be a teacher to add users directly to a calendar event.');

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot decline invite.  Invalid event ID.");

    var section = Sections.findOne(ID);
    var site = Site.findOne(ID);
    var user = Meteor.users.findOne(ID); 
    if (!(section) && !(site) && !(user))
      throw new Meteor.Error('invalidID','Can only add a valid section, site or user to a calendar event.');
    if ((user) && !Roles.userIsInRole(user,['student','teacher']))
      throw new Meteor.Error('notTeacherOrStudent','Only teachers or students may be added to a calendar event.');

    CalendarEvents.update(eventID,{$addToSet: {group : ID} });
  },

  /**** UPDATE CALENDAR EVENT ****/
  updateCalendarEvent: function(calendarEvent) {
    check(calendarEvent,{
      _id: Match.idString,
      date: Match.Optional(Date),
      activityID: Match.Optional(Match.OneOf(Match.idString,null)),      
      workplace: Match.Optional(Match.OneOf('OOC','FTF','HOM')),
      title: Match.Optional(Match.nonEmptyString), //can only change if activityID is null
      note: Match.Optional(String), 
      startTime: Match.Optional(Date),
      endTime: Match.Optional(Date),
      nameOfTimePeriod: Match.Optional(String),

      //fields that will be filled based on the information passed in.  
      //values passed in will be ignored
      modifiedBy: Match.Optional(Match.idString), //current user
      modifiedOn: Match.Optional(Date),           //current date

      // fields that should not be changed.  Can be passed in, but will be replaced with values from event
      group: Match.Optional([Match.idString]), //Only changed by accepting invite
      invite: Match.Optional([Match.idString]), //Only changed by add to invite
      createdBy: Match.Optional(Match.idString),              //current user
      createdOn: Match.Optional(Date),            
      visible: Match.Optional(Boolean) //set in showHideMethod.js          
    });
    var originalCE = CalendarEvents.findOne(calendarEvent._id); //calendarEvent
    var cU = Meteor.user(); //currentUser

    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a calendar event.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to update a calendar event.') 

    if (!originalCE)
      throw new Meteor.Error('invalidCalendarEvent', "Cannot accept invite.  Invalid event ID.");

    if (Roles.userIsInRole(cU,'student') && !_.contains(originalCE.group,cU._id))
      throw new Meteor.Error('canOnlyUpdateOwnEvent','Students cannot change a calendar event unless they are part of the event group.');

    //if student, check if frozen

    calendarEvent.modifiedBy = cU._id;
    calendarEvent.modifiedOn = new Date();

    var fields = ['date','activityID','workplace','title','note','startTime','endTime','nameOfTimePeriod','modifiedBy','modifiedOn'];
    fields.forEach(function(field) {
      if ((field in calendarEvent) && (calendarEvent[field] != originalCE[field])) {
        var set = {};
        set[field] = calendarEvent[field];
        CalendarEvents.update(calendarEvent._id,{$set: set});
      }
    });
    return calendarEvent._id; 
  },

  /**** DELETE EVENT ****/
  deleteEvent: function(eventID,ID) {
    check(eventID,Match.idString);
    check(userID,Match.OneOf(Match.idString,null));
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to decline an invitation.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to invite others to collaborate.');

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot decline invite.  Invalid event ID.");

    //if student, check if frozen

    if (Roles.userIsInRole(cU,'teacher')) {
      var section = Sections.findOne(ID);
      var site = Site.findOne(ID);
      var userToRemove = Meteor.users.findOne(ID);
      if (section) {
        var usersInSection = Meteor.sectionMemberIds(ID);
        usersInSection.push(ID);
        CalendarEvents.update(eventID,{$pullAll: {group: usersInSection}}); 
      } else if (site) {
        var usersInClass = _.pluck(Roles.getUsersInRole('student'),'_id');
        usersInClass.push(ID);
        CalendarEvents.update(eventID,{$pullAll: {group: usersInClass}});       
      } else if (ID) { //not section or site, so trying to remove a single user
        if (!userToRemove)
          throw new Meteor.Error('invalidUser','Cannot delete event.  Invalid user.');
        if (!_.contains(cE.group,userToRemove._id)) 
          throw new Meteor.Error('userNotInGroup', 'Cannot delete event.  User not in group.');
        CalendarEvents.update(eventID,{$pull: {group : userToRemove._id}}); 
      } else if (_.contains(cE.group,cU._id)) { //trying to remove self
        CalendarEvents.update(eventID,{$pull: {group : cU._id}});
      } else {
        throw new Meteor.Error('notInGroup', 'Cannot modify calendar event unless you are part of the group.');
      }
    } else {
      if (_.contains(cE.group,cU._id)) { //student trying to remove self
        CalendarEvents.update(eventID,{$pull: {group : cU._id}});
      } else {
        throw new Meteor.Error('notInGroup', 'Cannot modify calendar event unless you are part of the group.');
      }
    }

    cE = CalendarEvents.findOne(eventID);
    if (cE.group.length == 0) {
      CalendarEvents.remove(eventID);
      return null;
    } else {
      return eventID;
    };
  }

}); 