  /******************************/
 /**** CALENDAR EVENT MODAL ****/
/******************************/

Template.calendarEventModal.onCreated(function() {
  var instance = this;
  instance.activeUnit = new ReactiveVar(openlabSession.get('activeUnit'));

  instance.calendarEvent = new ReactiveVar({});
  instance.setCalendarEventFields = function(newFields) {
    var cE = instance.calendarEvent.get();
    if (('_id' in cE) && Match.test(cE._id,Match.idString)) {
      newFields._id = cE._id;
      Meteor.call('updateCalendarEvent',newFields,function(error,id){
        if (error) {
          instance.backgroundColor.set('warning');
          instance.message.set('Invalid value.  Changes will be saved whan a valid value is entered.'); 
        } else {
          instance.backgroundColor.set('info');
          instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
        }
      });
    }
    
    _.forEach(newFields,function(value,key) {
      cE[key] = value;
    });
    instance.calendarEvent.set(cE);
  }

  instance.Todos = new ReactiveVar([]); //only used if there is not yet a calendar Event
  instance.insertTodo = function(text) {
    if (Match.test(text,Match.nonEmptyString)) {
      var Todos = instance.Todos.get();
      var todo = {text:text,
                  order: Todos.length}
      Todos.push(todo);
      instance.Todos.set(Todos);
    }
  }
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

  instance.backgroundColor = new ReactiveVar('');
  instance.message = new ReactiveVar('');

  instance.setCalendarEventNull = function() {
    instance.calendarEvent.set({
      date: new Date(0),
      group: [Meteor.impersonatedOrUserId()],
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

Template.calendarEventModal.events({
  'show.bs.modal #calendarEventModal': function(event,tmpl) {
    tmpl.activeUnit.set(openlabSession.get('activeUnit'));
    var dateOrID = Session.get('dateOrIDForCalendarEventModal');
    if (dateOrID instanceof Date) {
      tmpl.setCalendarEventNull();
      tmpl.setCalendarEventFields({date:dateOrID});
      var calendarEvent = tmpl.calendarEvent.get();
      tmpl.Todos.set([]);
    } else {
      var calendarEvent =  CalendarEvents.findOne(dateOrID);
      tmpl.calendarEvent.set(calendarEvent);
      tmpl.Todos.set([]);
      instance.subscribe('todos',calendarEvent._id);
    }
    tmpl.$calEventModalNote.code(calendarEvent.note);  
    tmpl.$('#calEventModalTitle').text(calendarEvent.title);
  }
})

var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
var dateFormat = "ddd, MMM D YYYY";
var dataValidated = function() {
  var tmpl = Template.instance();
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
    group: [Match.idString], //contains userIDs, sectionIDs, or siteID
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

Template.calendarEventModal.helpers({
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
  //title
  //time period
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
  activityBgPrimary: function() {
    var instance = Template.instance();
    var calendarEvent = instance.calendarEvent.get();
    return (calendarEvent.activityID == this._id) ? 'bg-primary' : '';
  },
  showSaveButton: function() { 
    var instance = Template.instance();
    var requiredFieldsFilled = dataValidated();
    if (requiredFieldsFilled) {
      var cE = instance.calendarEvent.get();
      if (('_id' in cE) && (Match.test(cE._id,Match.idString))) {
        instance.backgroundColor.set('info');
        instance.message.set('Editing existing calendar event. <br>Changes are saved as they are made, or for a text field when you click outside its blue box after editing.');
        return false;
      } else {
        instance.backgroundColor.set('info');
        instance.message.set('All required fields filled.  <br>New calendar event not yet saved.');
        return true;
      }
    }
    return false;
  },
  showDeleteButton: function() {
    var instance = Template.instance();
    var cE = instance.calendarEvent.get();
    return (('_id' in cE) && (Match.test(cE._id,Match.idString)));
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

Template.calendarEventModal.events({
  //title
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
  //todo list
  //note
  //footer
  'click .close': function(event,instance) {
    instance.setCalendarEventNull();
    instance.Todos.set([]);
  },
  'click #saveCalendarEvent' : function(event,tmpl) {;
    if (dataValidated()) {
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
        if (!Roles.userIsInRole(cU,['teacher','student'])) 
          alert('Only a teacher or student can delete a calendar event.');
        if (Roles.userIsInRole(cU,'student')) {
          var userToRemove = cU;
        }
        if (Roles.userIsInRole(cU,'teacher')) {
          var studentID = Meteor.impersonatedId();
          if (!Roles.userIsInRole(studentID,'student')) //could be selected self or a whole section, or could be impersonating a parent
            studentID = null;
          var sectionID = Meteor.selectedSectionId();
          var userToRemove = studentID || sectionID || cU;
        }
        if (confirm('This will remove this calendar event from ' + Meteor.getUserOrSectionName(userToRemove) + "'s calendar.  Are you sure you want to proceed?"))
          Meteor.call('deleteCalendarEvent',calendarEvent._id,userToRemove,function(error,id) {
            if (error) {
              alert(error.reason);
            } else {
              instance.setCalendarEventNull();
              instance.Todos.set([]);
              $('#calendarEventModal').modal('hide');
            }

          });
      
      } else {
        alert('Error:  Could not find calendar event to delete.')
      }    
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



