Walls = new Meteor.Collection('Walls');

Meteor.methods({
  insertWall: function(wall) {
    check(wall,{
      activityID: Match.idString,
      type: Match.OneOf('teacher','student','group','section'),
      visible: Boolean,
      order: Match.Integer
    });
    
    var activity = Activities.findOne(wall.activityID);
    if (!activity)
      throw new Meteor.Error('activity-not-found',"Cannot add wall, invalid activityID.");

    return Walls.insert(wall , function( error, _id) { 
      if ( error ) console.log ( error ); //info about what went wrong
      if ( _id ) {
        Meteor.call('insertColumn',_id,-1,'right');
        Meteor.call('insertColumn',_id,0,'right');
        Meteor.call('insertColumn',_id,1,'right');
      }
    });
  }
});
