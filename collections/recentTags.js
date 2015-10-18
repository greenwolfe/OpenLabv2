RecentTags = new Meteor.Collection('RecentTags');

Meteor.methods({
  insertRecentTag: function(tag) { 
    check(tag,String);
    var rightNow = new Date();
    var existingTag = RecentTags.findOne({tag:tag});
    if (existingTag) {
      return RecentTags.update(existingTag._id,{$set:{date:rightNow}});
    } else if (tag) {
      return RecentTags.insert({tag:tag,date:rightNow});
    }
  }
});