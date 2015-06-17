var editingMainPageFactory = function(textIfTrue,textIfFalse) {
  //returns truthy value "editing" if a teacher is editing the main/progress page
  if (!_.isBoolean(textIfTrue))
    textIfTrue = textIfTrue || true;
  if (!_.isBoolean(textIfFalse)) 
    textIfFalse = textIfFalse || false;
  return function() {
    var userID = Meteor.userId();
    if (!Roles.userIsInRole(userID,'teacher')) return textIfFalse;
    return openlabSession.get('editingMainPage') ?  textIfTrue : textIfFalse;
  }
}
editingMainPage = editingMainPageFactory();

//make default true, false in function above and here??
Template.registerHelper('editingMainPage',editingMainPageFactory());
Template.registerHelper('activeIfEditingMainPage',editingMainPageFactory('active',''));
Template.registerHelper('editingMainPageTFtext',editingMainPageFactory('true','false'));