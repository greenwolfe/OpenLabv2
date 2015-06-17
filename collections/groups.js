Groups = new Meteor.Collection('Groups');

Meteor.methods({
  addGroup: function() {
    return Groups.insert({});
  }
});