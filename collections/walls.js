Walls = new Meteor.Collection('Walls');

Meteor.methods({
  insertWall: function(wall) {
    check(wall,{
      activityID: Match.idString,
      createdFor: Match.OneOf(
        {Site:Match.idString}, //idString must match site id as only one teacher wall per activity
        {'Meteor.users':Match.idString}, //user must have student role
        {Groups: Match.idString}, 
        {Sections: Match.idString}
      ),
      type: Match.OneOf('teacher','student','group','section'),
      visible: Boolean,
      order: Match.Integer
    });
    
    var activity = Activities.findOne(wall.activityID);
    if (!activity)
      throw new Meteor.Error('activity-not-found',"Cannot add wall, invalid activityID.");

    //validate createdFor collection and specific item
    var collectionName = _.keys(wall.createdFor)[0];
    var itemID = wall.createdFor[collectionName];
    var Collection = Mongo.Collection.get(collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found','Error creating wall.  Collection ' + collectionName + ' not found.');
    item = Collection.find(itemID);
    if (!item) 
      throw new Meteor.Error('item-not-found','Error creating wall.  Could not find itme ' + itemID + ' of the' + collectionName + 'collection.');

    //compare type and assigned collection and get collectionName for later error message
    var createdForName = itemID;
    if (collectionName == 'Site') {
      createdForName = item.title;
      //any wall.type allowed as all can have a generic site wall for the teacher to fill with blocks to be cloned to all students/sections/groups as appropriate.
    } else if (collectionName == 'Sections') {
      createdForName = item.name;
      if (wall.type != 'section') 
        throw new Meteor.Error('not-section','A section wall must be assigned to Site or a specific section.');
    } else if (collectionName == 'Meteor.users') {
      if (wall.type != 'student') 
        throw new Meteor.Error('not-student','A student wall must be assigned to Site or a specific student.');
      var name = item.username;
      if (('profile' in item) && ('firstName' in item.profile) && ('lastName' in item.profile))
        name = item.profile.firstName + ' ' + item.profile.lastName;
      if (!Roles.userIsInRole(item,'student'))
        throw new Meteor.Error('not-a-student','Error creating wall. ' + name + ' is not a student.');
    } else if (collectionName == 'Groups') {
      if (wall.type != 'group') 
        throw new Meteor.Error('not-a-group', 'A group wall must be assigned to Site or a specific group.');
    }

    var existingWall = Walls.find({
      activityID: wall.activityID,
      type: wall.type,
      createdFor: wall.createdFor
    }).count();
    if (existingWall) {
      throw new Meteor.Error('existing-wall', 'This activity (' + activity.title  + ') already has a ' + wall.type + ' wall for ' + createdForName + '.');
    }

    return Walls.insert(wall , function( error, _id) { 
      if ( error ) console.log ( error ); //info about what went wrong
      if ( _id ) {
        Meteor.call('insertColumn',_id,-1,'right');
        Meteor.call('insertColumn',_id,0,'right');
        Meteor.call('insertColumn',_id,1,'right');
      }
    });
  }
  //when a teacher visits an activity page, create its site walls if not present yet

  //or simplify:  Have one group wall.  It defaults to the most recent group with content
  //provides a dropdown menu in the header to select other groups with content 
  //or current group if it didn't have content

  //better behavior than below, when a user visits an activity page
  //check for existing group walls, 
  //if with current group, keep it
  //if with past group, check if empty 
  //  if empty and there isn't a current group wall, convert to current group
  //  else delete it (or just hide it?)
  //create an isEmpty function for each block type
  //create an isEmpty function for walls, that finds all blocks and checks if they have student-created contents

  //not making update or delete functions at this time, because
  //not forseeing a need for them.  The only case I am
  //pondering is group walls created as a user browses future
  //activities while assigned to a particular group, but without doing
  //anything.  Then what happens when the user joins a new group
  //and visits the activity for real.  There is an old group wall
  //hanging around with only cloned teacher content.  
  //renormalize data?  make a "hasStudentContent" field that is
  //filled at the block level whenever a student adds content, and then
  //then gets added up the line to column and wall?
});

//need collection hook for show/hide site walls, all specif
//walls of that type for that activity should then
//also be hidden or shown


