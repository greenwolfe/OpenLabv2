Standards = new Meteor.Collection('Standards');

Meteor.methods({

  /***** INSERT STANDARD ****/
  insertStandard: function(standard) { 
    check(standard,{
      title: Match.nonEmptyString,
      categoryID: Match.idString,

      
      //****Make some provision for trimesters or date ranges?
      /*set below, value not passed in
      description : Match.Optional(Match.String);
      scale: Match.OneOf([Match.nonEmptyString],Match.Integer), // default: ['NM','DM','M'],
      calcMethod: Match.Optional(Match.calcMethodString) //latest, average, or average5 or decayingAverage 33 ... where the number can vary
      calcMethodParam: Match.Integer, //if method == average, param is how many of the most recent LoMs to average (-1 means all)
                                      //if method == decayingAverage, param is what percent to count the latest LoM
                                      //if method == latest, no param is necessary
      visible:  Match.Optional(Boolean),
      order: Match.Optional(Match.Integer), //for now, new activity always placed at end of list
     */
    });
    standard.description = '';
    standard.scale = ['NM','DM','M'];
    standard.calcMethod = 'latest';
    standard.calcMethodParam = null;
    standard.visible = true;
    //don't want order passed in.  Always add new activity at end of list
    var category = Categories.findOne(standard.categoryID); //verify unit first
    if (!category)
       throw new Meteor.Error('improperCategory', "Cannot create standard.  Improper category.");
    var LastStandard = Standards.findOne({categoryID: standard.categoryID},{
      fields:{order:1},
      sort:{order:-1},
      limit:1
    });
    standard.order = (LastStandard) ? LastStandard.order + 1 : 0; 

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to create a standard.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('notTeacher', 'Only teachers can create standards.')

    return Standards.insert(standard, function( error, _id) { 
      if ( error ) console.log ( error ); 
    });
  },

  /***** DELETE STANDARD ****/
  deleteStandard: function(standardID) { 
    check(standardID,Match.idString);
    var cU = Meteor.user(); //currentUser
    var standard = Standards.findOne(standardID);

    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a standard.");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('mustBeTeacher', 'You must be a teacher to delete a standard.');

    if (!standard)
      throw new Meteor.Error('invalidID', "Cannot delete standard.  Invalid ID.");

    //check if standard has been used and post warning or suggest
    //just hiding it???

    var ids = _.pluck(Standards.find({categoryID:standard.categoryID,order:{$gt: activity.order}},{fields: {_id: 1}}).fetch(), '_id');
    var numberRemoved = Standards.remove(standardID); 
    Standards.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return numberRemoved; 
  }, 

  /***** UPDATE STANDARD ****/

  /* list of properties of activity object and where/how set

  *title: Match.Optional(Match.nonEmptyString), //see method below
  *description: Match.Optional(String), //see method below
  categoryID: Match.Optional(Match.idString), //set by sortable1c and drag/drop
  visible:  Match.Optional(Boolean), //set by show/hide methods
  order: Match.Optional(Match.Integer), //set by sortable1c and drag/drop
  *scale: Match.OneOf([Match.nonEmptyString],Match.Integer), // see method below
  *calcMethod: Match.Optional(Match.calcMethodString) //latest, average, or average5 or decayingAverage 33 ... where the number can vary
  *calcMethodParam: Match.Integer,  //see method below 
  */

  updateStandard: function(newStandard) {
    check(newStandard,{
      _id:Match.idString,
      title:Match.Optional(Match.nonEmptyString),
      description: Match.Optional(String),
      scale: Match.Optional(Match.OneOf([Match.nonEmptyString],Match.Integer)),
      calcMethod: Match.Optional(Match.calcMethodString)    
    })

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a standard");
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error('onlyTeacher', 'You must be a teacher to update a standard.')

    var standard = Standards.findOne(newStandard._id);
    if (!standard)
      throw new Meteor.Error('standardNotFound','Cannot update standard.  Standard not found.');

    if (('title' in newStandard) && (newStandard.title != standard.title))
      Standards.update(newStandard._id,{$set: {title:newStandard.title}});
    if (('description' in newStandard) && (newStandard.description != standard.description))
      Standards.update(newStandard._id,{$set: {description:newStandard.description}});
    if (('scale' in newStandard) && (newStandard.scale != standard.scale)) {
      //check to be sure no LoMs have used the current scale
      //is there some way to convert???
      Standards.update(newStandard._id,{$set: {scale:newStandard.scale}});
    }
    if (('calcMethod' in newStandard) && (newStandard.calcMethod != standard.calcMethod)) {
      Standards.update(newStandard._id,{$set: {scale:newStandard.scale}});
      //find allLoMs and recalculate their current/average score
    }
  }
});