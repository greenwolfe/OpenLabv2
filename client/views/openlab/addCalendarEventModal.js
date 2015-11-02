  /**********************************/
 /**** ADD CALENDAR EVENT MODAL ****/
/**********************************/

Template.addCalendarEventModal.onCreated(function() {
  this.activeUnit = new ReactiveVar(openlabSession.get('activeUnit'));
});

Template.addCalendarEventModal.onRendered(function() {
  this.$('#calEventModalNote').summernote({ //default/standard air popover toolbar
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
    ]
  })
})

Template.addCalendarEventModal.events({
  'show.bs.modal #addCalendarEventModal': function(event,tmpl) {
    tmpl.activeUnit.set(openlabSession.get('activeUnit'));
    var note = '';
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(calendarEventID);
    if (calendarEvent)
      note = calendarEvent.note;
    $('#calEventModalNote').code(note);   
  }
})

var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
var dateFormat = "ddd, MMM D YYYY";

Template.addCalendarEventModal.helpers({
  calendarEvent: function() {
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    return CalendarEvents.findOne(calendarEventID);
  },
  title: function() {
    if (this.title) return this.title;
    if (this.activityID) {
      var activity = Activities.findOne(this.activityID);
      if (activity)
        return activity.title;
    }
    return '';
  },
  tags: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var activityID = this.activityID;
    var activity = Activities.findOne(activityID);
    if (!activity)
      return '';
    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
    var tags = '';
    if (activity.tag) 
      tags += ' (' + activity.tag + ')';
    if ((status) && (status.tag))
      tags += '<strong> (' + status.tag + ')</strong>';
    return tags;    
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
  active: function() {
    var tmpl = Template.instance();
    return (this._id == tmpl.activeUnit.get()) ? 'active' : '';
  },
  activeUnit: function() {
    var tmpl = Template.instance();
    var unitID = tmpl.activeUnit.get();
    return Units.findOne(unitID);
  },
  activeUnitActivities: function() {
    var tmpl = Template.instance();
    var unitID = tmpl.activeUnit.get();
    return Activities.find({
      visible: true,
      unitID: unitID
    })
  },
  activeActivity: function() {
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(calendarEventID);
    if (!calendarEvent) return '';
    return (calendarEvent.activityID == this._id) ? 'active' : '';
  },
  dataValidated: function() {
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(calendarEventID);
    if (!calendarEvent) return false;
    return (calendarEvent.dataValidated)
  },
  messageType: function() {
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    var calendarEvent =  CalendarEvents.findOne(calendarEventID);
    if (!calendarEvent) return 'warning';
    return (calendarEvent.dataValidated) ? 'success' : 'warning';
  },
  saveButtonDisabled: function() {
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
    var activity = Activities.findOne(this._id);
    var calendarEventID = Session.get('eventIdForAddCalendarEventModal');
    Meteor.call('updateCalendarEvent',{_id: calendarEventID,activityID: this._id,});
    event.preventDefault();
  },
  'click #saveCalendarEvent' : function(event,tmpl) {
    var note = tmpl.$('#calEventModalNote').code();
    console.log(note);
    $('#addCalendarEventModal').modal('hide');
  }
})

