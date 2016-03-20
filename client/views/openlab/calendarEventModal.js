/* to do list:  
  make helpers:  isTeacherOrParticipantTFtext, isTeacherOrParticipant (boolean)
  use to enable/disable editing or selection from menus
*/

  /******************************/
 /**** CALENDAR EVENT MODAL ****/
/******************************/

Template.calendarEventModal.onCreated(function() {
  var instance = this;
  instance.activeUnit = new ReactiveVar(openlabSession.get('activeUnit'));
  instance.activeSection = new ReactiveVar(Meteor.selectedSectionId());
  instance.activeGroup = new ReactiveVar(Meteor.currentGroupId());
  instance.choseTeachers = new ReactiveVar(false);
  instance.choseParents = new ReactiveVar(false);
  instance.editingTimePeriods = new ReactiveVar(false);

  /** set calendar event **/
  instance.calendarEvent = new ReactiveVar({});
  instance.setCalendarEventFields = function(newFields) {
    var cE = instance.calendarEvent.get();
    delete newFields.participants; //these are handled below
    delete newFields.invite;
    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      newFields._id = cE._id;
      Meteor.call('updateCalendarEvent',newFields,function(error,id){
        if (error) {
          instance.backgroundColor.set('warning');
          instance.message.set('Invalid value.  Changes will be saved whan a valid value is entered.'); 
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
          _.forEach(newFields,function(value,key) {
            cE[key] = value;
          });
          instance.calendarEvent.set(cE);
        }
      });
    } else {
      _.forEach(newFields,function(value,key) {
        cE[key] = value;
      });
      instance.calendarEvent.set(cE);
      var requiredFieldsFilled = dataValidated(instance);
      if (requiredFieldsFilled) {
        instance.backgroundColor.set('info');
        instance.message.set('All required fields filled.  <br>New calendar event not yet saved.');
      }
    }
  }
  /** add to calendar invite list **/
  instance.addToCalendarInviteList = function(userIDs) {
    var cU = Meteor.userId();
    var cE = instance.calendarEvent.get();
    userIDs = (_.isArray(userIDs)) ? userIDs : [userIDs];
    var userIDsMinusParticipants = userIDs.filter(function(userID) {
      if (_.contains(cE.participants,userID)) {
        if (Roles.userIsInRole(cU,'teacher')) {
          return true;
        } else {
          return false;
        }
      }
      return true;
    })

    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      Meteor.call('addToCalendarInviteList',cE._id,userIDs,function(error,id){
        if (error) {
          instance.backgroundColor.set('warning');
          instance.message.set('Invalid value.  Changes will be saved whan a valid value is entered.'); 
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
          if (Roles.userIsInRole(cU,'teacher')) {
            cE.participants = _.difference(cE.participants,userIDs);
            cE.invite = _.union(cE.invite,userIDs);
          } else  {
            cE.invite = _.union(cE.invite,userIDsMinusParticipants);
          }
          instance.calendarEvent.set(cE);
        }
      });
    } else {
      if (Roles.userIsInRole(cU,'teacher')) {
        cE.participants = _.difference(cE.participants,userIDs);
        cE.invite = _.union(cE.invite,userIDs);
      } else  {
        cE.invite = _.union(cE.invite,userIDsMinusParticipants);
      }
      instance.calendarEvent.set(cE);
    }
  }
  /** remove from calendar invite list **/
  instance.removeFromCalendarInviteList = function(userIDs) {
    var cE = instance.calendarEvent.get();
    userIDs = (_.isArray(userIDs)) ? userIDs : [userIDs];

    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      Meteor.call('removeFromCalendarInviteList',cE._id,userIDs,function(error,id){
        if (error) {
          instance.backgroundColor.set('warning');
          instance.message.set('Error removing user from invitation list. ' + error.reason); 
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
          cE.invite = _.difference(cE.invite,userIDs);
          instance.calendarEvent.set(cE);
        }
      });
    } else {
      cE.invite = _.difference(cE.invite,userIDs);
      instance.calendarEvent.set(cE);
    }      
  }
  /** add to participants **/
  instance.addToParticipants = function(IDs) {
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher'))
      return alert('You must be a teacher to add participants directly to a calendar event.');
    var cE = instance.calendarEvent.get();
    IDs = (_.isArray(IDs)) ? IDs : [IDs];

    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      Meteor.call('addToParticipants',cE._id,IDs,function(error,id){
        if (error) {
          instance.backgroundColor.set('warning');
          instance.message.set('Invalid value.  Changes will be saved whan a valid value is entered.'); 
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
          cE.participants = _.union(cE.participants,IDs);
          cE.invite = _.difference(cE.invite,IDs);
          instance.calendarEvent.set(cE); 
        }
      });
    } else {
      cE.participants = _.union(cE.participants,IDs);
      cE.invite = _.difference(cE.invite,IDs);
      instance.calendarEvent.set(cE);
      var requiredFieldsFilled = dataValidated(instance);
      if (requiredFieldsFilled) {
        instance.backgroundColor.set('info');
        instance.message.set('All required fields filled.  <br>New calendar event not yet saved.');
      }
    }   
  }
  /** remove from participants **/
  instance.removeFromParticipants = function(IDs) {
    //issue warning if trying to close the dialogue with no users
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher'))
      return alert('You must be a teacher to remove participants from a calendar event.');
    var cE = instance.calendarEvent.get();
    IDs = (_.isArray(IDs)) ? IDs : [IDs];

    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      Meteor.call('removeFromParticipants',cE._id,IDs,function(error,id) {
        if (error) {
          if (error.error == 'noParticipants') { //actually success removing participants, but post warning
            cE.participants = _.difference(cE.participants,IDs);
            instance.calendarEvent.set(cE);
            instance.backgroundColor.set('warning');
            instance.message.set(error.reason); 
          } else {
            instance.backgroundColor.set('warning');
            instance.message.set('Error removing participant. ' + error.reason); 
          }
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
          cE.participants = _.difference(cE.participants,IDs);
          instance.calendarEvent.set(cE); 
        }
      });
    } else {
      cE.participants = _.difference(cE.participants,IDs);
      instance.calendarEvent.set(cE);   
    }
  }
  /** accept calendar invite **/
  instance.acceptCalendarInvite = function() {
    var cE = instance.calendarEvent.get();
    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      Meteor.call('acceptCalendarInvite',cE._id,function(error,id){
        if (error) {
          instance.backgroundColor.set('warning');
          instance.message.set('Error accepting calendar invite. ' + error.reason); 
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
          var cU = Meteor.userId();
          cE.participants.push(cU);
          cE.invite = _.without(cE.invite,cU);
          instance.calendarEvent.set(cE); 
        } 
      });
    } else {
      var cU = Meteor.userId();
      cE.participants.push(cU);
      cE.invite = _.without(cE.invite,cU);
      instance.calendarEvent.set(cE);  
    }    
  }
  /** decline calendar invite **/
  instance.declineCalendarInvite = function() {
    var cE = instance.calendarEvent.get();
    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      //null for second argument defaults to removing current user from calendar event
      Meteor.call('declineCalendarInvite',cE._id,null,function(error,id){
        if (error) {
          instance.backgroundColor.set('warning');
          instance.message.set('Error accepting calendar invite. ' + error.reason); 
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('You have declined this invitation.');
          var cU = Meteor.userId();
          cE.invite = _.without(cE.invite,cU);
          instance.calendarEvent.set(cE);
        }
      });
    } else {
      alert('Error:  Tried to decline invitation when calendar event not yet even saved.');
    }  
  }

  /** set time period **/
  instance.setTimePeriod = function() {
    //read selected time period name and days
    //read start and end values
    //call set time period method, which handles whether a time period of that name already exists
    //no need to pass ID, as name must be unique
  }
  /** clear time period **/
  instance.clearTimePeriod = function() {
    //read name and days
    //call clear time period method
    //method throws informative error in the only exceptional case - trying to clear days from a time period that doesn't exist
    //no need to pass ID, as name must be unique
  }
  /* need object  for holding list of days 
  and handlers for setting and clearing (or just toggling?)*/

  /** insert todo **/
  instance.Todos = new ReactiveVar([]); //only used if there is not yet a calendar Event
  instance.insertTodo = function(text) {
    if (Match.test(text,Match.nonEmptyString)) {
      var Todos = instance.Todos.get();
      var todo = {text:text,
                  order: Todos.length}
      Todos.push(todo);
      instance.Todos.set(Todos);
      var requiredFieldsFilled = dataValidated(instance);
      if (requiredFieldsFilled) {
        instance.backgroundColor.set('info');
        instance.message.set('All required fields filled.  <br>New calendar event not yet saved.');
      }
    }
  }
  /** update todo **/
  instance.updateTodo = function(text,order) {
    var Todos = instance.Todos.get();
    if (Match.test(text,Match.nonEmptyString)) {
      Todos[order].text = text;
    } else {
      for (o = order + 1;o < Todos.length;o++) {
        Todos[o].order--;
      }
      Todos.splice(order,1);
    }
    instance.Todos.set(Todos);
  }

  /** initialization **/
  instance.backgroundColor = new ReactiveVar('');
  instance.message = new ReactiveVar('');

  instance.setCalendarEventNull = function() {
    instance.calendarEvent.set({
      date: new Date(0),
      participants: [Meteor.impersonatedOrUserId()],
      activityID: null,
      title: '',
      workplace: 'OOC',
      note: '',
      startTime: new Date(0),
      endTime: new Date(0),
      nameOfTimePeriod: '',
      invite: []
    });
    instance.backgroundColor.set('warning');
    instance.message.set('Required fields: title, and at least one to do item.')
  }
  instance.setCalendarEventNull();
});

var timeFormat = "h:mm a";

/** on rendered **/
Template.calendarEventModal.onRendered(function() {
  var instance = this;
  instance.$calEventModalNote = instance.$('#calEventModalNote');
  instance.$calEventModalNote.summernote({ //default/standard air popover toolbar
    airMode: true,
    airPopover: [
      ['style',['style']],
      ['color', ['color']],
      ['fontname', ['fontname']],
      ['fontsize', ['fontsize']],
      ['supersub', ['superscript','subscript']],
      ['font', ['bold', 'italic', 'strikethrough', 'underline', 'clear']],
      ['para', ['ul', 'ol', 'paragraph']],
      ['table', ['table']],
      ['insert', ['link', 'picture','hr'/*,'video'*/]],
      //['undoredo', ['undo','redo']], //leaving out for now ... not clear what is undone ... not a large queue of past changes, and ctrl-z, ctrl-shift-z reacts more like what you would expect
      ['other',[/*'codeview','fullscreen',*/'help','hide']]
      //ISSUE codeview, fullscreen, not working ... does it work from toolbar and just not from air mode?
      //ISSUE video works, but can't resize it, no context menu as for image
      //leaving out video for now, can use video blocks until this is better
    ],
    onBlur: function(event) {
      var code = instance.$calEventModalNote.code();
      instance.setCalendarEventFields({note:code});      
    }
  })
  //handle updates to plaintext and summernote fields in an autorun here?
  //troubles creating an additional update to summernote fields?

  instance.$('#calEventModalFrom').datetimepicker({
    showClose:  true,
    showClear: true,
    keepOpen: false,
    format: timeFormat,
    toolbarPlacement: 'top',
    widgetPositioning: {vertical:'bottom',horizontal:'auto'},
    keyBinds: {enter: function(widget) {
      if (widget.find('.datepicker').is(':visible')) {
        this.hide();
      } else {
        this.date(widget.find('.datepicker').val());
      }
    }}
  });
  instance.$('#calEventModalTo').datetimepicker({
    showClose: true,
    showClear: true,
    keepOpen: false,
    format: timeFormat,  //bug in widgetPositioning: {vertial:'top'} so overriding default 'auto' and setting to 'bottom', which also means the picker does not cover the graphic
    toolbarPlacement: 'top',
    widgetPositioning: {vertical:'bottom',horizontal:'auto'},
    keyBinds: {enter: function(widget) {
      if (widget.find('.datepicker').is(':visible')) {
        this.hide();
      } else {
        this.date(widget.find('.datepicker').val());
      }
    }}
  })
})

/** initialization tasks when model is activated **/
Template.calendarEventModal.events({
  'show.bs.modal #calendarEventModal': function(event,tmpl) {
    tmpl.activeUnit.set(openlabSession.get('activeUnit'));
    tmpl.activeSection.set(Meteor.selectedSectionId());
    tmpl.activeGroup.set(Meteor.currentGroupId());
    tmpl.choseTeachers.set(false);
    tmpl.choseParents.set(false);

    var dateOrID = Session.get('dateOrIDForCalendarEventModal');
    if (dateOrID instanceof Date) {
      tmpl.setCalendarEventNull(); //also sets message about required fields
      tmpl.setCalendarEventFields({date:dateOrID});
      var calendarEvent = tmpl.calendarEvent.get();
      tmpl.Todos.set([]);
    } else if (Match.test(dateOrID,Match.idString)) {
      var calendarEvent =  CalendarEvents.findOne(dateOrID);
      tmpl.calendarEvent.set(calendarEvent);
      tmpl.Todos.set([]);
      tmpl.subscribe('todos',calendarEvent._id);
      tmpl.backgroundColor.set('info');
      var cU = Meteor.userId();
      if (_.contains(calendarEvent.participants,cU)) {
        tmpl.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
      } else if (_.contains(calendarEvent.invite,cU)) {
        tmpl.message.set('You must accept the invitation before you can edit anything.');
      } else if (Roles.userIsInRole(cU,'teacher')) {
        tmpl.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
      } else { //not in participants or invite list and not a teacher ... could be parent (?) ... student should not have access
        tmpl.message.set('You may only view this calendar event, but do not have editing privileges.');
      }
    } else {
      tmpl.setCalendarEventNull();
      var calendarEvent = tmpl.calendarEvent.get();
      tmpl.Todos.set([]);
    }
    tmpl.$calEventModalNote.code(calendarEvent.note);  
    tmpl.$('#calEventModalTitle').text(calendarEvent.title);
  }
})

/** data validated helper **/
var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
var dateFormat = "ddd, MMM D YYYY";
var dataValidated = function(tmpl) {
  var calendarEvent = tmpl.calendarEvent.get();
  if (!calendarEvent) return false;
  var temporaryTodos = tmpl.Todos.get();
  var todos = 0;
  if (('_id' in calendarEvent) && Match.test(calendarEvent._id,Match.idString)) {
    todos = Todos.find({calendarEventID:calendarEvent._id}).count();
  }
  if ((!temporaryTodos.length) && !todos) return false;
  return Match.test(calendarEvent,{
    //required
    date: Date, 
    participants: [Match.idString], //contains userIDs, sectionIDs, or siteID
    activityID: Match.OneOf(Match.idString,null), 
    title: Match.stringWithContent, 
    workplace: Match.OneOf('OOC','FTF','HOM'),

    //optional
    location: Match.Optional(String), //name of meeting place
    note: Match.Optional(String), 
    invite: Match.Optional([Match.idString]), 
    //the next three move to non-optional when available
    startTime: Match.Optional(Date),
    endTime: Match.Optional(Date),
    nameOfTimePeriod: Match.Optional(String),

    //optional, and will be ignored if passed to update
    _id: Match.Optional(Match.idString),
    day: Match.Optional(Match.OneOf('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
    numberOfTodoItems: Match.Optional(Number), //denormalized totals filled when adding, deleting or modifying todo items
    numberTodosCompleted: Match.Optional(Number), //see above
    createdBy: Match.Optional(Match.idString),  //current user
    createdOn: Match.Optional(Date),            //today's date
    modifiedBy: Match.Optional(Match.idString), //current user
    modifiedOn: Match.Optional(Date),           //current date
    visible: Match.Optional(Boolean)
  })
}

/** add names fields to group objects **/
var groupsWithNames = function(groupIDs) {
  var pastGroups = [];
  groupIDs.forEach(function(groupID) {
    var pastGroupies = Meteor.groupies('current',groupID);
    if (pastGroupies == 'no group members found') 
      pastGroupies = Meteor.groupies('final',groupID);
    if (pastGroupies == 'no group members found')
      pastGroupies = Meteor.groupies('former',groupID);
    if (pastGroupies == 'no group members found')
      return '';
    var pastGroup = Groups.findOne(groupID)
    pastGroup.names = pastGroupies;
    pastGroups.push(pastGroup);
  })
  return pastGroups;  
}

/** potential participants ids helper **/
var potentialParticipantIds = function() {
  var tmpl = Template.instance();
  if (tmpl.choseTeachers.get()) {
    return _.pluck(Roles.getUsersInRole('teacher').fetch(),'_id');
  /* parents in calendar events not yet implemented
  } else if (tmpl.choseParents.get()) {
    return Roles.getUsersInRole('parentOrAdvisor');
  */
  } else if (tmpl.activeGroup.get()) {
    var groupID = tmpl.activeGroup.get();
    var members = Meteor.groupMemberIds('current',groupID);
    if (members.length)
      return members;
    members = Meteor.groupMemberIds('final',groupID);
    if (members.length)
      return members;
    members = Meteor.groupMemberIds('former',groupID);
    if (members.length)
      return members;
    return ''
  } else if (tmpl.activeSection.get()) {
    return Meteor.sectionMemberIds(tmpl.activeSection.get());
  } else {
    return [];
  }
}

/** potential participants helper **/
var potentialParticipants = function() {
  var tmpl = Template.instance();
  if (tmpl.choseTeachers.get()) {
    return Roles.getUsersInRole('teacher');
  /* parents in calendar events not yet implemented
  } else if (tmpl.choseParents.get()) {
    return Roles.getUsersInRole('parentOrAdvisor');
  */
  } else if (tmpl.activeGroup.get()) {
    var groupID = tmpl.activeGroup.get();
    var members = Meteor.groupMembers('current',groupID);
    if (members.count())
      return members;
    members = Meteor.groupMembers('final',groupID);
    if (members.count())
      return members;
    members = Meteor.groupMembers('former',groupID);
    if (members.count())
      return members;
    return ''
  } else if (tmpl.activeSection.get()) {
    return Meteor.sectionMembers(tmpl.activeSection.get());
  }
}

Template.calendarEventModal.helpers({
  //header
  calendarEvent: function() {
    var tmpl = Template.instance();
    return tmpl.calendarEvent.get();
  },
  formatDate: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateFormat) : '_____';
  },
  formatDateTime: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateTimeFormat) : '_____';
  },
  //link with activity
  units: function() {
    return Units.find({visible:true});
  },
  activeUnit: function() {
    var tmpl = Template.instance();
    var unitID = tmpl.activeUnit.get();
    return Units.findOne(unitID);
  },
  unitBgPrimary: function() {
    var tmpl = Template.instance();
    var unitID = tmpl.activeUnit.get();
    return (unitID == this._id) ? 'bg-primary' : '';  
  },
  activeUnitActivities: function() {
    var tmpl = Template.instance();
    var unitID = tmpl.activeUnit.get();
    return Activities.find({
      visible: true,
      unitID: unitID
    })
  },
  selectedActivity: function() {
    return Activities.findOne(this.activityID);
  },
  activityBgPrimary: function() {
    var instance = Template.instance();
    var calendarEvent = instance.calendarEvent.get();
    return (calendarEvent.activityID == this._id) ? 'bg-primary' : '';
  },
  //title
  //time period
  editingTimePeriods: function() {
    var instance = Template.instance();
    var cU = Meteor.userId();
    return (Roles.userIsInRole(cU,'teacher') && instance.editingTimePeriods.get());
  },
  daysOfTheWeek: function() {
    return [{day:'Mon',abbreviation:'M'},
            {day:'Tue',abbreviation:'T'},
            {day:'Wed',abbreviation: 'W'},
            {day:'Thu',abbreviation: 'Th'},
            {day: 'Fri',abbreviation: 'F'}
           ]
  },
  //participants
  participants: function() {
    var numberOfParticipants = this.participants.length;
    if (!numberOfParticipants)
      return 'participants: none';
    var participants = 'participants: ';
    this.participants.forEach(function(id,ndex,g) {
      participants += Meteor.getUserOrSectionName(id);
      if (ndex == numberOfParticipants - 2) {
        participants += ' and ';
      } else if (ndex < numberOfParticipants - 2) {
        participants += ', ';
      } 
    }) 
    return participants;
  },
  invitees: function() {
    var numberInvited = this.invite.length;
    if (!numberInvited)
      return '';
    var invitees =  '<br/>';
    invitees += 'invited: ';
    this.invite.forEach(function(id,ndex,g) {
      invitees += Meteor.getUserOrSectionName(id);
      if (ndex == numberInvited - 2) {
        invitees += ' and ';
      } else if (ndex < numberInvited - 2) {
        invitees += ', ';
      } 
    }) 
    return invitees;
  },
  choseTeachersBgPrimary: function() {
    var tmpl = Template.instance();
    return (tmpl.choseTeachers.get()) ? 'bg-primary' : '';
  },
  choseParentsBgPrimary: function() {
    var tmpl = Template.instance();
    return (tmpl.choseParents.get()) ? 'bg-primary' : '';
  },
  sections: function() {
    return Sections.find();
  },
  activeSection: function() {
    var tmpl = Template.instance();
    var sectionID = tmpl.activeSection.get();
    return Sections.findOne(sectionID);
  },
  sectionBgPrimary: function() {
    var tmpl = Template.instance();
    var sectionID = tmpl.activeSection.get();
    return (sectionID == this._id) ? 'bg-primary' : '';  
  },
  groups: function() {
    var tmpl = Template.instance();
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      var sectionID = tmpl.activeSection.get();
      var sectionMemberIDs = Meteor.sectionMemberIds(sectionID);
      var groupIDs = [];
      sectionMemberIDs.forEach(function(studentID) {
        var currentGroupID = Meteor.currentGroupId(studentID);
        if (currentGroupID)
          groupIDs.push(currentGroupID);
      });
      groupIDs = _.unique(groupIDs);
      return groupsWithNames(groupIDs);
    } else if (Roles.userIsInRole(cU,'student')) {
      var groupIDs = _.pluck(Memberships.find({memberID:cU,collectionName:'Groups'},{fields:{itemID:1},sort:{startDate:-1}}).fetch(),'itemID');
      groupIDs = _.unique(groupIDs);
      return groupsWithNames(groupIDs);
    } else {
      return '';
    }
  },
  activeGroup: function() {
    var tmpl = Template.instance();
    var groupID = tmpl.activeGroup.get();
    if (!groupID)
      return '';
    return groupsWithNames([groupID])[0];
  },
  groupBgPrimary: function() {
    var tmpl = Template.instance();
    var groupID = tmpl.activeGroup.get();
    return (groupID == this._id) ? 'bg-primary' : '';  
  },
  potentialParticipants: potentialParticipants,
  participantBg: function() {
    var tmpl = Template.instance();
    var cE = tmpl.calendarEvent.get();
    if (_.contains(cE.participants,this._id)) {
      return 'bg-primary'
    } else if  (_.contains(cE.invite,this._id)) {
      return 'bg-success'
    } else {
      return '';
    }
  },
  sectionBg: function() {
    var tmpl = Template.instance();
    var cE = tmpl.calendarEvent.get();
    return (_.contains(cE.participants,this._id)) ? 'bg-primary' : '';
  },
  participantSelectionDisabled: function() {
    var instance = Template.instance();
    var cE = instance.calendarEvent.get();
    var cU = Meteor.userId();
    return (!Roles.userIsInRole(cU,'teacher') && _.contains(cE.participants,this._id)) ? 'disabled text-black' : '';
  },
  //todo list
  temporaryTodos: function() {
    var instance = Template.instance();
    return instance.Todos.get();
  },
  todoCount: function() {
    return Todos.find({calendarEventID:this._id}).count();
  },
  todos: function() {
    return Todos.find({calendarEventID:this._id},{sort: {order:1}});
  },
  sortableOpts: function() {
    return {
      draggable:'.todoItem',
      handle: '.todoSortableHandle',
      collection: 'Todos',
      selectField: 'calendarEventID',
      selectValue: this._id
    }
  },
  //note
  //footer
  showSaveButton: function() { 
    //modify this to just automatically save when
    //conditions are met?  User just keeps editing
    //and can always delete if he/she wants
    var instance = Template.instance();
    var requiredFieldsFilled = dataValidated(instance);
    if (requiredFieldsFilled) {
      var cE = instance.calendarEvent.get();
      if (('_id' in cE) && (Match.test(cE._id,Match.idString))) {
       return false;
      } else {
        return true;
      }
    }
    return false;
  },
  showDeleteButton: function() {
    var instance = Template.instance();
    var cE = instance.calendarEvent.get();
    var cU = Meteor.userId();
    return (('_id' in cE) && 
      (Match.test(cE._id,Match.idString)) &&
      ((_.contains(cE.participants,cU)) || Roles.userIsInRole(cU,'teacher')));
  },
  deleteButtonText: function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher'))
      return 'Delete Calendar Event';
    else
      return 'Remove this event from my calendar.';
  },
  showAcceptInviteButton: function() {
    var instance = Template.instance();
    var cE = instance.calendarEvent.get();
    var cU = Meteor.userId();
    return (('_id' in cE) && 
      (Match.test(cE._id,Match.idString)) &&
      (_.contains(cE.invite,cU)));
  },
  backgroundColor: function() {
    var instance = Template.instance();
    return instance.backgroundColor.get();
  },
  message: function() {
    var instance = Template.instance();
    return instance.message.get();
  }
})

/** events **/
Template.calendarEventModal.events({
  //linked activity
  'click .unitTitle' : function(event,tmpl) {
    tmpl.activeUnit.set(this._id);
    event.preventDefault();
  },
  'click .activityForChoosing' : function(event,tmpl) {
    tmpl.setCalendarEventFields({activityID:this._id});
    var cE = tmpl.calendarEvent.get();
    if (!cE.title) {
      var title = this.title; 
      if (this.tag)
        title += ' (' + this.tag + ')';
      tmpl.setCalendarEventFields({title:title});
      tmpl.$('#calEventModalTitle').text(title);
    }
    event.preventDefault();
  },
  'click .chooseNoActivity' : function(event,tmpl) {
    tmpl.setCalendarEventFields({activityID:null});
    event.preventDefault();    
  },
  //title
  'blur #calEventModalTitle' : function(event,tmpl) {
    var $element = $(event.target);
    var text = _.trim(_.stripTags($element.text()));
    tmpl.setCalendarEventFields({title:text});
  },
  //time period
  'click #editTimePeriod' : function(event,tmpl) {
    tmpl.editingTimePeriods.set(true);
    event.preventDefault();
  },
  'click #stopEditingTimePeriod' : function(event,tmpl) {
    tmpl.editingTimePeriods.set(false);
    event.preventDefault();
  },
  /* need events for when dates are changed */
  /* need events for edit buttons */
  //participants
  'click .chooseTeachers': function(event,tmpl) {
    tmpl.choseTeachers.set(true);
    tmpl.activeSection.set(null);
    tmpl.activeGroup.set(null);
    tmpl.choseParents.set(false);
    event.stopPropagation();
  },
  'click .chooseParents': function(event,tmpl) {
    tmpl.choseTeachers.set(false);
    tmpl.activeSection.set(null);
    tmpl.activeGroup.set(null);
    tmpl.choseParents.set(true);
    event.stopPropagation();
  },
  'click .sectionName' : function(event,tmpl) {
    var sectionID = tmpl.activeSection.get();
    if (this._id != sectionID) {
      tmpl.activeSection.set(this._id);
      tmpl.activeGroup.set(null);
      tmpl.choseTeachers.set(false);
      tmpl.choseParents.set(false);
    }
    event.stopPropagation();
  },
  'click .chooseNoSection' : function(event,tmpl) {
    tmpl.activeSection.set(null);
    tmpl.activeGroup.set(null);
    event.stopPropagation();    
  },
  'click .groupNames' : function(event,tmpl) {
    tmpl.activeGroup.set(this._id);
    tmpl.choseTeachers.set(false);
    tmpl.choseParents.set(false);
    event.stopPropagation();
  },
  'click .chooseNoGroup' : function(event,tmpl) {
    tmpl.activeGroup.set(null);
    event.stopPropagation(); //not working, menu closes anyway!   
  },
  'click .chooseAllParticipants' : function(event,tmpl) {
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher'))
      bootbox.alert('Only teachers may add students directly to the participants list.');      
    tmpl.addToParticipants(potentialParticipantIds());  
    event.stopPropagation();
  },
  'click .inviteAllParticipants': function(event,tmpl) {
    var cU = Meteor.userId();
    tmpl.addToCalendarInviteList(potentialParticipantIds());
    event.stopPropagation();
  },
  'click .unselectParticipants' : function(event,tmpl) {
    //var cE = tmpl.calendarEvent.get();
    //if (_.difference(potPs,cE.participants).length == 0)
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      tmpl.removeFromParticipants(potentialParticipantIds());  
      tmpl.removeFromCalendarInviteList(potentialParticipantIds());  
    } else if (Roles.userIsInRole(cU,'student')) {
      tmpl.removeFromCalendarInviteList(potentialParticipantIds());
    } else {
      alert('Only teachers and students may edit the invitation list.')
    }
    event.stopPropagation();
  },
  'click .chooseSection': function(event,tmpl) {
    var cU = Meteor.userId();
    var cE = tmpl.calendarEvent.get();
    if (!Roles.userIsInRole(cU,'teacher'))
      bootbox.alert('Only teachers can create a calendar event for the entire section.');
    if (_.contains(cE.participants,this._id)) {
      tmpl.removeFromParticipants(this._id);
    } else {
      tmpl.addToParticipants(this._id);
    }
    event.stopPropagation();
  },
  'click .participantName' : function(event,tmpl) {
    var cU = Meteor.userId();
    var cE = tmpl.calendarEvent.get();
    if (Roles.userIsInRole(cU,'teacher')) {
      if (_.contains(cE.participants,this._id)) {
        tmpl.removeFromParticipants(this._id);
        tmpl.addToCalendarInviteList(this._id);
      } else if (_.contains(cE.invite,this._id)) {
        tmpl.removeFromCalendarInviteList(this._id);
      } else {
        tmpl.addToParticipants(this._id);
      }
    } else if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(cE.participants,cU)) 
        return bootbox.alert('You cannot edit the invitation list unless you are a current participant.');
      if (_.contains(cE.participants,this._id)) {
        return bootbox.alert('You can only edit the invitation list.  Another user must remove themselves from the participant list by deleting the event from their own calendar.');
      } else if (_.contains(cE.invite,this._id)) {
        tmpl.removeFromCalendarInviteList(this._id);
      } else {      
        tmpl.addToCalendarInviteList(this._id);
      }
    } else {
      bootbox.alert('Only teachers and students may invite additional participants.')
    }
    event.stopPropagation();
  },
  //todo list
  //note
  //footer
  'click .close': function(event,instance) {
    instance.setCalendarEventNull();
    instance.Todos.set([]);
  },
  'click #saveCalendarEvent' : function(event,tmpl) {;
    if (dataValidated(tmpl)) {
      var calendarEvent = tmpl.calendarEvent.get()
      if (('_id' in calendarEvent) && Match.test(calendarEvent._id,Match.idString)) {
        //editing existing calendar event ... save button should not have been clicked (or even visible)
        //but regardless, do nothing because once calendar event is saved to the server, edits are saved one at a time as each change is made
      } else {
        Meteor.call('insertCalendarEvent',calendarEvent,function(error,id) {
          if (error) { 
            return alert(error.reason);
          } else {
            tmpl.setCalendarEventFields({_id:id});
            tmpl.backgroundColor.set('success');
            tmpl.message.set('New calendar event successfully saved.  <br>Additional changes will be saved as they are made, or for a text field when you click outside its blue box after editing.');
            var todos = tmpl.Todos.get();
            todos.forEach(function(todo){
              todo.calendarEventID = id;
              delete todo.order;
              Meteor.call('insertTodo',todo,alertOnError);
            })
            tmpl.Todos.set([]);
            Meteor.subscribe('todos',id);
          }
        });
      }
    } 
  },
  'click #deleteCalendarEvent' : function(event,instance) {
      var calendarEvent = instance.calendarEvent.get()
      if (('_id' in calendarEvent) && Match.test(calendarEvent._id,Match.idString)) {
        var cU = Meteor.userId();
        if (Roles.userIsInRole(cU,'teacher')) {
          var confirmMessage = 'This will remove this calendar event from all calendars and delete all associated information.  Are you sure you want to proceed?';
        } else if (Roles.userIsInRole(cU,'student')) {
          var confirmMessage = 'This will remove this calendar event from your calendar. Are you sure you want to proceed?';
        } else { 
          alert('Only a teacher or student can delete a calendar event.');
        }

        bootbox.confirm({
          title: 'Delete this calendar event?',
          message: confirmMessage,
          callback: function(response) {
            if (response) {
              Meteor.call('deleteCalendarEvent',calendarEvent._id,function(error,id) {
                if (error) {
                  alert(error.reason);
                } else {
                  instance.setCalendarEventNull();
                  instance.Todos.set([]);
                  $('#calendarEventModal').modal('hide');
                }
              });
            }
          }
        })
      } else {
         bootbox.alert('Error:  Could not find calendar event to delete.')
      }    
  },
  'click #acceptCalendarInvite' : function(event,instance) {
    instance.acceptCalendarInvite();
  },
  'click #declineCalendarInvite' : function(event,instance) {
    instance.declineCalendarInvite();
    instance.setCalendarEventNull();
    instance.Todos.set([]);
    $('#calendarEventModal').modal('hide');    
  }
})

  /*******************/
 /**** TEMP TODO ****/
/*******************/

Template.tempTodo.events({
  'blur .calEventModalTempTodo': function(event,tmpl) {
    var $element = $(event.target);
    var text = _.trim(_.stripTags($element.text()));
    if (!text) //prevents ghost remnant that combines with next element afer template is destroyed
      $element.empty();
    tmpl.parent().updateTodo(text,this.order);     
  }
})

  /***********************/
 /**** NEW TEMP TODO ****/
/***********************/

Template.newTempTodo.events({
  'blur #calEventModalNewTempTodo': function(event,tmpl) {
    var $element = $(event.target);
    var text = _.trim(_.stripTags($element.text())); 
    tmpl.parent().insertTodo(text);  
    $element.text(''); 
  }
})

  /*******************/
 /**** TODO ITEM ****/
/*******************/

Template.todoItem.helpers({
  checked: function() {
    return (this.completed) ? 'check' : 'unchecked';
  }
})

Template.todoItem.events({
  'click .glyphicon-check': function(event,instance) {
    Meteor.call('markTodoIncomplete',this._id);
  },
  'click .glyphicon-unchecked': function(event,instance) {
    Meteor.call('markTodoComplete',this._id);
  }
})

  /******************/
 /**** NEW TODO ****/
/******************/

Template.newTodo.events({
  'blur #calEventModalNewTodo': function(event,tmpl) {
    var $element = $(event.target);
    var text = _.trim(_.stripTags($element.text()));
    Meteor.call('insertTodo',{
      text:text,
      calendarEventID: this._id
    },alertOnError);
    $element.text(''); 
  }
})



