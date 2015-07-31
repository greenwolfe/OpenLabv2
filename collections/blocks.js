Blocks = new Meteor.Collection('Blocks');

Meteor.methods({
  insertBlock: function(block) {
    check(block,{
      //required fields to create the new block
      columnID: Match.idString,
      createdFor: Match.OneOf( //validation will ensure that current user has rights to create block for this user or group
        {Site:Match.idString}, //idString must match site id as only one teacher wall per activity
        {users:Match.idString}, //user must have student role
        {Groups: Match.idString}, 
        {Sections: Match.idString}
      ),
      type: Match.OneOf('workSubmit','text','file','embed','subactivities'), 

      /*fields that will be initially filled based on the information passed in
      createdBy: Match.idString,              //current user
      isCloneParent: Match.Optional(Boolean), //true if 'Site' in createdFor
      isCloneOf: Match.Optional(Boolean),     //false will be set true in the cloneBlock routine, but not here
      canEdit = {}    //whether someone on the createdFor list can edit each listed field, include visible in the fields
                      //format:  {fieldName1:Boolean,fieldName2:Boolean, ...}
                      //so can check as block.canEdit['text'] ... a general template helper would be really nice!
      createdOn: Match.Optional(Date),            //today's date
      modifiedBy: Match.Optional(Match.idString), //current user
      modifiedOn: Match.Optional(Date),           //current date
      wallID: Match.Optional(Match.idString),     //denormalized value from column
      activityID: Match.Optional(Match.idString), //same as above
      visible: Match.Optional(Boolean),           //true
      order: Match.Optional(Match.Integer)        //0 new blocks always added at top of column
      */

      /*content fields, block types indicated, all filled with blank string on insertion
      title: Match.Optional(String),        //all
      text: Match.Optional(String),         //text, embed, file
      studentText: Match.Optional(String),  //workSubmit
      teacherText: Match.Optional(String),  //workSubmit
      embedCode: Match.Optional(String),    //embed
      raiseHand: Match.Optional(Match.OneOf('visible','')) //only partially implemented (all?)
      */
    });
    //validate user and set permissions
    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a new block.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    block.createdBy = cU._id;
    block.modifiedBy = cU._id;
    if (Roles.userIsInRole(cU,'student')) {
      //for workSubmit block, put a teacherID in createdBy at all times, even if a student creates it
      //restrict certain fields by default so student can never edit them
      if (block.type == 'workSubmit') {
        var teachers = Roles.getUsersInRole('teacher');
        if (!teachers.count()) 
          throw new Meteor.Error('teacherNotFound','Cannot create worksubmit block, could not find a teacher.');
        block.createdBy = teachers[0]._id;
      } else if (block.type == 'subactivities') {
        throw new Meteor.Error('onlyTeacher', "Only teachers may create a subactivities block.");
      }
    }
    var today = new Date();
    block.createdOn = today;
    block.modifiedOn = today;

    //validate column and wall
    var column = Columns.findOne(block.columnID)
    if (!column)
      throw new Meteor.Error('column-not-found', "Cannot add block, not a valid column");
    var wall = Walls.findOne(column.wallID);
    if (!wall)
      throw new Meteor.Error('column-not-found', "Cannot add block, not a valid wall");
    block.wallID = column.wallID; //denormalize block
    block.activityID = column.activityID;

    //validate createdFor collection and specific item
    var collectionName = _.keys(block.createdFor)[0];
    var itemID = block.createdFor[collectionName];
    var Collection = Mongo.Collection.get(collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found','Error creating block.  Collection ' + collectionName + ' not found.');
    item = Collection.find(itemID);
    if (!item) 
      throw new Meteor.Error('item-not-found','Error creating block.  Could not find itme ' + itemID + ' of the' + collectionName + 'collection.');


    block.order = 0;  //always insert at top of column
    block.raiseHand = '';
    block.isCloneOf = false; //clones are created in cloneBlock method, not here
    block.isCloneParent = false;
    if ((Roles.userIsInRole(cU,'teacher')) && ('Site' in block.createdFor) && (wall.type != 'teacher'))
      block.isCloneParent = true;

    block.visible = true;
    block.title = '';
    block.canEdit = {
      'visible':false,
      'title':false,
      'text':false,
      'studentText':false,
      'teacherText':false,
      'embedCode':false
    };
    block.title = '';
    block.text = '';
    block.studentText = '';
    block.teacherText = '';
    block.embedCode = '';
    if (block.type == 'workSubmit') {
      block.canEdit.studentText = true;
      if (Roles.userIsInRole(block.modifiedBy,'student'))
        block.canEdit.title = true;
    } else if ((block.type == 'text') || (block.type == 'file')) {
      if (wall.type != 'teacher') {
        block.canEdit.title = true;
        block.canEdit.text = true;
      }
    } else if (block.type == 'embed') {
      if (wall.type != 'teacher') {
        block.canEdit.title = true;
        block.canEdit.text = true;
        block.canEdit.embedCode = true;
      }
    }

    //move other blocks in column down to make room
    var ids = _.pluck(Blocks.find({columnID:block.columnID},{fields: {_id: 1}}).fetch(), '_id');
    Blocks.update({_id: {$in: ids}}, {$inc: {order:1}}, {multi: true});
    //add new block at top
    return Blocks.insert(block);      
  },
  //make a pasteBlock method pasteBlock: function(blockID,columnID)
  //is it necessary to pass in anything else?
  pasteBlock: function(block) {
    check(block,{
      //required fields
      columnID: Match.idString,
      createdBy: Match.idString, //validation will ensure this is the current user
      createdFor: Match.OneOf( //validation will ensure that current user has rights to create block for this user or group
        {Site:Match.idString}, //idString must match site id as only one teacher wall per activity
        {users:Match.idString}, //user must have student role
        {Groups: Match.idString}, 
        {Sections: Match.idString}
      ),
            type: Match.OneOf('workSubmit','text','file','embed','subactivities'), 
      //hasClones
      //isCloneOf
      //canEdit[]
      //optional fields - could be passed in from a copied block
      createdOn: Match.Optional(Date), //value passed in OR today's date
      modifiedBy: Match.Optional(Match.idString), //value passed in OR current user
      modifiedOn: Match.Optional(Date), //value passed in OR current date
      wallID: Match.Optional(Match.idString),  //will be overwritten with denormalized value from column
      activityID: Match.Optional(Match.idString), //same as above
      idFromCopiedBlock: Match.Optional(Match.idString), //not part of permanent record
      visible: Match.Optional(Boolean), //passed Or true

      //content fields, block types indicated
      title: Match.Optional(String), //all
      text: Match.Optional(String), //text, embed, file
      studentText: Match.Optional(String), //workSubmit
      teacherText: Match.Optional(String), //workSubmit
      embedCode: Match.Optional(String), //embed
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
  //also make a cloneBlock method:  function(blockID)
  //necessary to pass in anything else?  find the activityID and wall type from the block itself
  //then clone for all other walls of this type for this activity
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
    check(block,Match.ObjectIncluding({
      _id: Match.idString,
      //content fields, block types indicated, all filled with blank string on insertion
      title: Match.Optional(String),        //all
      text: Match.Optional(String),         //text, embed, file
      studentText: Match.Optional(String),  //workSubmit
      teacherText: Match.Optional(String),  //workSubmit
      embedCode: Match.Optional(String),    //embed
      raiseHand: Match.Optional(Match.OneOf('visible','')) //only partially implemented (all?)

      /*fields set below, values passed in are ignored          
      modifiedBy: Match.Optional(Match.idString), //current user
      modifiedOn: Match.Optional(Date),           //current date
      */

      /*fields that might be passed along with original block object, but are ignored
      columnID: Match.Optional(Match.idString), 
      wallID: Match.Optional(Match.idString), 
      activityID: Match.Optional(Match.idString),
      type: Match.Optional(String), 
      order: Match.Optional(Match.Integer), 
      createdFor: Match.Optional(Match.OneOf( //allow to edit???
        {Site:Match.idString}, 
        {users:Match.idString}, 
        {Groups: Match.idString}, 
        {Sections: Match.idString}
      )),
      createdBy: Match.Optional(Match.idString), 
      isCloneParent: Match.Optional(Boolean), 
      isCloneOf: Match.Optional(Boolean),     
      createdOn: Match.Optional(Date), 
      canEdit = [], //set in toggleBlockEditPermissions
      visible: Match.Optional(Boolean),  //set in showHideMethod.js
      */ 
    }));
    var originalBlock = Blocks.findOne(block._id);
    if (!originalBlock)
      throw new Meteor.Error('block-not-found','Cannot update block.  Block not found.');

    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a new block.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Meteor.canEditBlock(cU._id,originalBlock))
      throw new Meteor.Error('cannotEdit','You do not have editing privileges to update this block.');
    block.modifiedBy = cU._id;
    block.modifiedOn = new Date();

    var fields = ['title','text','studentText','teacherText','embedCode','raiseHand'];
    fields.forEach(function(field) {
      if ((field in block) && (block.field != originalBlock.field)) {
        if (originalBlock.canEdit[field]) {
          var set = {};
          set[field] = block[field];
          Blocks.update(block._id,{$set: set});
        } else {
          throw new Meteor.Error('cannotEdit','You do not have editing rights for the ' + field + ' field of this block.');
        }
      }
    });
    /* //difficult to implement now that I changed the method of identifying the valid fields above
    //probably not necessary anyway
    if (_.intersection(keys,['columnID','wallID','activityID']).length > 0) 
      throw new Meteor.Error('use-moveItem',"Use moveItem (from sortable1c method) instead of updateBlock to move the block to a new column.");
    if (_.contains(keys,'order'))
      throw new Meteor.Error('use-sortItem',"Use sortItem (from sortable1c method) instead of updateBlock to move a block to a new position in the list.");
    if (_.contains(keys,'type'))
      throw new Meteor.Error('blockTypeFixed',"Cannot change the type of a block.");
    */
    //messages for canEdit and visible?
    return block._id; 
  }
  //need method just to toggle edit on fields?
  //would changing raiseHand be better in a separate toggle method?
});

/**** HOOKS *****/
//will need handler to propagate changes to clones
Blocks.after.update(function (userID, doc, fieldNames, modifier) {
  if (doc.columnID !== this.previous.columnID) {
    //denormalizing
    ActivityStatuses.update({activityID:this.previous._id},{$set: {unitID:doc.unitID}}, {multi: true});
    var column = Columns.findOne(doc.columnID);
    Blocks.update(doc._id,{$set:{wallID:column.wallID}});
    Blocks.update(doc._id,{$set:{activityID:column.activityID}});
    Files.find({blockID:doc._id}).forEach(function(file) { 
      Files.update(file._id,{$set:{columnID:column._id}});
      Files.update(file._id,{$set:{wallID:column.wallID}});
      Files.update(file._id,{$set:{activityID:column.activityID}});
    });  
  }
});

/**** UTILITIES ****/


var sectionMemberIds = function(sectionID) {
  var today = new Date();
  var memberships = Memberships.find({
      collectionName:'Sections',
      itemID:sectionID,
      startDate: {$lt: today},
      endDate: {$gt: today}
    },
    {fields:{memberID:1}}).fetch();
  return _.pluck(memberships,'memberID');
}
var isSectionMember = function(userID,sectionID) {
  var memberIDs = Meteor.sectionMemberIds(sectionOrID);
  return _.contains(userID,memberIDs);
}

