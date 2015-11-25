Walls = new Meteor.Collection('Walls');

Meteor.methods({
  insertWall: function(wall) {
    check(wall,{
      activityID: Match.idString,
      createdFor: Match.idString, //must = siteID if teacher wall (only one Site object, so only one id possible)
                                  //userID of a student if student wall
                                  //id of a group if group wall
                                  //id of a section if section wall
      type: Match.OneOf('teacher','student','group','section'),
      /* set below, value not passed in
      visible: activity.wallVisible[wall.type],
      order: activity.wallOrder.indexOf(wall.type);
      */
    });
    var cU = Meteor.user();
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a new wall.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    //if student, check if student is a member of createdFor group or section

    var activity = Activities.findOne(wall.activityID);
    if (!activity)
      throw new Meteor.Error('activity-not-found',"Cannot add wall, invalid activityID.");
    //at a later stage, change to activity.wallOrder and update
    //it whenever teacher re-organizes the walls
    wall.order = activity.wallOrder.indexOf(wall.type);
    wall.visible = activity.wallVisible[wall.type];

    //validate createdFor collection and specific item
    var collectionNames = {teacher:'Site',student:'users',group:'Groups',section:'Sections'};
    var collectionName = collectionNames[wall.type]
    var Collection = Mongo.Collection.get(collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found','Error creating wall.  Collection ' + collectionName + ' not found.');
    var item = Collection.findOne(wall.createdFor);
    if (!item) 
      throw new Meteor.Error('item-not-found','Error creating wall.  Could not find item in ' + collectionName + ' with id ' + wall.createdFor);
    if ((wall.type == 'student') && (!Roles.userIsInRole(item,'student')))
      throw new Meteor.Error('notStudent','Could not create student wall.  Assigned user is not a student.');
    
    return Walls.insert(wall , function( error, _id) { 
      if ( error ) console.log ( error.reason ); //info about what went wrong
      if ( _id ) {
        Meteor.call('insertColumn',_id,-1,'right');
        Meteor.call('insertColumn',_id,0,'right');
        Meteor.call('insertColumn',_id,1,'right');
      }
    });
  },
  deleteWallIfEmpty: function(wallID) {
    check(wallID,Match.idString);
    if (this.isSimulation)
      return;
    var wall = Walls.findOne(wallID);
    if (!wall)
      return; //already deleted on the server, but apparently its ghost was left in the browser
      //throw new Meteor.Error('wallNotFound','Cannot delete wall.  Wall not found.')
    var blockCount = Blocks.find({wallID:wallID}).count();
    if (blockCount > 0)
      return; //only delete empty walls
    if (wall.type == 'teacher') {
      var teacherWallCount = Walls.find({activityID:wall.activityID,type:'teacher'}).count();
      if (teacherWallCount == 1)
        return; //don't delete last teacher wall
    }
    return Walls.remove(wallID);
  },
  addDefaultWalls: function(studentOrSectionID,activityID) {
    if (Meteor.isSimulation)
      return;
    check(studentOrSectionID,Match.idString);
    check(activityID,Match.idString);
    var wallsCreated = 0;
    var activity = Activities.findOne(activityID);
    //if activity doesn't exist, just don't create walls for it
    //but don't throw error ... see if this is OK
    if (!activity)
      return;
      //throw new Meteor.Error('activityNotFound','Cannot create default walls.  Activity not found.');
    var student = Meteor.users.findOne(studentOrSectionID);
    if ((student) && Roles.userIsInRole(student,'student')) {
      var studentID = studentOrSectionID;
      var sectionID = Meteor.currentSectionId(studentID);

      var wall = {
        activityID: activityID,
        type: 'student',
        createdFor: studentID
      }
     if (Walls.find(wall).count() == 0) {
        Meteor.call('insertWall',wall,function(error,id) {
          if (error)
            console.log(error.reason);
        });
        wallsCreated += 1;
      }

      wall.type = 'group';
      var groupIds = _.pluck(Memberships.find({memberID:studentID,collectionName:'Groups'},{fields:{itemID:1}}).fetch(),'itemID');
      wall.createdFor = {$in: groupIds}; 
      if (Walls.find(wall).count() == 0) { //count non-empty walls for all past groups
        wall.createdFor = Meteor.currentGroupId(studentID); //if none, create wall for current group
        if (wall.createdFor)
          Meteor.call('insertWall',wall,function(error,id) {
          if (error)
            console.log(error.reason);
        });
        wallsCreated += 1;
      }
    } else {
      var sectionID = studentOrSectionID;
      var wall = {
        activityID: activityID
      }
    }

    var section = Sections.findOne(sectionID);
    if (section) {
      wall.type = 'section';
      wall.createdFor = sectionID;
      if ((wall.createdFor) && (Walls.find(wall).count() == 0)) {
         Meteor.call('insertWall',wall,function(error,id) {
          if (error)
            console.log(error.reason);
        });
        wallsCreated += 1;
      }
    }
    return wallsCreated;
  }
});

Walls.after.update(function (userID, doc, fieldNames, modifier) {
  if (doc.order != this.previous.order) {
    var activity = Activities.findOne(doc.activityID);
    var to = doc.order;
    var from = activity.wallOrder.indexOf(doc.type);
    if (to != from) {
      activity.wallOrder.splice(to, 0, activity.wallOrder.splice(from, 1)[0]);
      Activities.update(activity._id,{$set:{wallOrder:activity.wallOrder}});
      Walls.find({activityID:doc.activityID}).forEach(function(wall){
        var newOrder = activity.wallOrder.indexOf(wall.type);
        if (wall.order != newOrder)
          Walls.direct.update(wall._id,{$set:{order:newOrder}});
      })
    }
  }
  if (doc.visible != this.previous.visible) {
    var activity = Activities.findOne(doc.activityID);
    var wallVisible = activity.wallVisible;
    wallVisible[doc.type] = doc.visible;
    Activities.update(doc.activityID,{$set:{wallVisible:wallVisible}});
    Walls.find({activityID:doc.activityID,type:doc.type}).forEach(function(wall){
      if (wall.visible != doc.visible) 
        Walls.direct.update(wall._id,{$set:{visible:doc.visible}});
    });    
  }
});