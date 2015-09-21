  /*************************/
 /***** CALENDAR  *********/
/*************************/
Template.calendar.onCreated(function() {
  instance = this;
  instance.autorun(function() {
    instance.subscribe('calendarEvents',Meteor.impersonatedOrUserId());
  })
})

Template.calendar.onRendered(function(){
  var MonThisWeek = moment().day("Monday").format('ddd[,] MMM D YYYY');
  var MonNextWeek = moment().day("Monday").add(1,'weeks').format('ddd[,] MMM D YYYY');
  Session.setDefault('calStartDate',MonThisWeek);
  Session.setDefault('calEndDate',MonNextWeek);

  //initialize date-pickers
});

Template.calendar.helpers({
  calendarWeeks: function() {
    var startDate = Session.get('calStartDate');
    var endDate = Session.get('calEndDate');
    var calendarWeeks = []; 
    startDate = moment(startDate,'ddd[,] MMM D YYYY'); 
    endDate = moment(endDate,'ddd[,] MMM D YYYY').add(1,'days'); 
    for (date=startDate; date.isBefore(endDate); date.add(1,'weeks')) {
      calendarWeeks.push({monOfWeek : date.format('ddd[,] MMM D YYYY')});
    };
    return calendarWeeks;
  }
});



  /*************************/
 /***** CALENDAR WEEK *****/
/*************************/

moment.locale('en', { //overriding calendar formatting from moment.js
    calendar : {
        lastDay : 'ddd[,] MMM D',
        sameDay : '[Today]',
        nextDay : 'ddd[,] MMM D',
        lastWeek : 'ddd[,] MMM D',
        nextWeek : 'ddd[,] MMM D',
        sameElse : 'ddd[,] MMM D'
    }
});

Template.calendarWeek.helpers({
  weekDays: function() {
    var Monday = moment(this.monOfWeek,'ddd[,] MMM D YYYY');
    var Friday = moment(this.monOfWeek,'ddd[,] MMM D YYYY').add(4,'days').add(1,'hours');
    var weekDays = [];
    for (day = Monday; day.isBefore(Friday); day.add(1,'days')) {
      weekDays.push({
        date: day.format('MM/DD/YYYY'),
        day: day.calendar()
      });
    };
    return weekDays;
  }           
});

  /*************************/
 /***** CALENDAR DAY ******/
/*************************/

Template.calendarDay.helpers({ 
  daysEvents : function() { 
    var userToShow = [Meteor.impersonatedOrUserId(),Meteor.selectedSection(),Site.findOne()._id];
    var dateMin1h = moment(this.date).subtract(1,'hours').toDate();
    var datePlus1h = moment(this.date).add(1,'hours').toDate();
    return CalendarEvents.find({
        group: {$in: userToShow}, 
        visible: true,
        date: {
          $gt: dateMin1h,
          $lt: datePlus1h
        }
    });
  }
});

Template.calendarDay.events({
  'click td.calendar-day': function(event,tmpl) {
    var calendarEvent = {
      date: new Date(tmpl.data.date)
    }
    Session.set('calendarEvent',calendarEvent);
    $('#addCalendarEventModal').modal();
  },
  'click div.daysEvents p.calendarEvent': function(event,tmpl) {
    event.stopPropagation();
  }
});



  /*************************/
 /***** CALENDAR EVENT ****/
/*************************/

Template.calendarEvent.events({
  'click .editCalendarEvent': function(event,tmpl) {
    Session.set('calendarEvent',this);
    $('#addCalendarEventModal').modal();    
  }
});

Template.calendarEvent.helpers({
  title: function() {
    return (this.activityID) ? Activities.findOne(this.activityID).title : this.title;
  },
  pointsToOrID: function() {
    var activity = Activities.findOne(this.activityID);
    return activity.pointsTo || activity._id;
  }
});