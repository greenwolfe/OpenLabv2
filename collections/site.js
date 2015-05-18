Site = new Meteor.Collection('Site');

/* Site.insert({
  title: 'Open Lab',
  dueDateBlurb: '',
  activityTypes: ['activity','assessment','reassessment','lab']
}); */

Meteor.methods({

  /***** POST SITE ****/
  postSite: function(site) { 
    var cU = Meteor.user(); //currentUser
    var siteId;

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to alter the admin variables.");
    
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to alter the admin variables.')
    
    if (!site.hasOwnProperty('title') || !site.title)
      throw new Meteor.Error(413, "Cannot add site variables.  Missing title.");

    if (!site.hasOwnProperty('dueDateBlurb'))
      site.dueDateBlurb = '';

    if (site.hasOwnProperty('activityTypes') && !_.isArray(site.activityTypes))
      throw new Meteor.Error(414, "Cannot add admin variables.  Activity types must be an array.")

    siteID = Site.insert(site);

    return siteID; 
  },

  /**** UPDATE SITE ****/

  /**** SITE ADD ACTIVITY TYPE ****/
  siteAddActivityType: function(newAT) {
    var cU = Meteor.user(); //currentUser
    var site = Site.findOne();

    if (!cU)  
      throw new Meteor.Error(401, "You must be logged in to alter the admin variables.");
    
    if (!Roles.userIsInRole(cU,'teacher'))
      throw new Meteor.Error(409, 'You must be a teacher to alter the admin variables.')

    if (!newAT || !_.isString(newAt)) 
      throw new Meteor.Error(414,'Activity Type must be a string.')

    if (site.hasOwnProperty('activityTypes')) {
      Site.update(site._id,{$addToSet: {activityTypes: newAT}});
    } else {
      Site.update(site._id,{activityTypes: [newAT]});
    }

    return site._id;
  }

  /**** SITE REMOVE ACTIVITY TYPE ****/

});