CalendarEvents = new Meteor.Collection('CalendarEvents');

Meteor.methods({

  /***** INSERT CALENDAREVENT ****/
  insertCalendarEvent: function(calendarEvent) {
    check(calendarEvent,{
      //required fields to create the new calendar event
      date: Date,
      participants: [Match.idString], //contains userIDs, sectionIDs, or siteID
      activityID: Match.OneOf(Match.idString,null), 
      title: Match.stringWithContent, 
      workplace: Match.OneOf('OOC','FTF','HOM'),

      //optional fields
      location: Match.Optional(String), //name of meeting place
      note: Match.Optional(String), 
      invite: Match.Optional([Match.idString]),  
          //contains only userIDs
          //only a teacher would invite the entire section or all students, in which case the event should 
          //show up in the calendar with no chance to decline and no need to accept an invitation

      //currently not required ... not yet implemented
      startTime: Match.Optional(Date),
      endTime: Match.Optional(Date),
      nameOfTimePeriod: Match.Optional(String),

      /*fields that will be initially filled based on the information passed in
      day: Match.Optional(Match.OneOf('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
      numberOfTodoItems: Match.Optional(Number), //denormalized totals filled when adding, deleting or modifying todo items
      numberTodosCompleted: Match.Optional(Number), //see above
      createdBy: Match.Optional(Match.idString),  //current user
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

    //participant list contains valid users (students or teachers), sections or site
    calendarEvent.participants.forEach(function(ID) {
      var studentOrTeacher = Meteor.users.findOne(ID);
      if (studentOrTeacher) {
        if (!Roles.userIsInRole(studentOrTeacher,['student','teacher'])) 
          throw new Meteor.Error('notStudentOrTeacher','Only students and teachers may participate in calendar events.')
      } else {
        if (!Roles.userIsInRole(cU,'teacher'))
          throw new Meteor.Error('invalidParticipant', "Cannot create calendar event.  Participants must be valid users.");
        //teachers can also create events for an entire section or for all students
        if (!Sections.findOne(ID) && !Site.findOne(ID)) 
          throw new Meteor.Error('invalidParticipant', "Cannot create calendar event.  Participants must be valid users, or section or site.");
      }
    });
    if (Roles.userIsInRole(cU,'student') && !_.contains(calendarEvent.participants,cU._id))
      throw new Meteor.Error('notParticipant', 'Cannot create calendar event unless you are in the list of participants.');      
      //if student, check if frozen
    if (Roles.userIsInRole(cU,'teacher') && calendarEvent.participants.length == 0)
     throw new Meteor.Error('noParticipants', 'Cannot create calendar event without at least one participant.');      

    calendarEvent.day = moment(calendarEvent.date).format('ddd');
    calendarEvent.numberOfTodoItems = 0; //denormalized values only manipulated by todos
    calendarEvent.numberTodosCompleted = 0; //denormalized values only mnaipulated by todos
    calendarEvent.createdBy = cU._id;
    calendarEvent.modifiedBy = cU._id;
    var today = new Date();
    calendarEvent.createdOn = today;
    calendarEvent.modifiedOn = today;
    calendarEvent.visible = true;

    if (calendarEvent.activityID) {
      var activity = Activities.findOne(calendarEvent.activityID);
      if (!activity)
        throw new Meteor.Error('invalidActivity','Cannot post calendar event.  Invalid activity ID.');
    } 

    //optional fields
    if (!('note' in calendarEvent)) 
      calendarEvent.note = '';
    if (!('location' in calendarEvent))
      calendarEvent.location = '';


    //fields not yet implemented ... will need handling
    if (!('nameOfTimePeriod' in calendarEvent))
      calendarEvent.nameOfTimePeriod = '';
    if (!'startTime' in calendarEvent)
      calendarEvent.startTime = calendarEvent.date;
    if (!'endTime' in calendarEvent)
      calendarEvent.endTime = calendarEvent.date;

    if (!calendarEvent.invite)
      calendarEvent.invite = [];
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

    if (_.contains(cE.participants,cU._id) || !_.contains(cE.invite,cU._id))
      throw new Meteor.Error('notInvitedOrAlreadyAParticipant', "You must be in the invitation list, and not yet a participant in order to accept an invitation.")

    //if student, check if frozen

    CalendarEvents.update(eventID,{$addToSet: {participants : cU._id} });
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
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to decline an invitation.');

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
  addToCalendarInviteList: function(eventID,userIDs) {
    check(eventID,Match.idString);
    check(userIDs,Match.Optional([Match.idString],Match.idString));
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to invite users to a calendar event.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to invite others to a calendar event.');
    //if student, check if frozen

    userIDs = (_.isArray(userIDs)) ? userIDs : [userIDs];
    if (!userIDs.length)
      throw new Meteor.Error('emptyList', "Cannot add users to calendar invite list.  Empty list.");

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot sdd users to calendar invite list.  Invalid event ID.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(cE.participants,cU._id))
        throw new Meteor.Error('mustBeParticipant','Cannot invite another user to this event unless you are already a participant.');
    }

    var userIDsMinusParticipants = userIDs.filter(function(userID) {
      var user = Meteor.users.findOne(userID);
      if (!user)
        throw new Meteor.Error('invaliduserId','Cannot invite user to calendar event.  Invalid user ID. ' + userID);
      if (!Roles.userIsInRole(user,['teacher','student']))
        throw new Meteor.Error('notTeacherOrStudent','Only teachers and students may be invited to calendar events. ' + userID);
      if (_.contains(cE.participants,userID)) {
        if (Roles.userIsInRole(cU,'teacher')) {
          Meteor.call('removeFromParticipants',eventID,userID);
          return true;
        } else {
          return false;
        }
      }
      return true;
    })

    return CalendarEvents.update(eventID,{$addToSet: {invite : {$each: userIDsMinusParticipants}} });
  },

  /***** UNINVITE ****/
  removeFromCalendarInviteList: function(eventID,userIDs) {
    check(eventID,Match.idString);
    check(userIDs,Match.Optional([Match.idString],Match.idString));
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to remove a user from the invitation list.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher remove a user from the invitation list.');
    //if student, check if frozen

    userIDs = (_.isArray(userIDs)) ? userIDs : [userIDs];
    if (!userIDs.length)
      throw new Meteor.Error('emptyList', "Cannot remove users from calendar invite list.  Empty list.");

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot remove user from invitation list.  Invalid event ID.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(cE.participants,cU._id))
        throw new Meteor.Error('mustBeParticipant','Cannot remove a user from this event unless you are already a participant.');
    }

    userIDs.forEach(function(userID) {
      var user = Meteor.users.findOne(userID);
      if (!user)
        throw new Meteor.Error('invaliduserId','Cannot remove user from calendar event.  Invalid user ID. ' + userID);
      if (!Roles.userIsInRole(user,['teacher','student']))
        throw new Meteor.Error('notTeacherOrStudent','Only teachers and students may remove users from calendar events. ' + userID);
    })

    return CalendarEvents.update(eventID,{$pullAll: {invite : userIDs}});
  },

  /***** ADD DIRECTLY TO PARTICIPANTS ****/
  addToParticipants: function(eventID,IDs) {
    check(eventID,Match.idString);
    check(IDs,Match.OneOf([Match.idString],Match.idString));
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to add users directly to a calendar event.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'You must be a teacher to add users directly to a calendar event.');

    IDs = (_.isArray(IDs)) ? IDs : [IDs];
    if (!IDs.length)
      throw new Meteor.Error('emptyList', "Cannot add participants to calendar event.  Empty list.");

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot add participant to calendar event.  Invalid event ID.");

    IDs.forEach(function(ID) {
      var section = Sections.findOne(ID);
      var site = Site.findOne(ID);
      var user = Meteor.users.findOne(ID); 
      if (!(section) && !(site) && !(user))
        throw new Meteor.Error('invalidID','Can only add a valid section, site or user to a calendar event.');
      if ((user) && !Roles.userIsInRole(user,['student','teacher']))
        throw new Meteor.Error('notTeacherOrStudent','Only teachers or students may be added to a calendar event.');
    });

    CalendarEvents.update(eventID,{$addToSet: {participants : {$each: IDs}} });
    CalendarEvents.update(eventID,{$pullAll: {invite: IDs}});
  },

  /***** REMOVE DIRECTLY FROM PARTICIPANTS ****/
  removeFromParticipants: function(eventID,IDs) {
    check(eventID,Match.idString);
    check(IDs,Match.OneOf([Match.idString],Match.idString));

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to remove a participant from a calendar event.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'You must be a teacher to remove a participant from a calendar event.');

    IDs = (_.isArray(IDs)) ? IDs : [IDs];
    if (!IDs.length)
      throw new Meteor.Error('emptyList', "Cannot add participants to calendar event.  Empty list.");

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot remove participant from calendar event.  Invalid event ID.");

    IDs.forEach(function(ID) {
      var section = Sections.findOne(ID);
      var site = Site.findOne(ID);
      var user = Meteor.users.findOne(ID); 
      if (!(section) && !(site) && !(user))
        throw new Meteor.Error('invalidID','Cannot remove participant from event.  Invalid user, section or site. ' + ID);
    })

    var pulled = CalendarEvents.update(eventID,{$pullAll: {participants: IDs}}); 
    cE = CalendarEvents.findOne(eventID);
    if (cE.participants.length == 0) {
      throw new Meteor.Error('noParticipants','Warning.  There are now no participants left for this calendar event.  If you exit the edit dialog without adding a participant, the event will be effectively deleted, as it will not show up in any calendar.')
    } else {
      return pulled;
    }
  },

  /**** UPDATE CALENDAR EVENT ****/
  updateCalendarEvent: function(calendarEvent) {
    check(calendarEvent,{
      _id: Match.idString,
      activityID: Match.Optional(Match.OneOf(Match.idString,null)),           
      title: Match.Optional(Match.stringWithContent), 
      workplace: Match.Optional(Match.OneOf('OOC','FTF','HOM')),
      location: Match.Optional(String),
      note: Match.Optional(String), 
      startTime: Match.Optional(Date),
      endTime: Match.Optional(Date),
      nameOfTimePeriod: Match.Optional(String),

      //fields that will be filled based on the information passed in.  
      //values passed in will be ignored
      modifiedBy: Match.Optional(Match.idString), //will be set tocurrent user
      modifiedOn: Match.Optional(Date),           //will be set to current date

      // fields that should not be changed.  Can be passed in, but will be ignored
      date: Match.Optional(Date), //handled by drag/drop sortable1C
      day:  Match.Optional(Match.OneOf('Mon','Tue','Wed','Thu','Fri','Sat','Sun')), //handled in after hook to catch when date is changed by sortable 1C 
                                                                             //NOT YET WRITTEN!
      participants: Match.Optional([Match.idString]), //Only changed by accepting invite, or teacher directlyl adding
      invite: Match.Optional([Match.idString]), //Only changed by add to invite or accept/decline invite
      numberOfTodoItems: Match.Optional(Number),  //handled by todo methods
      numberTodosCompleted: Match.Optional(Number), //handled by todo methods
      createdBy: Match.Optional(Match.idString),  //set once and not changed            
      createdOn: Match.Optional(Date),  //set once and not changed          
      visible: Match.Optional(Boolean) //set in showHideMethod.js          
    });
    var originalCE = CalendarEvents.findOne(calendarEvent._id); //calendarEvent
    if (!originalCE)
      throw new Meteor.Error('invalidCalendarEvent', "Cannot accept invite.  Invalid event ID.");

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a calendar event.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to update a calendar event.') 
    if (Roles.userIsInRole(cU,'student') && !_.contains(originalCE.participants,cU._id))
      throw new Meteor.Error('canOnlyUpdateOwnEvent','Students cannot change a calendar event unless they are participants.');
    //if student, check if frozen

    calendarEvent.modifiedBy = cU._id;
    calendarEvent.modifiedOn = new Date();

    if (('activityID' in calendarEvent) && calendarEvent.activityID) {
      var activity = Activities.findOne(calendarEvent.activityID);
      if (!activity)
        throw new Meteor.Error('invalidActivity','Cannot update calendar event.  Invalid activity ID.');
    } 

    //validation for startTime, endTime, nameOfTimePeriod?
    //handling for nameOfTimePeriod to update list of named periods?

    var fields = ['activityID','workplace',,'location','title','note','startTime','endTime','nameOfTimePeriod','modifiedBy','modifiedOn'];
    fields.forEach(function(field) {
      if ((field in calendarEvent) && (calendarEvent[field] != originalCE[field])) {
        var set = {};
        set[field] = calendarEvent[field];
        CalendarEvents.update(calendarEvent._id,{$set: set});
      }
    });

    return calendarEvent._id; 
  },

  /**** DELETE CALENDAR EVENT ****/
  deleteCalendarEvent: function(eventID) {
    check(eventID,Match.idString);
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a calendar event.");
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent', 'You must be student or teacher to delete a calendar event.');

    var cE = CalendarEvents.findOne(eventID); //calendarEvent
    if (!cE)
      throw new Meteor.Error('invalidEventID', "Cannot decline invite.  Invalid event ID.");

    //if student, check if frozen

    if (Roles.userIsInRole(cU,'teacher')) {
      CalendarEvents.remove(eventID);
      Todos.find({calendarEventID:eventID}).forEach(function(todo) {
        Todos.remove(todo._id);
      })
      return 1;
    } else { //must be student
      if (!_.contains(cE.participants,cU._id)) 
        throw new Meteor.Error('notParticipant', 'Cannot modify calendar event unless you are a participant.');
      if (cE.participants.length == 1) { //removing last participant, delete event completely
        CalendarEvents.remove(eventID);
        Todos.find({calendarEventID:eventID}).forEach(function(todo) {
          Todos.remove(todo._id);
        })
        return 1;
      } else { //just remove this student from participants list
        CalendarEvents.update(eventID,{$pull: {participants : cU._id}});
        return eventID;
      };
    }

  }

}); 