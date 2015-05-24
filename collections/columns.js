Columns = new Meteor.Collection('Columns');

Meteor.methods({
  insertColumn: function(wallID,order,side) {
    check(wallID,Match.idString);
    check(order,Match.Integer);
    check(side,Match.OneOf('right','left'));
    
    var wall = Walls.findOne(wallID);
    if (!wall)
      throw new Meteor.Error('wall-not-found',"Cannot add column, invalid wall.");
    var widths = _.pluck(Columns.find({wallID:wallID},{fields:{width:1}}).fetch(),'width');
    var totalWidth = widths.reduce(function(a, b){return a+b;},0)
    if (totalWidth == 0) { //first column in wall
      return Columns.insert({
        wallID:wallID,
        activityID: wall.activityID,
        width:4,
        order: 0,
        visible: true
      });
    }
    var width = Math.min(12-totalWidth,4);
    if (width < 2) return; // not enough space to add a column

    var ids = [];
    if (side == 'right') {  
      ids = _.pluck(Columns.find({wallID:wallID,order:{$gt: order}},{fields: {_id: 1}}).fetch(), '_id');
      order = order + 1;
    } else if (side == 'left') {  
      ids = _.pluck(Columns.find({wallID:wallID,order:{$gte: order}},{fields: {_id: 1}}).fetch(), '_id');
    } 
    Columns.update({_id: {$in: ids}}, {$inc: {order:1}}, {multi: true});
    return columnID = Columns.insert({
      wallID:wallID,
      activityID: wall.activityID,
      width:width,
      order: order,
      visible: true
    });
  },
  deleteColumn: function(_id) {
    check(_id,Match.idString);
    var column = Columns.findOne(_id);
    if (!column)
      throw new Meteor.Error('column-not-found',"Cannot delete column, invalid column ID.");
    var numBlocks = Blocks.find({columnID:column._id}).count();
    var numColumns = Columns.find({wallID:column.wallID}).count();
    if ((numBlocks > 0) || (numColumns == 1)) return;
      // throw error as well?

    var ids = _.pluck(Columns.find({wallID:column.wallID,order:{$gt: column.order}},{fields: {_id: 1}}).fetch(), '_id');
    Columns.remove(_id);
    Columns.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});    
    return _id;
  },
  expandColumn: function(_id) {
    check(_id,Match.idString);
    var column = Columns.findOne(_id);
    if (!column)
      throw new Meteor.Error('column-not-found',"Cannot expand column, invalid column ID.");
    var widths = _.pluck(Columns.find({wallID:column.wallID},{fields:{width:1}}).fetch(),'width');
    var totalWidth = widths.reduce(function(a, b){return a+b;})
    if (totalWidth < 12) 
      Columns.update(_id,{$inc: {width:1}})
    return _id;
  },
  shrinkColumn: function(_id) {
    check(_id,Match.idString);
    var column = Columns.findOne(_id);
    if (!column)
      throw new Meteor.Error('column-not-found',"Cannot shrink column, invalid column ID.");
    if (column.width > 2)
      Columns.update(_id,{$inc: {width:-1}})
    return _id;
  }
})
