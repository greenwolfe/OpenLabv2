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

    return Collection.update(_id,{$set: {visible:show}});
  }
});