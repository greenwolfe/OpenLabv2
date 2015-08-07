Units = new Meteor.Collection('Units');

Meteor.methods({

  /***** INSERT UNIT ****/
  insertUnit: function(unit) { 
    check(unit,{
      title: Match.nonEmptyString,
      longname:  Match.Optional(String), 
      visible:  Match.Optional(Boolean),
      /* fields filled in below
      app: 'openlab' //redundant field, the same for all units, because sortable 1c needs a field to match to find a subset of items in a collection
      order: 0 //end of list or 0
      */
    });
    unit.visible = unit.visible || true;
    unit.longname = unit.longname || '';
    unit.app = 'openlab'; //redundant field, the same for all units, because sortable 1c needs a field to match to find a subset of items in a collection
    //don't want order passed in.  Always add new unit at end of list
    var LastUnit = Units.findOne({},{
        fields:{order:1},
        sort:{order:-1},
        limit:1
      });
    unit.order = (LastUnit) ? LastUnit.order + 1 : 0; 

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to add a unit");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to add a unit.')
    
    return Units.insert(unit);
  },  

  /***** DELETE UNIT ****/
  deleteUnit: function(unitID) { 
    check(unitID,Match.idString);
    var cU = Meteor.user(); //currentUser
    var unit = Units.findOne(unitID);

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to delete a unit");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to delete a unit.')
  
    if (!unit)
      throw new Meteor.Error(412, "Cannot delete unit.  Invalid ID.");

    var ActivitiesCount = Activities.find({unitID: unitID}).count();
    if (ActivitiesCount) 
      throw new Meteor.Error(412, "Cannot delete unit until you delete or move all of its activities.");

    var ids = _.pluck(Units.find({order:{$gt: unit.order}},{fields: {_id: 1}}).fetch(), '_id');
    var numberRemoved = Units.remove(unitID); 
    Units.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return numberRemoved; 
  }, 

  /***** UPDATE UNIT ****/
  updateUnit: function(unit) { 
    check(unit,{
      _id: Match.idString,
      order:  Match.Optional(Match.Integer), //excluded below
      title: Match.Optional(Match.nonEmptyString),
      longname:  Match.Optional(String), 
      visible:  Match.Optional(Boolean),
      app: Match.Optional(Match.OneOf('openlab'))
    });

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to update a unit");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to update a unit.')

    var keys = Object.keys(unit);
    var fields = _.without(keys,'_id','order');
    fields.forEach(function(field) {
      var set = {};
      set[field] = unit[field];
      Units.update(unit._id,{$set: set});
    });

    if (_.contains(keys,'order'))
      throw new Meteor.Error('use-sortItem',"Use sortItem (from sortable1c method) instead of updateUnit to move an activity to a new position in the list.");

    return unit._id;
  } 
});  