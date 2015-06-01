Activities = new Meteor.Collection('Activities');

Meteor.methods({
  /*removeAllActivities: function() {
    return Activities.remove({});
  },*/

  /***** INSERT ACTIVITY ****/
  insertActivity: function(activity) { 
    check(activity,{
      pointsTo: Match.Optional(Match.idString),
      title: Match.nonEmptyString,
      unitID: Match.idString,
      //description:  Match.Optional(String), //deprecated ... now will just be text in a text block on the teacher wall
      studentID: Match.Optional(Match.idString), //in case is reassessment for an individual student
      //order: Match.Optional(Match.Integer), //for now, new activity always placed at end of list
      //standardIDs: [], //now kept in a standards block on the page
      visible:  Match.Optional(Boolean),
      dueDate: Match.Optional(Date),
    });
    activity.studentID = activity.studentID || ''; //add default values for optional parameters
    //activity.description = activity.description || '';
    activity.dueDate = activity.dueDate || null;
    activity.visible = activity.visible || true;
    //don't want order passed in.  Always add new activity at end of list
    var unit = Units.findOne(activity.unitID); //verify unit first
    if (!unit)
       throw new Meteor.Error('improperUnit', "Cannot post activity.  Improper unit.");
    var LastAct = Activities.findOne({unitID: activity.unitID},{
      fields:{order:1},
      sort:{order:-1},
      limit:1
    });
    activity.order = (LastAct) ? LastAct.order + 1 : 0; 
    if (activity.pointsTo) {
      var pointedTo = Activities.findOne(activity.pointsTo);
      if (!pointedTo) 
        throw new Meteor.Error('pointsToInvalid', "Cannot post activity.  Pointed to invalid host activity.");
      if (activity.unitID != pointedTo.unitID)
        throw new Meteor.Error('notSameUnit',"A subactivity must begin in the same unit as its parent, although it can be moved later.");
      //pointing to valid activity ... set suborder
      //the list in a subactivities block is sorted separately by suborder
      LastAct = Activities.findOne({
        pointsTo: activity.pointsTo
      },{
        fields:{suborder:1},
        sort:{suborder:-1},
        limit:1
      });
      if (!LastAct)
        throw new Meteor.Error('noSubactivities',"When activity is created on the main page and is not a subactivity, it should point to itself and be the first subactivity in its list.  Therefore, something is wrong if there are no subactivities found.");
      if  (!('suborder' in LastAct))
        throw new Meteor.Error('noSuborder',"Every activity should have a suborder, even there are no subactivities and it points to itself, in which case suborder = 0.");
      activity.suborder = LastAct.suborder + 1;   
      //find where to place it on the main page after
      //the last subactivity remaining in the same unit as pointedTo
      //or right after pointedTo if it is the first activity
      LastAct = Activities.findOne({
        unitID: activity.unitID,
        pointsTo: activity.pointsTo
      },{
        fields:{order:1},
        sort:{order:-1},
        limit:1
      });
      //highly unlikely that there is not a properly formated LastAct in the unit
      //at this point.  Can add validation if problems occur.
      var orderEndOfSublist = LastAct.order + 1;           
    }

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to post an activity");
    if (!Roles.userIsInRole(cU,'teacher') && (cU._id != activity.ownerID))
      throw new Meteor.Error('notTeacher', 'Only teachers can post activities for the whole class.')
    
    var unit = Units.findOne(activity.unitID);
    if (!unit)
       throw new Meteor.Error('improperUnit', "Cannot post activity.  Improper unit.")

    return Activities.insert(activity, function( error, _id) { 
      if ( error ) console.log ( error ); //info about what went wrong
      if ( _id ) {
        if (activity.pointsTo) {
          //is subactivity.  place it properly on main page.  see above.
          if (activity.order != orderEndOfSublist)
            Meteor.call('sortItem','Activities',_id,'order','unitID',null,orderEndOfSublist);
        } else {
          //if it's not a subactivity, it should point to itself
          //and become the first activity in its own subactivity block
          //this places it on equal footing with the other subactivities
          Activities.update(_id,{$set: {pointsTo:_id}});
          Activities.update(_id,{$set: {suborder:0}});
          Meteor.call('insertWall',{
            activityID: _id,
            type: 'teacher',
            //owner: 'teacher', //probably no need for wall's owner?
            visible: true,
            order: 0
          });
          Meteor.call('insertWall',{
            activityID: _id,
            type: 'student',
            //owner: 'st1',
            visible: true,
            order: 1
          });
          Meteor.call('insertWall',{
            activityID: _id,
            type: 'group',
            //owner: ['st1','st2','st3'],
            visible: true,
            order: 2
          });
          Meteor.call('insertWall',{
            activityID: _id,
            type: 'section',
            //owner: 'Bblock',
            visible: true,
            order: 3
          });
        }
      }
    });
  },  

  /***** DELETE ACTIVITY ****/
  deleteActivity: function(activityID) { 
    check(activityID,Match.idString);
    var cU = Meteor.user(); //currentUser
    var activity = Activities.findOne(activityID);

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to delete an activity");

    if (!activity)
      throw new Meteor.Error(412, "Cannot delete activity.  Invalid ID.");

    if (!Roles.userIsInRole(cU,'teacher') && (cU._id != activity.studentID))
      throw new Meteor.Error(409, 'You must be a teacher to delete a whole class activity.')
      
    //check if activity has been used and post warning or suggest
    //just hiding it???

    var ids = _.pluck(Activities.find({unitID:activity.unitID,order:{$gt: activity.order}},{fields: {_id: 1}}).fetch(), '_id');
    var numberRemoved = Activities.remove(activityID); 
    Activities.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return numberRemoved; 
  }, 

  /***** UPDATE ACTIVITY ****/
  updateActivity: function(activity) { 
    check(activity,{
      _id: Match.idString,
      unitID: Match.Optional(Match.idString), //excluded below
      studentID: Match.Optional(String), //excluded below
      order: Match.Optional(Match.Integer), //excluded below
      suborder: Match.Optional(Match.Integer), //excluded below
      title: Match.Optional(Match.nonEmptyString), 
      visible:  Match.Optional(Boolean),
      dueDate: Match.Optional(Date),
      //description:  Match.Optional(String), //deprecated
      //standardIDs: [], //now kept in a standards block on the page
    });

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to update an activity");
    if (!Roles.userIsInRole(cU,'teacher') && (cU._id != activity.studentID))
      throw new Meteor.Error(409, 'You must be a teacher to update a whole class activity.')

    var keys = Object.keys(activity);
    var fields = _.without(keys,'_id','order','suborder','unitID','studentID');
    fields.forEach(function(field) {
      var set = {};
      set[field] = activity[field];
      Activities.update(activity._id,{$set: set});
    });

    if (_.contains(keys,'unitID'))
      throw new Meteor.Error('use-moveItem',"Use moveItem (from sortable1c method) instead of updateActivity to move an activity to a new unit.");
    if (_.intersection(keys,['order','suborder']).length > 0)
      throw new Meteor.Error('use-sortItem',"Use sortItem (from sortable1c method) instead of updateActivity to move an activity to a new position in the list.");
    if (_.contains(keys,'studentID'))
      throw new Meteor.Error('individualAssessment',"An individual assessment is assigned to a particular student and cannot be changed.");
    
    return activity._id;
  }
});