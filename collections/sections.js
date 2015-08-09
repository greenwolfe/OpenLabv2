Sections = new Meteor.Collection('Sections');

Meteor.methods({

  /***** ADD SECTION ****/
  insertSection: function(section) {
    check(section,{
      name: Match.nonEmptyString,
      meetingDays: Match.Optional({
        'Mon':Match.Integer,
        'Tue':Match.Integer,
        'Wed':Match.Integer,
        'Thu':Match.Integer,
        'Fri':Match.Integer,
        'Sat':Match.Integer,
        'Sun':Match.Integer
      })
    })

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a section.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can create a section.')

    if (!('meetingDays' in section)) 
      section.meetingDays = {'Mon':1,'Tue':1,'Wed':1,'Thu':1,'Fri':1,'Sat':0,'Sun':0};
    
    Sections.insert(section);
  },

  /***** UPDATE SECTION ****/
  updateSection: function(section) {
    check(section,{
      _id: Match.idString,
      name: Match.Optional(Match.nonEmptyString),
      meetingDays: Match.Optional({
        'Mon':Match.Optional(Match.Integer),
        'Tue':Match.Optional(Match.Integer),
        'Wed':Match.Optional(Match.Integer),
        'Thu':Match.Optional(Match.Integer),
        'Fri':Match.Optional(Match.Integer),
        'Sat':Match.Optional(Match.Integer),
        'Sun':Match.Optional(Match.Integer)
      })
    })
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a section.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can create a section.')

    var originalSection = Sections.findOne(section._id);
    if (!originalSection)
      throw new Meteor.Error('invalidID','Cannot update section.  Invalid ID.');

    if (('name' in section) && (section.name != originalSection.name))
      Sections.update(section._id,{$set:{name:section.name}});

    if ('meetingDays' in section) {
      _.each(section.MeetingDays,function(value,day) {
        originalSection.meetingDays[day] = value;
      })
      Sections.update(section._id,{$set: {meetingDays: originalSection.meetingDays}});
    }
  },

  /**** SECTION MOVE USERS ?? ****/
    /* move all users from this section to another 
       but in that case, could just rename the section? */

  /**** DELETE SECTION ****/
  deleteSection: function(sectionID) {
    check(sectionID,Match.idString);

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a section.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can delete a section.')

    var section = Sections.findOne(sectionID);
    if (!section)
      throw new Meteor.Error('invalidID','Cannot delete section.  Invalid ID.');

    var enrolledStudents = Meteor.sectionMemberIds(sectionID);
    if (enrolledStudents.length > 0)
      throw new Meteor.Error('sectionNotEmpty','This section is not empty.  Have these students move to a new section before deleting it.');

    return Sections.remove(sectionID);
    //denormalization ... will have to remove this element from all LoM calculations

  }
});