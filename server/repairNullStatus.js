Meteor.startup(function () {
  ActivityStatuses.find().forEach(function(status) {
    if (!status.level)
      ActivityStatuses.update(status._id,{$set: {level: 'nostatus'}});
  });
});