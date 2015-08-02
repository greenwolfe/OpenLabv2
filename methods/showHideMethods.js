Meteor.methods({
  show: function(collection,_id,show) {
    check(collection,String);
    check(_id,Match.idString);
    check(show,Boolean);

    var Collection = Mongo.Collection.get(collection);
    if (!Collection)
      throw new Meteor.Error(333,"Cannot show/hide item.  Invalid collection.");
    var item = Collection.findOne(_id);
    if (!item)
      throw new Meteor.Error(330,"Cannot show/hide item, invalid id.");

    var cU = Meteor.user();
    if (!cU)
      throw new Meteor.Error('notLoggedIn','You cannot show or hide anything unless you are logged in.')
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed','Parents and advisors cannot show or hide items.');
    if (Roles.userIsInRole(cU,'student')) {
      if (!('createdFor' in item) || (createdFor != cU._id))
        throw new Meteor.Error('studentNotAllowed','You do not have permissions to show or hide this item.');
    }

    return Collection.update(_id,{$set: {visible:show}});
  }
});