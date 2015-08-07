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

    if (!Meteor.canShowHide(collection,item))
      throw new Meteor.Error('notPermitted','You do not have permission to show or hide this item.')

    return Collection.update(_id,{$set: {visible:show}});
  }
});

Meteor.canShowHide = function(collection,item) {
  var cU = Meteor.userId();
  if (Roles.userIsInRole(cU,'teacher')) return true;
  if (Roles.userIsInRole(cU,'student')) {
    if (collection == 'Blocks') {
      var wall = Walls.findOne(item.wallID);
      return Meteor.studentCanEditBlock(cU,item); 
    }
    if (collection == 'Files') {
      var block = Blocks.findOne(item.blockID);
      return Meteor.studentCanEditBlock(cU,block);
    }
    if (collection == 'Columns') {
      var wall = Walls.findOne(item.wallID);
      if (Meteor.studentCanEditWall(cU,wall)) {
        var canEditAllBlocks = true;
        Blocks.find({columnID:item._id}).forEach(function(block) {
          canEditAllBlocks = canEditAllBlocks && Meteor.studentCanEditBlock(cU,block);
        });
        return canEditAllBlocks;
      }
    }
  }
  return false;
}