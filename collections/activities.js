Activities = new Meteor.Collection('activities');

  /* Activities.insert({
    title : 'Acceleration Intro',
    unitID : Models.findOne({model:'CAPM'})._id,
    description : '',
    ownerID: '', //activity could be a reassessment for a single student
                 //teacher-generated activities have no owner
    standardIDs: [],
    rank : 0,
    visible: true,
    dueDate: //'ddd[,] MMM D YYYY'
  }); */

Meteor.methods({
  /*removeAllActivities: function() {
    return Activities.remove({});
  },*/

  /***** POST ACTIVITY ****/
  postActivity: function(Activity) { 
    var cU = Meteor.user(); //currentUser
    var ActivityId,maxRank,ranks;

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to post an activity");

    if (!Activity.hasOwnProperty('ownerID'))
      Activity.ownerID = '';
    
    if (!Roles.userIsInRole(cU,'teacher') && (cU._id != Activity.ownerID))
      throw new Meteor.Error(409, 'Only teachers can post activities for the whole class.')
    
    if (!Activity.hasOwnProperty('title') || !Activity.title )
      throw new Meteor.Error(413, "Cannot post activity.  Missing title.");

    if (!Activity.unitID)
      throw new Meteor.Error(402, "Cannot post activity.  Missing unit.");
   
    var unit = Units.findOne(Activity.unitID);
    if (!unit)
       throw new Meteor.Error(421, "Cannot post activity.  Improper unit.")

    if (!Activity.hasOwnProperty('description'))
      Activity.description = '';

    if (!Activity.hasOwnProperty('standardIDs'))
      Activity.standardIDs = [];

    if (Activity.hasOwnProperty('dueDate') && Activity.dueDate) {
      if (!moment(Activity.dueDate,'ddd[,] MMM D YYYY',true).isValid())
        throw new Meteor.Error(414,'Cannot add/change due date. Invalid date');
    } else {
      Activity.dueDate = null;    
    };

    if (!Activity.hasOwnProperty('visible'))
      Activity.visible = true;
    
    ranks = Activities.find({unitID: Activity.unitID}).map(function(a) {return a.rank});
    if (ranks.length) {
      maxRank = _.max(ranks)
    } else {
      maxRank = -1;
    }
    if (!Activity.hasOwnProperty('rank'))
      Activity.rank = maxRank + 1;

    ActivityID = Activities.insert(Activity);

    return ActivityID; 
  },  

  /***** DELETE ACTIVITY ****/
  deleteActivity: function(ActivityID) { 
    var cU = Meteor.user(); //currentUser
    var Activity = Activities.findOne(ActivityID);

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to delete an activity");

    if (!Activity)
      throw new Meteor.Error(412, "Cannot delete activity.  Invalid ID.");

    if (!Roles.userIsInRole(cU,'teacher') && (cU._id != Activity.ownerID))
      throw new Meteor.Error(409, 'You must be a teacher to delete a whole class activity.')
      
    //check if activity has been used and post warning or suggest
    //just hiding it???

    Activities.remove(ActivityID);
    
    return ActivityID;
  }, 

  /***** UPDATE ACTIVITY ****/
  updateActivity: function(nA) { //newActivity
    var cU = Meteor.user(); //currentUser
    var Activity = Activities.findOne(nA._id);
    var maxRank,r,currentUnitID;

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to update an activity");

    if (!Activity)
      throw new Meteor.Error(412, "Cannot update activity.  Invalid ID.");
    currentUnitID = Activity.unitID;

    if (!Roles.userIsInRole(cU,'teacher') && (cU._id != Activity.ownerID))
      throw new Meteor.Error(409, 'You must be a teacher to update a whole class activity.')

    if (nA.hasOwnProperty('title') && nA.title && (nA.title != Activity.title)) 
      Activities.update(nA._id,{$set: {title: nA.title}});

    if (nA.hasOwnProperty('description') && (nA.description != Activity.description)) 
      Activities.update(nA._id,{$set: {description: nA.description}});

    if (nA.hasOwnProperty('dueDate')) {
      if (moment(nA.dueDate,'ddd[,] MMM D YYYY',true).isValid()) {
        Activities.update(nA._id,{$set: {dueDate: nA.dueDate}});
      } else {
        Activities.update(nA._id,{$set: {dueDate: null}});
      };
    }

    if (nA.hasOwnProperty('visible') && (nA.visible != Activity.visible)) 
      Activities.update(nA._id,{$set: {visible: nA.visible}});
    
    if (nA.hasOwnProperty(unitID) && nA.unitID && (nA.unitID != Activity.unitID)) {
      var unit = Units.findOne(nA.unitID);
      if (!unit)
        throw new Meteor.Error(421, "Cannot update activity.  Improper unit.")
      maxRank = _.max(Activities.find({unitID: nA.unitID}).map(function(a) {return a.rank}))
      Activities.update(nA._id,{$set: {unitID: nA.unitID,rank: maxRank+1}});
      Activity.unitID = nA.unitID;  
    };

    
    if (nA.hasOwnProperty('rank') && (nA.rank != Activity.rank)) {
      Activities.update(nA._id,{$set: {rank: nA.rank}}); 
    };

    return Activity._id;
  }
});