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
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a new block.");
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
      if ( error ) console.log ( error ); //info about what went wrong
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
  addDefaultWalls: function(studentID,activityID) {
    if (Meteor.isSimulation)
      return;
    check(studentID,Match.idString);
    check(activityID,Match.idString);
    var activity = Activities.findOne(activityID);
    if (!activity)
      throw new Meteor.Error('activityNotFound','Cannot create default walls.  Activity not found.');
    var student = Meteor.users.findOne(studentID);
    if (!student)
      return; //viewing activity page without student selected
              //only teacher wall visible
    if (!Roles.userIsInRole(student,'student'))
      return;

    var wall = {
      activityID: activityID,
      type: 'student',
      createdFor: studentID
    }
    if (Walls.find(wall).count() == 0) 
      Meteor.call('insertWall',wall);

    wall.type = 'group';
    var groupIds = _.pluck(Memberships.find({memberID:studentID,collectionName:'Groups'},{fields:{itemID:1}}).fetch(),'itemID');
    wall.createdFor = {$in: groupIds}; 
    if (Walls.find(wall).count() == 0) { //count non-empty walls for all past groups
      wall.createdFor = Meteor.currentGroupId(studentID); //if none, create wall for current group
      if (wall.createdFor)
        Meteor.call('insertWall',wall);
    }

    wall.type = 'section';
    wall.createdFor = Meteor.currentSectionId(studentID);
    if ((wall.createdFor) && (Walls.find(wall).count() == 0))
       Meteor.call('insertWall',wall);
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
    Walls.find({activityID:doc.activityID,type:doc.type}).forEach(function(wall){
      if (wall.visible != doc.visible)
        Walls.direct.update(wall._id,{$set:{visible:doc.visible}});
    });    
  }
});

//collection hook if wall reordered, then reorder all walls of same type 
// for this activity for all users 
// ... what happens if two group walls get reordered?
// ... it appears this is OK.  sortable1c would interpret
//this as not reordering anything, so no change would be made
//hook must also update activity.wallOrder
//first update activity.wallOrders
//then call updateOrder method for each wall in the activity
//which updates its order based on the activity

//similar collection hook for visibility - changes all other 
//walls of same type for activity, and activity.wallVisible
