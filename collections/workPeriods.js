WorkPeriods = new Meteor.Collection('WorkPeriods');
//new idea .. workPeriods are for sections.
//if Site is passed in, workPeriod is set for all sections
//make workPeriodOverrides a separate collection and run it
//for users only with groups allowed to be passed in
//title block of dateTimePicker says section name or override
//dateTimePicker has a Save, Override, and group override buttons with
//help text stating - for all sections, for B block or override: for this user, for (list of group members)
//if its already an override, then button says clear overried: for tihs user,for (list of group members) 
//overrides don't have unit start or end dates
//calculate a unit start and end date in the oncreated for activity list by taking min of unitStartDate and all override start Dates (max for endDate)
Meteor.methods({
  'setWorkPeriod': function(workPeriod) {
    check(workPeriod,{
      activityID: Match.idString,
      sectionID: Match.OneOf(Match.idString,'applyToAll'), 
      startDate: Date,
      endDate: Date,
      //below included to avoid check error in case it was easier to pass in the existing full record
      _id: Match.Optional(Match.idString), //check for existing workPeriod using activityID and sectionID rather than this value if its passed in
      unitID: Match.Optional(Match.idString), //set from activity below, reset by update hook whenver activity itself changes
      activityVisible: Match.Optional(Boolean), //same here
      unitStartDate: Match.Optional(Date), // will be set or reset in collection hook
      unitEndDate: Match.Optional(Date), //same here
      unitStartDateWithoutSelf: Match.Optional(Date), //same here
      unitEndDateWithoutSelf: Match.Optional(Date) //same here
    });

    var cU = Meteor.user();
    if (!cU)
      throw new Meteor.Error('notLoggedIn','You must be logged in to set or change a work period.');
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher','Only a teacher can set or change a work period.');

    var activity = Activities.findOne(workPeriod.activityID);
    if (!activity)
      throw new Meteor.Error('activity-not-found', "Cannot set work period, could not find activity " + workPeriod.activityID + '.');

    var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
    if (workPeriod.endDate < workPeriod.startDate)
      throw new Meteor.Error('invalid-work-period',"Cannot set work period.  end date " + moment(workPeriod.endDate).format(dateTimeFormat) + ' < start date ' + moment(workPeriod.endDate).format(dateTimeFormat) +'.');

    workPeriod = _.omit(workPeriod,'_id');
    workPeriod.unitID = activity.unitID;
    workPeriod.activityVisible = activity.visible;
    workPeriod.unitStartDate = workPeriod.startDate; //valid initial values, to be checked and modified later in collection hook
    workPeriod.unitEndDate = workPeriod.endDate;

    var selector =  (workPeriod.sectionID == 'applyToAll') ? {} : {_id:workPeriod.sectionID};
    Sections.find(selector).forEach(function(section) {
      var wP = WorkPeriods.findOne({sectionID:section._id,activityID:workPeriod.activityID});
      if (wP) {
          WorkPeriods.update(wP._id,{$set:{
            startDate:workPeriod.startDate,
            endDate:workPeriod.endDate,
          }});
      } else {
        workPeriod.sectionID = section._id;
        WorkPeriods.insert(workPeriod);
      }
    });
  },
  'deleteWorkPeriod': function(workPeriod) {
    check(workPeriod,Match.ObjectIncluding({
      sectionID: Match.OneOf(Match.idString,'applyToAll'), 
      _id: Match.idString,
      activityID: Match.idString
    }));

    var cU = Meteor.user();
    if (!cU)
      throw new Meteor.Error('notLoggedIn','You must be logged in to increment an activity status.');
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher','Only a teacher can set or change a work period.');

    wP = WorkPeriods.findOne(workPeriod._id);
    if (!wP)
      throw new Meteor.Error('workPeriod-not-found',"Cannot delete work period with id = , " + workPeriodID + " work period not found.")

    var selector =  (workPeriod.sectionID == 'applyToAll') ? {} : {_id:workPeriod.sectionID};
    Sections.find(selector).forEach(function(section) {
      var wP = WorkPeriods.findOne({sectionID:section._id,activityID:workPeriod.activityID});
      if (wP) {
        WorkPeriods.remove(wP._id);
      }
    });
  }
})

   /****************/
  /**** HOOKS *****/
 /****************/

WorkPeriods.after.update(function (userID, doc, fieldNames, modifier) {
  setUnitPeriod(doc);
});

WorkPeriods.after.insert(function(userID,doc) {
  setUnitPeriod(doc);
});

WorkPeriods.after.remove(function(userID,doc) {
  setUnitPeriod(doc);
});

var setUnitPeriod = function(workPeriod) {
  var selector = {
    sectionID:workPeriod.sectionID,
    unitID:workPeriod.unitID,
    activityVisible:true
  };
  var modifier = {};
  var workPeriodsCursor = WorkPeriods.find(selector);
  if (workPeriodsCursor.count() == 0) //last activity in unit was hidden or deleted
    return;
  var workPeriods = workPeriodsCursor.fetch();

  var startDates = _.pluck(workPeriods,'startDate');
  var unitStartDate = _.min(startDates);

  var endDates = _.pluck(workPeriods,'endDate');
  var unitEndDate = _.max(endDates);

  var modifier = {
    unitStartDate:unitStartDate,
    unitEndDate:unitEndDate,
  };

  //for each work period, also find min of dates without self,
  //to facilitate simulation of what happens when the date is edited before saving that change
  workPeriodsCursor.forEach(function(wP) {
    modifier.unitStartDateWithoutSelf = wayWayInTheFuture(); //default
    //remove one occurance of wP.startDate (incidentally, the one removed is the first one, but that is inconsequential)
    var selfStartDate = wP.startDate.getTime();
    var startDatesWithoutSelf = _.filter(startDates,function(value) { 
      if (!selfStartDate) //skip the rest and just keep the value if we've already found one occurance
        return true;
      if (value.getTime() == selfStartDate) {
        selfStartDate = null; //stops further searching, can't find method to break filter loop
        return false;
      }
      return true;
    });
    modifier.unitStartDateWithoutSelf = _.min(startDatesWithoutSelf);

    modifier.unitEndDateWithoutSelf = notSoLongAgo(); //default
    var selfEndDate = wP.endDate.getTime();
    var endDatesWithoutSelf = _.filter(endDates,function(value) { 
      if (!selfEndDate) //skip the rest and just keep the value if we've already found one occurance
        return true;
      if (value.getTime() == selfEndDate) {
        selfEndDate = null;
        return false;
      }
      return true;
    });
    modifier.unitEndDateWithoutSelf = _.max(endDatesWithoutSelf);

    WorkPeriods.direct.update(wP._id,{$set:modifier});   
  });
}