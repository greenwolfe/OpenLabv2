Meteor.startup(function () {
  // SITE
  if (Site.find().count() == 0) {
    Site.insert({
      title : 'Open Lab',
      activityTypes: ['activity','assessment','reassessment','lab']
    });
  };

  UploadServer.init({
    tmpDir: process.env.PWD + '/.uploads/tmp',
    uploadDir: process.env.PWD + '/.uploads/',
    checkCreateDirectories: true //create the directories for you
    /*finished: function(fileInfo) {
      console.log(fileInfo);
    }*/
  })

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
        order: i,
        visible: true
      });
    };
  }

 /* if (Activities.find().count() == 0) {
    var units = Units.find().fetch();
    units.forEach( function(u) {
      for (i = 0; i <= (20-2*u.order-u.order%2); i++) {
        Meteor.call('insertActivity',{
          title: 'activity' + i,
          unitID: u._id,
        });
      };
    });
  }*/

  //put code to convert models to units and categories here

});

