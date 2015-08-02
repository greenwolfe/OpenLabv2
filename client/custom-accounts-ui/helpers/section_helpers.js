  /***************************/
 /***** SECTION HELPERS *****/
/***************************/

Meteor.currentSection = function(memberID) {
  var sectionID = Meteor.currentSectionId(memberID);
  return Sections.findOne(sectionID);
}
Template.registerHelper('currentSection',Meteor.currentSection);

//if sectionOrID is not passed, returns members of current section for currently impersonated user or current user

Meteor.sectionMembers = function(sectionOrID) {
  var memberIDs = Meteor.sectionMemberIds(sectionOrID);
  return Meteor.users.find({_id: {$in: memberIDs}});
}
Template.registerHelper('sectionMembers',Meteor.sectionMembers);

   /******************************************/
  /********* OTHER SECTION HELPERS **********/
 /**** DEFINED IN LOGIN BUTTONS SESSION ****/
/******************************************/

//Meteor.selectedSection
//Meteor.selectedSectionId()
//Template.registerHelper('selectedSection')

   /********************************************/
  /********* OTHER SECTION HELPERS ************/
 /**** DEFINED /METHODS/sectionMETHODS.JS ****/
/********************************************/

//Meteor.sectionMemberIds
//Meteor.isSectionMember
//Meteor.currentSectionId