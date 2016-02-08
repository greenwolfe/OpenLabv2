  /*************************/
 /***** CALENDAR  *********/
/*************************/
Template.calendar.onCreated(function() {

})

var dateFormat = "ddd, MMM D YYYY";
Template.calendar.onRendered(function(){
  var MonThisWeek = moment().day("Monday").format(dateFormat);
  var MonNextWeek = moment().day("Monday").add(1,'weeks').format(dateFormat);
  Session.setDefault('calStartDate',MonThisWeek);
  Session.setDefault('calEndDate',MonNextWeek);
  instance = this;
  //need to subscribe to section and course events
  instance.autorun(function() {
    instance.subscribe('calendarEvents',Meteor.impersonatedOrUserId());
  })
  instance.$('#calendarStartDate').datetimepicker({
    showClose:  true,
    showClear: true,
    keepOpen: false,
    format: dateFormat,
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
  instance.$('#calendarStartDate').data('DateTimePicker').date(MonThisWeek);
  instance.$('#calendarEndDate').datetimepicker({
    showClose:  true,
    showClear: true,
    keepOpen: false,
    format: dateFormat,
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
  instance.$('#calendarEndDate').data('DateTimePicker').date(MonNextWeek);
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

Template.calendar.events({
  'dp.change #calendarStartDate': function(event,instance) {
    //link the pickers to ensure startDate < endDate
    //reset session variable based on change
    if (event.date) {
      var monOfWeek = event.date.day("Monday").format(dateFormat);
      if (monOfWeek != Session.get('calStartDate')) {
        var monNextWeek = event.date.day("Monday").add(1,'weeks').format(dateFormat);
        instance.$('#calendarEndDate').data("DateTimePicker").minDate(monNextWeek);
        Session.set('calStartDate',monOfWeek);
      }
    } else {

    }
  },
  'dp.change #calendarEndDate': function(event,instance) {
   //link the pickers to ensure startDate < endDate
    //reset session variable based on change
    if (event.date) {
      var monOfWeek = event.date.day("Monday").format(dateFormat);
      if (monOfWeek != Session.get('calEndDate')) {
        var monLastWeek = event.date.day("Monday").subtract(1,'weeks').format(dateFormat);
        instance.$('#calendarStartDate').data("DateTimePicker").maxDate(monLastWeek);
        Session.set('calEndDate',monOfWeek);
      }
    } else {

    }
  },
})



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
    var cU = Meteor.userId();
    var userToShow = [Site.findOne()._id]; 
    if (Roles.userIsInRole(cU,'teacher')) {
      var studentID = Meteor.impersonatedId();
      var sectionID = Meteor.selectedSectionId();
      if (studentID) {
        userToShow.push(studentID);
      } else if (sectionID) {
        userToShow.push(sectionID);
        userToShow = _.union(userToShow,Meteor.sectionMemberIds(sectionID));
      } else {
        userToShow.push(cU);
      }
    } else {
      userToShow.push(Meteor.impersonatedOrUserId());  //impersonatedOrUser to include parent impersonating student
      userToShow.push(Meteor.selectedSectionId());
    }
    var dateMin1h = moment(this.date,'MM/DD/YYYY').subtract(1,'hours').toDate();
    var datePlus1h = moment(this.date,'MM/DD/YYYY').add(1,'hours').toDate();
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
    var cU = Meteor.userId();
    if (!cU || !Roles.userIsInRole(cU,['teacher','student']))
      return;
    Session.set('dateOrIDForCalendarEventModal',new Date(tmpl.data.date));
    $('#calendarEventModal').modal();
  },
  'click div.daysEvents p.calendarEvent': function(event,tmpl) {
    //don't open modal if click on an existing calendar event
    event.stopPropagation();
  }
});



  /*************************/
 /***** CALENDAR EVENT ****/
/*************************/

Template.calendarEvent.events({
  'click .editCalendarEvent': function(event,tmpl) {
    var cU = Meteor.userId();
    if (!cU || !Roles.userIsInRole(cU,['teacher','student']))
      return;
    Session.set('dateOrIDForCalendarEventModal',this._id);
    $('#calendarEventModal').modal();    
  }
});

Template.calendarEvent.helpers({
  activity: function() {
    return Activities.findOne(this.activityID);
  },
  progressIcon: function() {
    if (this.numberOfTodoItems == 0)
      return 'icon-notStarted';
    var icons = ['icon-notStarted','icon-oneBar','icon-twoBars','icon-threeBars','icon-fourBars','icon-fiveBars'];
    var fractionComplete = Math.round(5*this.numberTodosCompleted/this.numberOfTodoItems);
    return icons[fractionComplete];
  },
  progressMessage: function() {
    return this.numberTodosCompleted + ' out of ' + this.numberOfTodoItems + ' tasks complete.';
  },
  titleWithTags: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var activityID = this._id;
    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
    var tags = '';
    if (this.tag) 
      tags += ' (' + this.tag + ')';
    if ((status) && (status.tag))
      tags += '<strong> (' + status.tag + ')</strong>';
    var unit = Units.findOne(this.unitID);
    return unit.title + ': ' + this.title + ' ' + tags;  
  },
  pointsToOrID: function() {
    return this.pointsTo || this._id;
  },
  studentOrSectionID: function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      var studentID = Meteor.impersonatedId();
      if (studentID)
        return 'id=' + studentID;
      var sectionID = Meteor.selectedSectionId();
      if (sectionID)
        return 'id=' + sectionID;
      return '';
    } else {
      var studentID = Meteor.impersonatedOrUserId(); //in case is parent viewing as student
      if (studentID)
        return 'id=' + studentID; 
      return '';     
    }
  }
});