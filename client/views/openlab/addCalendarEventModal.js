  /**********************************/
 /**** ADD CALENDAR EVENT MODAL ****/
/**********************************/

Template.addCalendarEventModal.onCreated(function() {
  this.calendarEvent = new ReactiveVar({});
  this.activeUnit = new ReactiveVar(openlabSession.get('activeUnit'));
});

Template.addCalendarEventModal.events({
  'show.bs.modal #addCalendarEventModal': function(event,tmpl) {
    var calendarEvent = Session.get('calendarEvent');
    calendarEvent.group = calendarEvent.group || [Meteor.impersonatedOrUserId()];
    calendarEvent.invite = calendarEvent.invite || [];
    calendarEvent.workplace = 'OOC';
    calendarEvent.note = calendarEvent.note || '';
    calendarEvent.title = calendarEvent.title || '';
    calendarEvent.activityID = calendarEvent.activityID || null;
    calendarEvent.startTime = calendarEvent.date;
    calendarEvent.endTime = calendarEvent.date;
    var selectedSection = Meteor.selectedSection();
    if (selectedSection) {
      calendarEvent.nameOfTimePeriod = selectedSection.name || '';
    } else {
      calendarEvent.nameOfTimePeriod = '';
    }
    tmpl.calendarEvent.set(calendarEvent);
    tmpl.activeUnit.set(openlabSession.get('activeUnit'));
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
    var tmpl = Template.instance();
    var calendarEvent = tmpl.calendarEvent.get();
    if (!('activityID' in calendarEvent))
      return '';
    return (calendarEvent.activityID == this._id) ? 'active' : '';
  },
  dataValidated: function() {
    var tmpl = Template.instance();
    var calendarEvent = tmpl.calendarEvent.get();

    return Match.test(calendarEvent,Match.ObjectIncluding({
      activityID: Match.idString, //Match.oneOf(Match.idString,null), make more sophisticated later
      date: Date,
      group: [Match.idString], //contains userIDs, sectionIDs, or siteID
      invite: [Match.idString], //contains only userIDs
      workplace: Match.OneOf('OOC','FTF','HOM'),
      title: Match.nonEmptyString, //must be present if activityID is null, otherwise filled from activity
      note: String, 
      startTime: Date,
      endTime: Date,
      nameOfTimePeriod: String
    }));
  }
})

Template.addCalendarEventModal.events({
  'click .unitTitle' : function(event,tmpl) {
    tmpl.activeUnit.set(this._id)
  },
  'click .activityForChoosing' : function(event,tmpl) {
    var calendarEvent = tmpl.calendarEvent.get();
    calendarEvent.activityID = this._id;
    var activity = Activities.findOne(this._id);
    calendarEvent.title = activity.title;
    tmpl.calendarEvent.set(calendarEvent);
  },
  'click #saveCalendarEvent' : function(event,tmpl) {
    var calendarEvent = tmpl.calendarEvent.get();
    if ('_id' in calendarEvent) {
      Meteor.call('updateCalendarEvent',calendarEvent);
    } else {
      Meteor.call('insertCalendarEvent',calendarEvent);
    }
    $('#addCalendarEventModal').modal('hide');
  }
})

