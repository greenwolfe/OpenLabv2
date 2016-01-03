  /**********************************/
 /**** ADD CALENDAR EVENT MODAL ****/
/**********************************/

Template.addCalendarEventModal.onCreated(function() {
  var instance = this;
  instance.activeUnit = new ReactiveVar(openlabSession.get('activeUnit'));
  instance.calendarEvent = new ReactiveVar({});
  instance.setCalendarEventFields = function(newFields) {
    var cE = instance.calendarEvent.get();
    _.forEach(newFields,function(value,key) {
      cE[key] = value;
    });
    instance.calendarEvent.set(cE);
  }
  instance.setCalendarEventNull = function() {
    instance.calendarEvent.set({
      date: new Date(0),
      group: [],
      activityID: null,
      title: '',
      workplace: 'OOC',
      note: '',
      startTime: new Date(0),
      endtime: new Date(0),
      nameOfTimePeriod: '',
      invite: []
    });
  }
  instance.setCalendarEventNull();
});

Template.addCalendarEventModal.onRendered(function() {
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
})

Template.addCalendarEventModal.events({
  'show.bs.modal #addCalendarEventModal': function(event,tmpl) {
    tmpl.activeUnit.set(openlabSession.get('activeUnit'));
    var dateOrID = Session.get('dateOrIDForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(dateOrID);
    if (calendarEvent) {
      tmpl.calendarEvent.set(calendarEvent);
    } else {
      tmpl.setCalendarEventNull();
      tmpl.setCalendarEventFields({date:dateOrID});
      calendarEvent = tmpl.calendarEvent.get();
    }
    tmpl.$calEventModalNote.code(calendarEvent.note);  
    tmpl.$('#calEventModalTitle').text(calendarEvent.title);
  }
})

var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
var dateFormat = "ddd, MMM D YYYY";

Template.addCalendarEventModal.helpers({
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
    var tmpl = Template.instance();
    var calendarEvent = tmpl.calendarEvent.get();
    return (calendarEvent.activityID == this._id) ? 'bg-primary' : '';
  },
  dataValidated: function() { //revise!
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(calendarEventID);
    if (!calendarEvent) return false;
    return (calendarEvent.dataValidated)
  },
  messageType: function() { //revise?
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(calendarEventID);
    if (!calendarEvent) return 'warning';
    return (calendarEvent.dataValidated) ? 'success' : 'warning';
  },
  saveButtonDisabled: function() { //revise!!
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(calendarEventID);
    if (!calendarEvent) return 'disabled';
    return (this.dataValidated) ? '' : 'disabled';
  }
})

Template.addCalendarEventModal.events({
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
  'blur #calEventModalTitle' : function(event,tmpl) {
    var $element = $(event.target);
    var text = _.trim(_.stripTags($element.text()));
    tmpl.setCalendarEventFields({title:text});
  },
  'click .close': function(event,tmpl) {
    tmpl.setCalendarEventNull();
  },
  'click #saveCalendarEvent' : function(event,tmpl) {
    var calendarEvent = tmpl.calendarEvent.get();
    console.log(calendarEvent);
    tmpl.setCalendarEventNull();
    $('#addCalendarEventModal').modal('hide');
  }
})



