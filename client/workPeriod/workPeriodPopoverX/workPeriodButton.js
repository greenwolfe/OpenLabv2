  /*******************************/
 /**** WORK PERIOD BUTTON *******/
/*******************************/

Template.workPeriodButton.events({
  'click .workPeriod-gauge': function(event,tmpl) {
    Session.set('workPeriod', this);
  }
})