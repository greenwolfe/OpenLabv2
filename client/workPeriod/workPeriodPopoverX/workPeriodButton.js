  /*******************************/
 /**** WORK PERIOD BUTTON *******/
/*******************************/

Template.workPeriodButton.events({
  'click .workPeriod-gauge': function(event,tmpl) {
    console.log('workPeriod button');
    console.log(this);
    Session.set('workPeriod', this);
  }
})