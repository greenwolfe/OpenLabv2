Template.activityHeader.helpers({
  siteTitle: function() {
      return Site.findOne().title;
  },
  pageTitle: function() {
    var subactivitiesBlock = Blocks.findOne({
      activityID: this._id,
      type: 'subactivities'
    });
    if (!subactivitiesBlock )
      return this.title;
    var title = _.stripTags(subactivitiesBlock.title) || this.title;
    return title;
  }
});

Template.activityHeader.events({
/*  'click #editButton' : function() {
    var userID = Meteor.userId();
    if (!Roles.userIsInRole(userID,'teacher')) {
      openlabSession.set('editingMainPage',false);
      return;
    }
    var editing = Session.get('editingMainPage');
    openlabSession.set('editingMainPage',!editing);
  }*/
})