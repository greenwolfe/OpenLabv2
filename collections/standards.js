Standards = new Meteor.Collection('Standards');

Meteor.methods({

  /***** INSERT STANDARD ****/
  insertStandard: function(standard) { 
    check(standard,{
      title: Match.nonEmptyString,
      categoryID: Match.idString,

      
      /*set below, value not passed in
      description : Match.Optional(Match.String);
      scale: Match.OneOf([Match.nonEmptyString],Match.Integer), // default: ['NM','DM','M'],
      scaleHelp: Match.nonEmptyString, // default: "NM (no mastery), DM (developing mastery), M (mastery)"
      calcMethod: Match.Optional(Match.calcMethodString) //latest, average, or average5 or decayingAverage 33 ... where the number can vary
      visible:  Match.Optional(Boolean),
      masteryExpected: Match.Optional(Date),
      order: Match.Optional(Match.Integer), //for now, new activity always placed at end of list
     */
    });
    standard.description = '';
    standard.scale = ['NM','DM','M'];
    standard.scaleHelp = "NM (no mastery), DM (developing mastery), M (mastery)";
    standard.calcMethod = 'mostRecent';
    standard.visible = true;
    standard.masteryExpected = wayWayInTheFuture();
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

    var LoMcount = LevelsOfMastery.find({standardID:standardID}).count();
    if (LoMcount)
      throw new Meteor.Error('standardAlreadyUsed','This standard has already been used ' + LoMcount + ' times to assess students.  Deleting it would orphan those scores.  Try hiding it instead.');

    var ids = _.pluck(Standards.find({categoryID:standard.categoryID,order:{$gt: activity.order}},{fields: {_id: 1}}).fetch(), '_id');
    var numberRemoved = Standards.remove(standardID); 
    Standards.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
    return numberRemoved; 
  }, 

  /***** UPDATE STANDARD ****/

  /* list of properties of standard object and where/how set

  *title: Match.Optional(Match.nonEmptyString), //see method below
  *description: Match.Optional(String), //see method below
  categoryID: Match.Optional(Match.idString), //set by sortable1c and drag/drop
  visible:  Match.Optional(Boolean), //set by show/hide methods
  order: Match.Optional(Match.Integer), //set by sortable1c and drag/drop
  *scale: Match.OneOf([Match.nonEmptyString],Match.Integer), // see method below
  *scaleHelp: Match.OneOf([Match.nonEmptyString],Match.nonEmptyString), //see method below
  *calcMethod: Match.Optional(Match.calcMethodString) //latest, average, or average5 or decayingAverage 33 ... where the number can vary
  *masteryExpected: Match.Optional(Date) //see method below
  */

  updateStandard: function(newStandard) {
    check(newStandard,{
      _id:Match.idString,
      title:Match.Optional(Match.nonEmptyString),
      description: Match.Optional(String),
      scaleHelp: Match.Optional(Match.scaleString), // a single integer or the form of "NM(no mastery),DM(developing mastery),M(mastery)"
      //scale: Match.Optional(Match.OneOf(Match.scaleString,Match.Integer)),
      calcMethod: Match.Optional(Match.calcMethodString),    
      masteryExpected: Match.Optional(Date)
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

    if (('masteryExpected' in newStandard) && (newStandard.masteryExpected != standard.masteryExpected))
      Standards.update(newStandard._id,{$set: {masteryExpected:newStandard.masteryExpected}});

    if (('scaleHelp' in newStandard) && (newStandard.scaleHelp != standard.scaleHelp)) {
      newStandard.scale = getScale(newStandard.scaleHelp);
      var LoMcount = LevelsOfMastery.find({standardID:newStandard._id}).count();
      if (LoMcount) {
        if (_.isArray(newStandard.scale) && !_.isArray(standard.scale))
          throw new Meteor.Error('stringToNumericalNotAllowed', 'At the present time, there is no way to convert a symbolic scale to a numerical one once scores have already been entered.');
        if (!_.isArray(newStandard.scale) && _.isArray(standard.scale))
          throw new Meteor.Error('numericalToStringNotAllowed', 'At the present time, there is no way to convert a numerical scale into a symbolic one  once scores have already been entered.');
        if (!_.isArray(newStandard.scale) && (newStandard.scale.length < standard.scale.length))
          throw new Meteor.Error('cannotShrinkSymbolicScale','At the present time, it is not possible to shrink the size of a symbolic scale  once scores have already been entered.  The new scale must have at least as many scores as the old one.');
      }
      Standards.update(newStandard._id,{$set: {scaleHelp:newStandard.scaleHelp}});
      var checkValue = (_.isArray(standard.scale)) ? standard.scale.join(',') : standard.scale;
      var newCheckValue = (_.isArray(newStandard.scale)) ? newStandard.scale.join(',') : newStandard.scale;
      if (newCheckValue != checkValue) {
        Standards.update(newStandard._id,{$set: {scale:newStandard.scale}},function(error,num){
          if (error) return;
          if (_.isFinite(newStandard.scale)) return;
          LevelsOfMastery.find({standardID:newStandard._id}).forEach(function(LoM) {
            var index = standard.scale.indexOf(LoM.level);
            var level = newStandard.scale[index];
            LevelsOfMastery.update(LoM._id,{$set:{level:level}});
          })
        }); 
      }       
    }

    if (('calcMethod' in newStandard) && (newStandard.calcMethod != standard.calcMethod)) {
      Standards.update(newStandard._id,{$set: {calcMethod:newStandard.calcMethod}},function(error,num) {
        if (error) return;
        var studentsSet = [];
        LevelsOfMastery.find({standardID:newStandard._id}).forEach(function(LoM) {
          if (_.contains(studentsSet,LoM.studentID)) {
            return;
          } else {
            studentsSet.push(LoM.studentID);
          } 
          Meteor.updateLoMaverages(LoM); 
        });
      });
    }

    return newStandard._id;
  }
});

  /*********************/
 /****  UTILITIES  ****/
/*********************/

//assumes scaleHelp has the proper form as it was checked with Match.scaleString
var getScale = function(scaleHelp) {
  var scaleHelp = _.str.trim(scaleHelp);
  var numericalScale = _.str.toNumber(scaleHelp);
  if (_.isFinite(numericalScale)) return numericalScale;

  var symbolicScale = scaleHelp.split(',');
  return symbolicScale.map(function(step) {
    if (step.match(/\(([^)]+)\)/))  //contains (anything)
      step = _.str.strLeft(step,'('); //everything to left of first (
    return step.replace(/ /g,''); //delete all spaces
  })
/* regexp matches (anything), explanation below
    \( : match an opening parentheses
    ( : begin capturing group
    [^)]+: match one or more non ) characters
    ) : end capturing group
    \) : match closing parentheses
*/
}