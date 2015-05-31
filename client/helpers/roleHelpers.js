var ifIsTeacherFactory = function(textIfTeacher,textIfNot) {
  //returns truthy value "editing" if a teacher is editing the main/progress page
  var textIfTeacher = textIfTeacher || true;
  var textIfNot = textIfNot || false;
  return function() {
    var userID = Meteor.userId();
    return (Roles.userIsInRole(userID,'teacher')) ? textIfTeacher : textIfNot;
  }
}

Template.registerHelper('hiddenIfNotTeacher',ifIsTeacherFactory('','hidden'));
