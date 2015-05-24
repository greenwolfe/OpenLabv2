Meteor.startup(function () {
  UploadServer.init({
    tmpDir: process.env.PWD + '/.uploads/tmp',
    uploadDir: process.env.PWD + '/.uploads/',
    //tmpDir: '/root/Uploads/uploadsTest/tmp', // not working even though directories exist and owner and permissions set
    //uploadDir: '/root/Uploads/uploadsTest/',
    //tmpDir: process.env.HOME + '/Uploads/uploadsTest/tmp', // not working even though directories exist and owner and permissions set
    //uploadDir: process.env.HOME + '/Uploads/uploadsTest/',
    checkCreateDirectories: true, //create the directories for you
    getDirectory: function(fileInfo,formData) {
      return '/' + formData.activityID + '/' + formData.user + '/' + formData.purpose;
    },
  });
});  