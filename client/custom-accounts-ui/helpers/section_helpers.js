  /***************************/
 /***** SECTION HELPERS *****/
/***************************/

Meteor.currentSection = function(memberID) {
  var sectionID = Meteor.currentSectionId(memberID);
  return Sections.findOne(sectionID);
}
Template.registerHelper('currentSection',Meteor.currentSection);

Meteor.currentSectionName = function(memberID) {
  var sectionID = Meteor.currentSectionId(memberID);
  var section = Sections.findOne(sectionID);
  if (section)
    return section.name;
  return '';
}
Template.registerHelper('currentSectionName',Meteor.currentSectionName);

//if sectionOrID is not passed, returns members of current section for currently impersonated user or current user

Meteor.sectionMembers = function(sectionOrID) {
  var memberIDs = Meteor.sectionMemberIds(sectionOrID);
  return Meteor.users.find({_id: {$in: memberIDs}},{sort:{'profile.lastName':1,'profile.firstName':1,username:1}});
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