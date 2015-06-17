Sections = new Meteor.Collection('Sections');

Sections.allow({
  insert: function(userId, doc) {
    return (!!userId && Roles.userIsInRole(userId,'teacher'));
  },
  update: function(userId,doc) {
    return(!!userId && Roles.userIsInRole(userId,'teacher'));
  },
  remove: function(userId,doc) {
    return(!!userId && Roles.userIsInRole(userId,'teacher'))
  }
}); 

Meteor.methods({

  /***** ADD SECTION ****/
  addSection: function(section) {
    var cU = Meteor.user(); //currentUser
    var weekDays = ['Mon','Tue','Wed','Thu','Fri']

    if (!cU || !Roles.userIsInRole(cU,'teacher'))  
      throw new Meteor.Error(401, "You must be a teacher to add a section");

    if (!('section' in section) || !section.section)
      throw new Meteor.Error(402,"Cannot add section.  No section name.");

    if (!('meetingDays' in section)) {
      section.meetingDays = [{'Mon':1},{'Tue':1},{'Wed':1},{'Thu':1},{'Fri':1}];
    } else {
      weekDays.forEach(function(day) {
        if (!(day in section.meetingDays))
          section.meetingDays[day] = 0;
      });
    }
    
    Sections.insert(section);
  },

  /***** UPDATE SECTION ****/
  updateSection: function(nS) {
    var cU = Meteor.user(); //currentUser
    var weekDays = ['Mon','Tue','Wed','Thu','Fri']
    var section = Sections.findOne(nS._id);

    if (!cU || !Roles.userIsInRole(cU,'teacher'))  
      throw new Meteor.Error(401, "You must be a teacher to add a section");

    if (!section)
      throw new Meteor.Error(412, "Cannot update section.  Invalid ID.");

    if (('section' in nS) && nS.section && (nS.section != section.section))
      Sections.update(nS._id,{$set: {section: nS.section}});

    if ('meetingDays' in nS) {
      console.log('meetingDays in nS');
      weekDays.forEach(function(day) {
        if (!(day in nS.meetingDays))
          nS.meetingDays[day] = 0;
      }); 
      Sections.update(nS._id,{$set: {meetingDays: nS.meetingDays}});
    };
  }

  /**** SECTION MOVE USERS ?? ****/
    /* move all users from this section to another */

  /**** SECTION DELETE ?? ****/
  /**** SECTION ADD OR INCREMENT MEETING DAY ****/
    /* negative number means decrease or  */

});


if (Meteor.isServer) {
if (Sections.find().count() === 0) {
  Sections.insert({
    name : 'Bblock',
  });

  Sections.insert({
    name : 'Fblock',
  });

  Sections.insert({
    name : 'Gblock',
  });

};

};