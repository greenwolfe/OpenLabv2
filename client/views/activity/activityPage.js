
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

  //if cU or iU is a student, that student's default walls are addeded, and data is sent over 
  //in full by flowrouter and fast-render with the initial page load.
  var instance = this;
  //reactive var needed so this doesn't flip when the publication is invalidated when student data is loaded in the background
  instance.initialSubscriptionsLoaded = new ReactiveVar(false);

  instance.requestedStudentIDs = {
    plainarray: [FlowRouter.getQueryParam('id')],
    reactive: new ReactiveVar([FlowRouter.getQueryParam('id')]),
    set:function(newvalue) { 
      this.plainarray = newvalue; 
      this.reactive.set(newvalue) 
    }
  };
  instance.loadedStudentIDs = {
    plainarray: [],
    reactive: new ReactiveVar([]),
    set:function(newvalue) { 
      this.plainarray = newvalue; 
      this.reactive.set(newvalue) 
    }
  };
  //get all groups walls for this activity to create the group list for browsing
  if (Roles.userIsInRole(cU,'teacher')) {
    instance.subscribe('groupWalls',FlowRouter.getParam('_id'));
  }
});

Template.activityPage.onRendered(function() {
  var instance = this;
  var cU = Meteor.userId();
  if (Roles.userIsInRole(cU,'teacher')) {
    instance.autorun(function() {
      var iU = Meteor.impersonatedId();
      var rSIDs = instance.requestedStudentIDs.plainarray;
      if (Roles.userIsInRole(iU,'student') && !_.contains(rSIDs,iU)) {
        rSIDs.push(iU);
        instance.requestedStudentIDs.set(rSIDs); 
      }
      var sectionID = Meteor.selectedSectionId();
      if ((sectionID) && !_.contains(rSIDs,sectionID)) {
        rSIDs.push(sectionID);
        instance.requestedStudentIDs.set(rSIDs);
      }
    })
  }
  if (Roles.userIsInRole(cU,'parentOrAdvisor')) {
    instance.autorun(function() {
      var iU = Meteor.impersonatedId();
      var childOrAdviseeIds = Meteor.childOrAdviseeIds(Meteor.users(cU));
      var rSIDs = instance.requestedStudentIDs.plainarray;
      if (_.contains(childOrAdviseeIds,iU) && (!_.contains(rSIDs,iU))) {
        rSIDs.push(iU);
        instance.requestedStudentIDs.set(rSIDs); 
      }
    })
  }
  if (Roles.userIsInRole(cU,['teacher','parentOrAdvisor'])) {
    instance.autorun(function() {
      var rSIDs = instance.requestedStudentIDs.reactive.get();
      var activityID = FlowRouter.getParam('_id');
      var names = rSIDs.map(function(id) {
        var user = Meteor.users.findOne(id);
        if (user)
          return user.username;
        var section = Sections.findOne(id);
        if (section)
          return section.name;
        return id;
      });
      console.log('loading' + names.join());
      instance.subscribe('activityPagePubs',rSIDs,activityID,function() {
        console.log('loaded');
        instance.loadedStudentIDs.set(rSIDs);
        var sectionID = Meteor.selectedSectionId();
        var sectionMemberIds = Meteor.sectionMemberIds(sectionID);
        var urSIDs = _.difference(sectionMemberIds,rSIDs); //unrequested student IDs
        var numberToAdd = Math.min(urSIDs.length,3);
        if (numberToAdd) 
          instance.requestedStudentIDs.set(rSIDs.concat(urSIDs.slice(0,numberToAdd))); 
      });
    });
  }
});

Template.activityPage.helpers({
  initialSubscriptionsLoaded: function() {
    var tmpl = Template.instance();
    var subsReady = FlowRouter.subsReady('initialActivityPagePub');
    if (subsReady) { //latch this so it doesn't invalidate when publish function is called to load more student data in the background
      tmpl.initialSubscriptionsLoaded.set(true);
      return true;
    }
    return tmpl.initialSubscriptionsLoaded.get();
  },
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