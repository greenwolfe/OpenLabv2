/* currentStatus */
var currentStatus = function(activityID) {
  var studentID = Meteor.impersonatedOrUserId();
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
}

Meteor.getStatusColor = function(workPeriod) {
  var status = currentStatus(workPeriod.activityID) || {level:''};
  var completed =  _.str.include(status.level,'done');
  if (completed) return '#5BC0DE'; //light blue completed color

  if (!dateIsNull(workPeriod.endDate)) {
    var today = new Date();
    if (today > workPeriod.endDate) return "#F0AD4E"; //orange overdue level
  }

  return "#EFEFEF";
}

Meteor.getStatusClass = function(workPeriod) {
  var status = currentStatus(workPeriod.activityID) || {level:''};
  var completed =  _.str.include(status.level,'done');
  if (completed) return 'completed'; //light blue completed color

  if (!dateIsNull(workPeriod.endDate)) {
    var today = new Date();
    if (today > workPeriod.endDate) return "expected"; //orange overdue level
  }
  
  return "";
}
Template.registerHelper('statusClass',Meteor.getStatusClass);
