Files = new Meteor.Collection('Files');

Meteor.methods({
  'insertFile': function(file) {
    check(file,{
      blockID: Match.idString,
      columnID: Match.Optional(Match.idString),  //could be included from pasted block, will be overwritten with denormalized values anyway
      wallID: Match.Optional(Match.idString), //same as above
      activityID: Match.Optional(Match.idString), //same as above
      order: Match.Optional(Match.Integer),
      studentOrGroupID: Match.Optional(Match.idString),
      purpose: Match.OneOf('fileBlock','submittedWork','teacherResponse'),
      name: String,
      size: Match.Optional(Match.Integer),
      type: Match.Optional(String),
      error: Match.Optional(Match.Any), //not sure what this can be
      path: String,
      url: Match.Optional(String),
      visible: Match.Optional(Boolean)
    });
    file.visible = file.visible || true; //might be pasting block with hidden file


    var block = Blocks.findOne(file.blockID)
    if (!block)
      throw new Meteor.Error('block-not-found', "Cannot add file, not a valid block");
    file.columnID = block.columnID;
    file.wallID = block.wallID; 
    file.activityID = block.activityID;

    //add at end of existing file list
    var last = Files.findOne({blockID:file.blockID},{sort:{order:-1}});
    file.order = (last && ('order' in last)) ? last.order + 1 : 0;
    return Files.insert(file);
  },
  'deleteFile': function(_id) {
    check(_id,Match.idString);
    var file = Files.findOne(_id);
    if (!file) 
      throw new Meteor.Error('file-not-found', 'File not found'); 
    var fileCount = Files.find({path:file.path}).count();

    //test this code
    var ids = _.pluck(Files.find({blockID:file.blockID,order:{$gt: file.order}},{fields: {_id: 1}}).fetch(), '_id');
    if (Meteor.isServer && (fileCount <= 1)) //only delete file itself if there are no other links to it
      UploadServer.delete(file.path);
    Files.remove(_id); //remove this link regardless
    //after deleting, move any files below this one up
    Files.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return _id;
  },
  denormalizeFile: function(fileID) {
    check(fileID,Match.idString);
    file = Files.findOne(fileID);
    if (!file)
      throw new Meteor.Error('file-not-found',"Cannot denormalize file, file not found.")
    var block = Blocks.findOne(file.blockID);
    Files.update(file._id,{$set:{columnID:block.columnID}});
    Files.update(file._id,{$set:{wallID:block.wallID}});
    Files.update(file._id,{$set:{activityID:block.activityID}});
    return fileID;
  }
})
