Tags = new Meteor.Collection('Tags');

Meteor.methods({
  insertTag: function(tag) { 
    check(tag,String);
    var rightNow = new Date();
    var existingTag = Tags.findOne({tag:tag});
    if (existingTag) {
      return Tags.update(existingTag._id,{$set:{date:rightNow},$inc:{frequency:1}});
    } else if (tag) {
      return Tags.insert({tag:tag,date:rightNow,frequency:1});
    }
  }
});