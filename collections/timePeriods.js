TimePeriods = new Meteor.Collection('TimePeriods');

Meteor.methods({

  /***** ADD TIME PERIOD ****/
  setTimePeriod: function(name,timePeriod) {
    check(name,String);
    check(timePeriod,Match.timePeriod);
    /* at least one of
      Mon: {start:'h:mm a',end:'h:mm a'} //with end > start
      Tue: same
      Wed: same
      Thu: same
      Fri: same
    */

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a section.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can create a section.')

    var tP = TimePeriods.findOne({name:name}); 
    if (tP) {
      return TimePeriods.update(tP._id,{$set: timePeriod});
    } else {
      timePeriod.name = name;
      return TimePeriods.insert(timePeriod);
    }
  },

  /***** CLEAR TIME PERIOD ****/
  clearTimePeriod: function(name,days) {
    check(name,String);
    check(days,[Match.OneOf('Mon','Tue','Wed','Thu','Fri')]);
    if (!days.length)
      return;

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a section.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can create a section.')

    var tP = TimePeriods.findOne({name:name}); 
    if (tP) {
      var timePeriod = {};
      days.forEach(function(day) {
        timePeriod[day] = '';
      })
      var returnVal = TimePeriods.update(tP._id,{$unset: timePeriod});
      var tP = TimePeriods.findOne({name:name}); 
      if (_.keys(tP).length == 2) { //all days have been cleared
        return TimePeriods.remove(tP._id)
      } else {
        return returnVal;
      }
    } else {
      throw new Meteor.Error('timePeriodNotFound', "Cannot clear dates from time period. " + name + " not found. Either it hasn't been created yet, or it was completely cleared and needs to be created again.  Just save new days and times under this name to create the time period.");
    }
  }
});
