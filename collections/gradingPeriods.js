GradingPeriods = new Meteor.Collection('GradingPeriods');

Meteor.methods({
  /**** INSERT GRADING PERIOD ****/
  insertGradingPeriod: function(gradingPeriod) {
    check(gradingPeriod,{
      name: Match.nonEmptyString,
      startDate: Date,
      endDate: Date
    });

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a grading period.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can create a grading period.')

    if ((gradingPeriod.endDate < gradingPeriod.startDate) || !(gradingPeriod.startDate < gradingPeriod.endDate))
      throw new Meteor.Error('invalidGradePeriod','Invalid grade period.  Make sure the end date is greater than the start date.');

    GradingPeriods.insert(gradingPeriod);
    //denormalization ... add an element for this grading period to LoM calculations, run those calculations
  },

  /***** DELETE GRADING PERIOD ****/
  deleteGradingPeriod: function(gradingPeriodID) { 
    check(gradingPeriodID,Match.idString);

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a grading period.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can delete a grading period.')

    var gradingPeriod = GradingPeriods.findOne(gradingPeriodID);
    if (!gradingPeriod)
      throw new Meteor.Error('invalidID','Cannot delete grading period.  Invalid ID.');

    return GradingPeriods.remove(gradingPeriodID);
    //denormalization ... will have to remove this element from all LoM calculations
  },

  /**** UPDATE GRADING PERIOD ****/
  updateGradingPeriod: function(gradingPeriod) {
    check(gradingPeriod,{
      _id: Match.idString,
      name: Match.Optional(Match.nonEmptyString),
      startDate: Match.Optional(Date),
      endDate: Match.Optional(Date)
    });

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to change a grading period.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can change a grading period.')

    var originalGradingPeriod = GradingPeriods.findOne(gradingPeriod._id);
    if (!originalGradingPeriod)
      throw new Meteor.Error('invalidID','Cannot change grading period.  Invalid ID.');

    if (('name' in gradingPeriod) && (gradingPeriod.name != originalGradingPeriod.name))
      GradingPeriods.update(gradingPeriod._id,{$set:{name:gradingPeriod.name}});

    if (('startDate' in gradingPeriod) || ('endDate' in gradingPeriod)) {
      var startDate = ('startDate' in gradingPeriod) ? gradingPeriod.startDate : originalGradingPeriod.startDate;
      var endDate = ('endDate' in gradingPeriod) ? gradingPeriod.endDate : originalGradingPeriod.endDate;
      if ((endDate < startDate) || !(startDate < endDate))
        throw new Meteor.Error('invalidGradePeriod','Invalid grade period.  Make sure the end date is greater than the start date.');
      GradingPeriods.update(gradingPeriod._id,{$set:{startDate:startDate,endDate:endDate}});
      //denormalize ... subset of LoM's in particular grading period could change
    }
  }
})