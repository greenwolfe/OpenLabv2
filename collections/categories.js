Categories = new Meteor.Collection('Categories');

Meteor.methods({
  insertCategory: function(category) {
    check(category,{
      title: Match.nonEmptyString,
      longname:  Match.Optional(String), 
      visible:  Match.Optional(Boolean),
      /* fields filled in below
      app: 'openlab' //redundant field, the same for all units, because sortable 1c needs a field to match to find a subset of items in a collection
      order: 0 //end of list or 0
      */
    })
    category.visible = category.visible || true;
    category.longname = category.longname || '';
    category.app = 'openlab';  
    //don't want order passed in.  Always add new unit at end of list
    var lastCategory = Categories.findOne({},{
      fields:{order:1},
      sort:{order:-1},
      limit:1
    });
    category.order = (lastCategory) ? lastCategory.order + 1: 0;
 
    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to add a category");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to add a category.')
 
    return Categories.insert(category);
  },

  /***** DELETE CATEGORY ****/
  deleteCategory: function(categoryID) { 
    check(categoryID,Match.idString);
    var cU = Meteor.user(); //currentUser
    var category = Categories.findOne(categoryID);

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to delete a category");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to delete a category.')
  
    if (!category)
      throw new Meteor.Error(412, "Cannot delete category.  Invalid ID.");

    var LoMCount = LevelsOfMastery.find({categoryID: categoryID}).count();
    if (LoMCount) 
      throw new Meteor.Error(412, "Cannot delete unit category you delete or move all of its levels of mastery.");

    var ids = _.pluck(Categories.find({order:{$gt: category.order}},{fields: {_id: 1}}).fetch(), '_id');
    var numberRemoved = Units.remove(categoryID); 
    Categories.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return numberRemoved; 
  },  

  /***** UPDATE CATEGORY ****/
  updateCategory: function(category) { 
    check(category,{
      _id: Match.idString,
      order:  Match.Optional(Match.Integer), //excluded below
      title: Match.Optional(Match.nonEmptyString),
      longname:  Match.Optional(String), 
      visible:  Match.Optional(Boolean),
      app: Match.Optional(Match.OneOf('openlab'))
    });

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to update a category");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to update a category.')

    var keys = Object.keys(category);
    var fields = _.without(keys,'_id','order','visible');
    fields.forEach(function(field) {
      var set = {};
      set[field] = category[field];
      Categories.update(category._id,{$set: set});
    });

    if (_.contains(keys,'order'))
      throw new Meteor.Error('use-sortItem',"Use sortItem (from sortable1c method) instead of updateCategory to move a category to a new position in the list.");

    return category._id;
  }
});