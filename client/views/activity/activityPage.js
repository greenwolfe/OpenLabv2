
/*

text block, image block, files block, embed block,
to-do list block (drag copy from teacher to student?),
PGA block - conversation with teacher (or just use text
block?) or discussion block?  homework block?

group block:  stays with originally assigned group by default.
option in dropdown to change to current group IF only difference is someone was added to the group
option to copy instead of move, so that something could be shared with more than one group
only owner (original poster, individual student) can delete, edit or move.  Others can copy.
or just offer (share with another group and make a copy?)  See checklist of all
groups (that you are in) and check them off.
*/
/*Meteor.startup(function() {
  Uploader.finished = function(index, file, tmpl) {
    _.extend(file,tmpl.data.formData);
    Meteor.call('insertFile',file,alertOnError);
  }
});*/
Template.activityPage.onCreated(function() {
  //reset to teacher if teacher reached the page while impersonating a parent
  var iU = Meteor.impersonatedOrUserId();
  var cU = Meteor.userId();
  if (Roles.userIsInRole(cU,'teacher') && Roles.userIsInRole(iU,'parentOrAdvisor')) 
    loginButtonsSession.set('viewAs',cU);
  activityPageSession.set('editedWall',null);

  var instance = this;
  instance.autorun(function() {
    var studentID = Meteor.impersonatedOrUserId();
    var activityID = FlowRouter.getParam('_id');
    var sectionID = Meteor.selectedSectionId();
    var wallSubscription = instance.subscribe('walls', studentID,activityID);
    var sectionwallSubscription = instance.subscribe('walls',sectionID,activityID);
  });

  instance.autorun(function() {
    var cU = Meteor.userId();
    if ((!cU) || Roles.userIsInRole(cU,'parentOrAdvisor'))
      return;
    var studentID = Meteor.impersonatedOrUserId();
    var activityID = FlowRouter.getParam('_id');
    if ((studentID) && (activityID))
      Meteor.call('addDefaultWalls',studentID,activityID,alertOnError);
  })
})

Template.activityPage.helpers({
  walls: function() {
    //need to put studentID, groupID's, sectionID in this selector? or should I trust the template level subscription?
    var selector = {activityID:FlowRouter.getParam('_id')}
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher'))
      selector.visible = true;

    var studentID = Meteor.impersonatedOrUserId();
    var createdFors = [Site.findOne()._id]
    if (Roles.userIsInRole(studentID,'student')) {
      createdFors.push(studentID);
      var studentsGroupIds = _.pluck(Memberships.find({
        memberID:studentID,
        collectionName: 'Groups',
      },{fields: {itemID: 1}}).fetch(), 'itemID');
      createdFors = _.union(createdFors,studentsGroupIds);
    }
    createdFors.push(Meteor.selectedSectionId());
    selector.createdFor = {$in: createdFors};

    return Walls.find(selector,{sort: {order:1}});
  },
  sortableOpts: function() {
    return {
      draggable:'.wall',
      handle: '.wallSortableHandle',
      collection: 'Walls',
      selectField: 'activityID',
      selectValue: FlowRouter.getParam('_id'),
      disabled: !activityPageSession.get('editedWall')
    }
  }
});