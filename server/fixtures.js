Meteor.startup(function () {
  // SITE
  if (Site.find().count() == 0) {
    Site.insert({
      title : 'Open Lab',
      activityTypes: ['activity','assessment','reassessment','lab']
    });
  };

  /*  define the teacher account and assign role*/

  if (Meteor.users.find().count() == 0) {
    var id = Accounts.createUser({
      password: "password",
      email: "matt_greenwolfe@caryacademy.org",
      username: 'Gwolfe'
    });
    Roles.addUsersToRoles(id, ['teacher']);
  };

  if (Units.find().count() == 0) {
    for (i = 1; i <= 8; i++) {
      Units.insert({
        title: 'unit' + i,
        longname: 'unit of instruction' + i,
        description:  '',
        rank: i,
        visible: true
      });
    };
  }

  if (Activities.find().count() == 0) {
    var units = Units.find().fetch();
    units.forEach( function(u) {
      for (i = 1; i <= (20-2*u.rank); i++) {
        Activities.insert({
          title: 'activity' + i,
          unitID: u._id,
          description: '',
          ownerID: '',
          standardIDs: [],
          rank: i,
          visible: true,
          dueDate: null
        });
      };
    });
  }

  //put code to convert models to units and categories here

});


