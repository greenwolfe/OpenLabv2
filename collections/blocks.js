Blocks = new Meteor.Collection('Blocks');

Meteor.methods({
  insertBlock: function(block) {
    check(block,{
      columnID: Match.idString,
      wallID: Match.Optional(Match.idString),  //could be included from pasted block, will be overwritten with denormalized values anyway
      activityID: Match.Optional(Match.idString), //same as above
      type: Match.OneOf('workSubmit','text','file','embed','subactivities'), 
      idFromCopiedBlock: Match.Optional(Match.idString),
      visible: Match.Optional(Boolean),
      title: Match.Optional(String),
      text: Match.Optional(String),
      studentText: Match.Optional(String),
      teacherText: Match.Optional(String),
      embedCode: Match.Optional(String),
      raiseHand: Match.Optional(Match.OneOf('visible','')) //could be included from copied block
    });
    block.visible = block.visible || true; //might be pasting hidden block
    block.order = 0;  //always insert at top of column

    var column = Columns.findOne(block.columnID)
    if (!column)
      throw new Meteor.Error('column-not-found', "Cannot add block, not a valid column");
    block.wallID = column.wallID; //denormalize block
    block.activityID = column.activityID;

    if ('idFromCopiedBlock' in block) {
      if (block.type == 'subactivities') 
        throw new Meteor.Error('cannotCopyActivityBlock',"Error, cannot copy and paste an activity block.  Only one allowed per activity page.")
      var idFCB = block.idFromCopiedBlock;
      delete block.idFromCopiedBlock;
    }

    //move other blocks in column down to make room
    var ids = _.pluck(Blocks.find({columnID:block.columnID},{fields: {_id: 1}}).fetch(), '_id');
    Blocks.update({_id: {$in: ids}}, {$inc: {order:1}}, {multi: true});
    //add new block at top
    return Blocks.insert(block, function(error,blockID) {
      //copy links to any associated files
      Files.find({blockID:idFCB}).forEach(function(file) {
        file.blockID = blockID;
        delete file._id;
        Meteor.call('insertFile',file);
      });      
    });
  },
  deleteBlock: function(blockID) {
    check(blockID,Match.idString);
    block = Blocks.findOne(blockID);
    if (!block)
      throw new Meteor.Error('block-not-found',"Cannot delete block, block not found.")
    var fileCount = Files.find({blockID:blockID}).count();
    if (fileCount > 0) return; 
      //throw error as well?

    var ids = _.pluck(Blocks.find({columnID:block.columnID,order:{$gt: block.order}},{fields: {_id: 1}}).fetch(), '_id');
    var numberRemoved = Blocks.remove(blockID); 
    Blocks.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return numberRemoved; 
  },
  updateBlock: function(block) {
    check(block,{
      _id: Match.idString,
      columnID: Match.Optional(Match.idString), //excluded below
      wallID: Match.Optional(Match.idString), //excluded below
      activityID: Match.Optional(Match.idString), //excluded below
      type: Match.Optional(String), //excluded below
      order: Match.Optional(Match.Integer), //excluded below
      visible: Match.Optional(Boolean),
      title: Match.Optional(String),
      text: Match.Optional(String),
      studentText: Match.Optional(String),
      teacherText: Match.Optional(String),
      embedCode: Match.Optional(String),
      raiseHand: Match.Optional(Match.OneOf('visible',''))
    });

    var keys = Object.keys(block);
    var fields = _.without(keys,'_id','order','type','columnID','wallID','activityID');
    fields.forEach(function(field) {
      var set = {};
      set[field] = block[field];
      Blocks.update(block._id,{$set: set});
    });
    if (_.intersection(keys,['columnID','wallID','activityID']).length > 0) 
      throw new Meteor.Error('use-moveItem',"Use moveItem (from sortable1c method) instead of updateBlock to move the block to a new column.");
    if (_.contains(keys,'order'))
      throw new Meteor.Error('use-sortItem',"Use sortItem (from sortable1c method) instead of updateBlock to move a block to a new position in the list.");
    if (_.contains(keys,'type'))
      throw new Meteor.Error('blockTypeFixed',"Cannot change the type of a block.");
    return block._id; 
  },
  denormalizeBlock: function(blockID) {
    check(blockID,Match.idString);
    block = Blocks.findOne(blockID);
    if (!block)
      throw new Meteor.Error('block-not-found',"Cannot denormalize block, block not found.")
    var column = Columns.findOne(block.columnID);
    Blocks.update(block._id,{$set:{wallID:column.wallID}});
    Blocks.update(block._id,{$set:{activityID:column.activityID}});
    Files.find({blockID:block._id}).forEach(function(file) { 
      Meteor.call('denormalizeFile',file._id);
    });  
    return blockID;
  }
});