Blocks = new Meteor.Collection('Blocks');

Meteor.methods({
  insertBlock: function(block) {
    check(block,{
      //required fields to create the new block
      columnID: Match.idString,
      type: Match.OneOf('workSubmit','text','file','embed','subactivities','assessment'), 
        //workSubmit blocks probably deprecated
      /*fields that will be initially filled based on the information passed in
      createdBy: Match.idString,              //current user
      createdOn: Match.Optional(Date),            //today's date
      createdFor: Match.idString, //must = siteID if teacher teacher (only one Site object, so only one id possible)
                                  //userID of a student if student wall
                                  //id of a group if group wall
                                  //id of a section if section wall

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
      standardIDs: [Match.idString],           //assessment
      subActivityID: Match.Optional(Match.idString) //assessment
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
      //workSubmit block deprecated
      //for workSubmit block, put a teacherID in createdBy at all times, even if a student creates it
      //restrict certain fields by default so student can never edit them
      //workSubmit blocks probably deprecated ... no harm done leaving this in for now
      if (block.type == 'workSubmit') {
        var teachers = Roles.getUsersInRole('teacher');
        if (!teachers.count()) 
          throw new Meteor.Error('teacherNotFound','Cannot create worksubmit block, could not find a teacher.');
        block.createdBy = teachers[0]._id;
      } else if (block.type == 'subactivities') {
        throw new Meteor.Error('onlyTeacher', "Only teachers may create a subactivities block.");
      } else if (block.type == 'assessment') {
        //for now ... until the process seems smooth enough and I have time
        //to work out an easy work flow for students to create their own reassessment
        throw new Meteor.Error('onlyTeacher', "Only teachers may create an assessment block.");
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
      throw new Meteor.Error('wall-not-found', "Cannot add block, not a valid wall");
    if (Roles.userIsInRole(cU,'student') && !Meteor.studentCanEditWall(cU._id,wall))
      throw new Meteor.Error('cannodEditWall', "You do not have permissions to edit this wall.");
    block.wallID = column.wallID; //denormalize block
    block.activityID = column.activityID;
    block.createdFor = wall.createdFor;

    block.order = 0;  //always insert at top of column
    block.raiseHand = '';
    block.visible = true;

    block.title = '';
    block.text = '';
    block.studentText = ''; //probably deprecated
    block.teacherText = ''; //probably deprecated
    block.embedCode = '';
    block.standardIDs = [];
    block.subActivityID = '';

    //move other blocks in column down to make room
    var ids = _.pluck(Blocks.find({columnID:block.columnID},{fields: {_id: 1}}).fetch(), '_id');
    Blocks.update({_id: {$in: ids}}, {$inc: {order:1}}, {multi: true});
    //add new block at top
    return Blocks.insert(block);      
  },
  //make a pasteBlock method pasteBlock: function(blockID,columnID)
  //is it necessary to pass in anything else?
  pasteBlock: function(blockID,columnID) {
    //validation ... rights to copy this specific block to another wall?
    check(blockID,Match.idString);
    check(columnID,Match.idString);

    var block = Blocks.findOne(blockID);
    if (!block)
      throw new Meteor.Error('blockNotFound','Cannot past block.  Block not found.');
    if (block.type == 'subactivities') 
      throw new Meteor.Error('cannotCopyActivityBlock',"Error, cannot copy and paste an activity block.  Only one allowed per activity page.")
    var originalWall = Walls.findOne(block.wallID);
    delete block._id;

    var column = Columns.findOne(columnID)
    if (!column)
      throw new Meteor.Error('column-not-found', "Cannot add block, not a valid column");
    block.columnID = columnID;
    block.wallID = column.wallID; //denormalize block
    if (block.activityID != column.activityID) {
      var subActivity = Activities.findOne(block.activityID);
      if (subActivity.pointsTo != column.activityID) //pasted onto a completely different activity page
        //only if assessment block, otherwise set to null
        block.subActivityID = column.activityID;
      block.activityID = column.activityID;
    }

    var wall = Walls.findOne(column.wallID);
    if (!wall)
      throw new Meteor.Error('wall-not-found', "Cannot paste block, not a valid wall");
    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to paste a block.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!Meteor.studentCanEditWall(cU._id,wall))
        throw new Meteor.Error('cannotEditWall', "You do not have permissions to edit this wall.");
      if (!Meteor.studentCanEditBlock(cU._id,block))
        throw new Meteor.Error('cannotCopyBlock',"You do not have permissions to copy this block.");
    }

    if (originalWall) { //handle case of teacher copying from one student wall to another, one group wall to another or one section wall to another
      if (_.contains(['student','group','section'],originalWall.type) && (originalWall.type == wall.type) && Roles.userIsInRole(cU,'teacher')) {
        block.createdFor = wall.createdFor
      }
    }

    block.order = 0;  //always insert at top of column
    //move other blocks in column down to make room
    var ids = _.pluck(Blocks.find({columnID:columnID},{fields: {_id: 1}}).fetch(), '_id');
    Blocks.update({_id: {$in: ids}}, {$inc: {order:1}}, {multi: true});
    //add new block at top
    return Blocks.insert(block, function(error,id) {
      //copy links to any associated files
      Files.find({blockID:blockID}).forEach(function(file) {
        file.blockID = id;
        delete file._id;
        Meteor.call('insertFile',file);
      });      
    });
  },
  deleteBlock: function(blockID) {
    check(blockID,Match.idString);
    //check if it has a subactivity
    //if so, check if other blocks share the same subactivity
    //if not, set isReassessment, isExtraPractice, isMakeUp to null
    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a block.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot delete any content.");

    block = Blocks.findOne(blockID);
    if (!block)
      throw new Meteor.Error('block-not-found',"Cannot delete block, block not found.")

    var fileCount = Files.find({blockID:blockID}).count();
    if (fileCount > 0) return; 
      //throw error as well?

    var LoMcount = LevelsOfMastery.find({assignmentID:blockID}).count();
    if (LoMcount > 0)
      throw new Meteor.Error('alreadyAssessed','This assessment block has already been used to grade students.  Deleting it will orphan those standards.  Try hiding the assignment block instead.');
      //just remove assessmentID and activityID from each affected LoM instead?  Do so after confirming?

    if (Roles.userIsInRole(cU,'student')) {
      if (cU._id != block.createdBy)
        throw new Meteor.Error('noPermissions','You did not create this block, and do not have permissions to delete it.');
    }

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
      raiseHand: Match.Optional(Match.OneOf('visible','')), //only partially implemented (all?)
      subActivityID: Match.Optional(Match.OneOf(Match.idString,'')), //assessment
      standardIDs: Match.Optional([Match.idString]) //assessment ... also set using assessmentAddStandard and assessmentRemoveStandard, or just deprecate those?
          //careful with this method for standard IDS ... none of the checks to avoid deleting a standard that has already been assessed are in place!
          
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
      createdFor: Match.Optional(Match.idString),
      createdBy: Match.Optional(Match.idString),  
      createdOn: Match.Optional(Date), 
      visible: Match.Optional(Boolean)  //set in showHideMethod.js
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
    if (Roles.userIsInRole(cU,'student')) {
      if (!Meteor.studentCanEditBlock(cU._id,originalBlock))
        throw new Meteor.Error('noPermissions','You did not create this block, and do not have permissions to change its contents.');
    }    
    block.modifiedBy = cU._id;
    block.modifiedOn = new Date();

    var fields = ['title','text','studentText','teacherText','embedCode','raiseHand','subActivityID','standardIDs','modifiedBy','modifiedOn'];
    fields.forEach(function(field) {
      if ((field in block) && (block[field] != originalBlock[field])) {
        var set = {};
        set[field] = block[field];
        Blocks.update(block._id,{$set: set});
      }
    });
    return block._id; 
  },
  assessmentAddStandard: function(assessmentID,standardID) {
    check(assessmentID,Match.idString);
    check(standardID,Match.idString);

    var assessment = Blocks.findOne(assessmentID);
    if (!assessment)
      throw new Meteor.Error('invalidAssessment','Cannot add standard to assessment block.  Invalid assessment block ID.');

    var standard = Standards.findOne(standardID);
    if (!standard)
      throw new Meteor.Error('invalidStandardID','Cannot add standard to assessment.  Standard not found.  Invalid standard ID');

    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to add a standard to an assessment.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!Meteor.studentCanEditBlock(cU._id,originalBlock))
        throw new Meteor.Error('noPermissions','You did not create this assessment, and do not have permissions to add a standard.');
    }  

    var today = new Date();
    Blocks.update(assessmentID,{$addToSet: {standardIDs:standardID}});
    Blocks.update(assessmentID,{$set:{modifiedBy:cU._id}});
    Blocks.update(assessmentID,{$set:{modifiedOn: today}});

    return assessmentID;
  },
  assessmentRemoveStandard: function(assessmentID,standardID) {
    check(assessmentID,Match.idString);
    check(standardID,Match.idString);

    var assessment = Blocks.findOne(assessmentID);
    if (!assessment)
      throw new Meteor.Error('invalidAssessment','Cannot add standard to assessment block.  Invalid assessment block ID.');

    var standard = Standards.findOne(standardID);
    if (!standard)
      throw new Meteor.Error('invalidStandardID','Cannot add standard to assessment.  Standard not found.  Invalid standard ID');

    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to add a standard to an assessment.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!Meteor.studentCanEditBlock(cU._id,originalBlock))
        throw new Meteor.Error('noPermissions','You did not create this assessment, and do not have permissions to add a standard.');
    }  

    var LoMcount = LevelsOfMastery.find({assessmentID:assessmentID,standardID:standardID}).count();
    if (LoMcount > 0)
      throw new Meteor.Error('alreadyAssessed','Cannot delete standard.  At least one student has already received a grade for this standard on this assessment. Deleting it will orphan those grades.');
      //provide a way to hide the standard just within an assessment block?

    var today = new Date();
    Blocks.update(assessmentID,{$pull: {standardIDs:standardID}});
    Blocks.update(assessmentID,{$set:{modifiedBy:cU._id}});
    Blocks.update(assessmentId,{$set:{modifiedOn: today}}); 
    
    return assessmentID;   
  }
});

/**** HOOKS *****/
Blocks.after.update(function (userID, doc, fieldNames, modifier) {
  if (doc.columnID !== this.previous.columnID) {
    //denormalizing
    //I think the line below was accidentally copied from /collections/activities.js and fortunately would do nothing here because wrong id would not return any documents
    //ActivityStatuses.update({activityID:this.previous._id},{$set: {unitID:doc.unitID}}, {multi: true});
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

