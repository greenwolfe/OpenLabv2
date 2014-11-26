Units = new Meteor.Collection('units');

 /* Units.insert({
    title : 'CAPM',
    longname : 'Constant Acceleration Particle Model',
    description : '',
    rank: 0,
    visible: true
  }); */

Meteor.methods({

  /***** POST UNIT ****/
  postUnit: function(Unit) { 
    var cU = Meteor.user(); //currentUser
    var UnitId,maxRank,ranks;

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to add a unit");
    
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to add a unit.')
    
    if (!Unit.hasOwnProperty('title') || !Unit.title)
      throw new Meteor.Error(413, "Cannot add unit.  Missing title.");

    if (!Unit.hasOwnProperty('longname'))
      Unit.longname = '';

    if (!Unit.hasOwnProperty('description'))
      Unit.description = '';

    if (!Unit.hasOwnProperty('visible'))
      Unit.visible = true;
   
    ranks = Units.find().map(function(u) {return u.rank});
    if (ranks.length) {
      maxRank = _.max(ranks)
    } else {
      maxRank = -1;
    }
    if (!Unit.hasOwnProperty('rank'))
      Unit.rank = maxRank + 1;

    UnitID = Units.insert(Unit);

    return UnitID; 
  },  

  /***** DELETE UNIT ****/
  deleteUnit: function(UnitlID) { 
    var cU = Meteor.user(); //currentUser
    var Unit = Units.findOne(UnitID);
    var ActivitiesCount, StandardsCount;

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to delete a unit");

    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to delete a unit.')
  
    if (!Unit)
      throw new Meteor.Error(412, "Cannot delete unit.  Invalid ID.");

    ActivitiesCount = Activities.find({unitID: UnitID}).count();
    StandardsCount = 0 //Standards.find({unitID: unitID}).count();
    if (ActivitiesCount || StandardsCount) 
      throw new Meteor.Error(412, "Cannot delete unit until you delete or move all of its activities and standards.");

    Units.remove(UnitID);
    
    return UnitID;
  }, 

  /***** UPDATE UNIT ****/
  updateUnit: function(nU) { //newUnit
    var cU = Meteor.user(); //currentUser
    var Unit = Units.findOne(nU._id);
    var r;

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to update a unit");

    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to update a unit.')
  
    if (!Unit)
      throw new Meteor.Error(412, "Cannot update unit.  Invalid ID.");

    if (nU.hasOwnProperty('title') && nU.title && (nU.title != Unit.title)) 
      Units.update(nU._id,{$set: {title: nU.title}});

    if (nU.hasOwnProperty('description') && (nU.description != Unit.description)) 
      Units.update(nU._id,{$set: {description: nU.description}});

    if (nU.hasOwnProperty('longname') && (nU.longname != Unit.longname)) 
      Units.update(nU._id,{$set: {longname: nU.longname}});

    if (nU.hasOwnProperty('visible') && (nU.visible != Unit.visible)) 
      Units.update(nU._id,{$set: {visible: nU.visible}});
    
    if (nU.hasOwnProperty('rank') && (nU.rank != Unit.rank)) {
      Units.update(nU._id,{$set: {rank: nU.rank}});  
    };

    return Unit._id;
  } 
});  