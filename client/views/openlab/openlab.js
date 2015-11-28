Template.openlab.onCreated(function() {
  var iU = Meteor.impersonatedOrUserId();
  var cU = Meteor.userId();  
  var instance = this;

  instance.requestedStudentIDs = {
    plainarray: [],
    reactive: new ReactiveVar([]),
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
});

Template.openlab.onRendered(function() {
  var instance = this;
  instance.autorun(function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'student')) {
      instance.requestedStudentIDs.set([cU]);
      console.log('loading: ' + Meteor.user().username);
      instance.subscribe('openlabPagePubs',[cU],function() {
        console.log('loaded');
        instance.loadedStudentIDs.set([cU]);
      });
    }
  });

  instance.autorun(function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      var iU = Meteor.impersonatedId();
      var rSIDs = instance.requestedStudentIDs.plainarray;
      if (Roles.userIsInRole(iU,'student') && !_.contains(rSIDs,iU)) {
        rSIDs.push(iU);
        instance.requestedStudentIDs.set(rSIDs); 
      }
    }
  });
  instance.autorun(function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      var sectionID = Meteor.selectedSectionId();
      if ((sectionID) && !(Meteor.impersonatedId())) { //section itself selected, rather than student in section
        var rSIDs = instance.requestedStudentIDs.plainarray;
        var sectionMemberIds = Meteor.sectionMemberIds(sectionID);
        var urSIDs = _.difference(sectionMemberIds,rSIDs); //unrequested student IDs
        var numberToAdd = Math.min(urSIDs.length,3);
        if (numberToAdd) 
          instance.requestedStudentIDs.set(rSIDs.concat(urSIDs.slice(0,numberToAdd))); 
      }
    }
  });
  instance.autorun(function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      var rSIDs = instance.requestedStudentIDs.reactive.get();
      var names = rSIDs.map(function(id) {
        var user = Meteor.users.findOne(id);
        if (user)
          return user.username;
        return id;
      });
      console.log('loading: ' + names.join(', '));
      instance.subscribe('openlabPagePubs',rSIDs,function() {
        console.log('loaded');
        instance.loadedStudentIDs.set(rSIDs);
        var sectionID = Meteor.selectedSectionId();
        var sectionMemberIds = Meteor.sectionMemberIds(sectionID);
        var urSIDs = _.difference(sectionMemberIds,rSIDs); //unrequested student IDs
        var numberToAdd = Math.min(urSIDs.length,3);
        if (numberToAdd) 
          instance.requestedStudentIDs.set(rSIDs.concat(urSIDs.slice(0,numberToAdd))); 
      });
    }
  });

  instance.autorun(function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'parentOrAdvisor')) {
      var iU = Meteor.impersonatedId();
      var childOrAdviseeIds = Meteor.childOrAdviseeIds(cU);
      var rSIDs = instance.requestedStudentIDs.plainarray;
      if (_.contains(childOrAdviseeIds,iU) && (!_.contains(rSIDs,iU))) {
        rSIDs.push(iU);
        instance.requestedStudentIDs.set(rSIDs); 
      }
    }
  });
  instance.autorun(function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'parentOrAdvisor')) {
      var rSIDs = instance.requestedStudentIDs.reactive.get();
      var names = rSIDs.map(function(id) {
        var user = Meteor.users.findOne(id);
        if (user)
          return user.username;
        return id;
      });
      console.log('loading: ' + names.join(', '));
      instance.subscribe('openlabPagePubs',rSIDs,function() {
        console.log('loaded');
        instance.loadedStudentIDs.set(rSIDs);
        var childOrAdviseeIds = Meteor.childOrAdviseeIds();
        var urSIDs = _.difference(childOrAdviseeIds,rSIDs); //unrequested student IDs
        var numberToAdd = Math.min(urSIDs.length,3);
        if (numberToAdd) 
          instance.requestedStudentIDs.set(rSIDs.concat(urSIDs.slice(0,numberToAdd))); 
      });
    }
  });
});

Template.openlab.helpers({
  studentSubscriptionLoaded: function() {
    var studentID = Meteor.impersonatedOrUserId();
    if (Roles.userIsInRole(studentID,'student')) {
      var tmpl = Template.instance();
      return _.contains(tmpl.loadedStudentIDs.reactive.get(),studentID);
    } else {
      return true; // not trying to show student data, so don't put message
    }
  }
});