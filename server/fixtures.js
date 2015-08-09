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
  if (Roles.getUsersInRole('teacher').count() == 0) {
    var profile = {
      firstName: 'Teacher',
      lastName: 'One'
    }
    var id = Accounts.createUser({
      password: "Pa33word",
      email: "teacher1@mailinator.com",
      username: 'teacher1',
      profile: profile
    });
    Roles.addUsersToRoles(id, ['teacher']);
  };

  if (Units.find().count() == 0) {
    for (i = 1; i <= 2; i++) {
      Units.insert({
        title: 'unit' + i,
	      app: 'openlab',
        longname: 'unit of instruction' + i,
        order: i,
        visible: true
      });
    };
  }

  if (Categories.find().count() == 0) {
    for (i = 1; i <= 2; i++) {
      Categories.insert({
        title: 'category' + i,
        app: 'openlab',
        longname: 'category for standards ' + i,
        order: i,
        visible: true
      });
    };
  }

  if (Sections.find().count() === 0) {
    Meteor.call('insertSection',{name : 'Bblock'});
    Meteor.call('insertSection',{name : 'Fblock'});
    Meteor.call('insertSection',{name : 'Gblock'});
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


});


