Files = new Meteor.Collection('Files');

Meteor.methods({
  'insertFile': function(file) {
    check(file,{
      blockID: Match.idString, //required
      //could be included from pasted block, will be overwritten with denormalized values anyway
      columnID: Match.Optional(Match.idString),  
      wallID: Match.Optional(Match.idString), 
      activityID: Match.Optional(Match.idString), 
      order: Match.Optional(Match.Integer), 
      createdFor: Match.Optional(Match.idString), 
      createdBy: Match.Optional(Match.idString), 

      //if included from pasted block, then keep it
      createdOn: Match.Optional(Date), 
      visible: Match.Optional(Boolean),

      //fields supplied by meteor-uploads, the only ones I actually use at present are name and path
      name: String,
      size: Match.Optional(Match.Integer),
      type: Match.Optional(String),
      error: Match.Optional(Match.Any), //not sure what this can be
      path: String,
      url: Match.Optional(String),
    });
    var block = Blocks.findOne(file.blockID)
    if (!block)
      throw new Meteor.Error('block-not-found', "Cannot add file, not a valid block");
    file.columnID = block.columnID;
    file.wallID = block.wallID; 
    file.activityID = block.activityID;
    file.createdFor = block.createdFor;

    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a new block.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Roles.userIsInRole(cU,'teacher') && !Meteor.studentCanEditBlock(cU._id,block)) 
      throw new Meteor.Error('cannotEditBlock',"You cannot add this file because you don't have editing privileges for this block.");
    file.createdBy = cU._id;
    file.visible = file.visible || true; //might be pasting block with hidden file
    file.createdOn = file.createdOn || new Date(); //same

    //add at end of existing file list
    var last = Files.findOne({blockID:file.blockID},{sort:{order:-1}});
    file.order = (last && ('order' in last)) ? last.order + 1 : 0;
    return Files.insert(file);
  },
  'deleteFile': function(fileID) {
    check(fileID,Match.idString);

    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a file.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot delete any content.");

    var file = Files.findOne(fileID);
    if (!file) 
      throw new Meteor.Error('file-not-found', 'File not found'); 
    var fileCount = Files.find({path:file.path}).count();
    if (Roles.userIsInRole(cU,'student')) {
      if (cU._id != file.createdBy)
        throw new Meteor.Error('noPermissions','You did not upload this file, and do not have permissions to delete it.');
    }
    //test this code
    var ids = _.pluck(Files.find({blockID:file.blockID,order:{$gt: file.order}},{fields: {_id: 1}}).fetch(), '_id');
    if (Meteor.isServer && (fileCount <= 1)) //only delete file itself if there are no other links to it
      UploadServer.delete(file.path);
    var numberRemoved = Files.remove(fileID); //remove this link regardless
    //after deleting, move any files below this one up
    Files.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return numberRemoved;
  }
})
