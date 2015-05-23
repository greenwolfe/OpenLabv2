editingMainPage = function(textIfTrue,textIfFalse) {
  //returns truthy value "editing" if a teacher is editing the main/progress page
  if (!_.isBoolean(textIfTrue))
    textIfTrue = textIfTrue || 'editing';
  if (!_.isBoolean(textIfFalse)) 
    textIfFalse = textIfFalse || '';
  return function() {
    var userID = Meteor.userId();
    if (!Roles.userIsInRole(userID,'teacher')) return textIfFalse;
    return Session.get('editingMainPage') ?  textIfTrue : textIfFalse;
  }
}

//make default true, false in function above and here??
Template.registerHelper('editingMainPage',editingMainPage('editing',''));
Template.registerHelper('activeIfEditingMainPage',editingMainPage('active',''));
Template.registerHelper('editingMainPageTF',editingMainPage(true,false));
Template.registerHelper('editingMainPageTFtext',editingMainPage('true','false'));