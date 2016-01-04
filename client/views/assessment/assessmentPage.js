  /**************************/
 /**** ASSESSMENT PAGE *****/
/**************************/

Template.assessmentPage.onCreated(function() {
  var instance = this;
  instance.showAssessment = new ReactiveVar('this'); //or all
  instance.showTimePeriod = new ReactiveVar('mostRecent'); //or all time

  var assessmentSubscription = Meteor.subscribe('assessment',FlowRouter.getParam('_id'));

  instance.autorun(function() {
    if (!assessmentSubscription.ready())
      return;
    var assessment = Blocks.findOne(FlowRouter.getParam('_id'));
    if (!assessment)
      return
    var subactivitySubscription = Meteor.subscribe('assessmentSubactivity',assessment.subActivityID);
    if (!subactivitySubscription.ready())
      return;
    var activity = Activities.findOne(assessment.subActivityID);
    if (!activity) 
      return;
    Meteor.subscribe('assessmentSubactivity',activity.pointsTo);
    var studentID = Meteor.impersonatedOrUserId();    
    if ((!studentID) || !Roles.userIsInRole(studentID,'student'))
      return;
    var sectionID = Meteor.selectedSectionId();

    //subscribing to more than is absolutely necessary for this page, but didn't want to write a more specific publish function
    //can always do that
    var subActivityStatuses = Meteor.subscribe('subActivityStatuses',studentID,activity.pointsTo);
    var subActivityProgress = Meteor.subscribe('subActivityProgress',studentID,activity.pointsTo);
//workPeriod subscription now at site/global level
//    var thisUnitWorkPeriods = instance.subscribe('workPeriods',sectionID,activity.unitID);

    //first get the info that will be immediately shown
    var LoMsThisStudentAndAssessment = Meteor.subscribe('levelsOfMastery',assessment.standardIDs,studentID,activity._id);

    if (LoMsThisStudentAndAssessment.ready()) { //then load the rest in the background
      var LoMsThisStudent = Meteor.subscribe('levelsOfMastery',assessment.standardIDs,studentID,null); //all levels and comments for these standards
      
      if (LoMsThisStudent.ready() && Roles.userIsInRole(Meteor.userId(),'teacher'))
        Meteor.subscribe('levelsOfMastery',assessment.standardIDs,null,null); //and for all students ... for copy and pasting of past comments
    }
  });
});

Template.assessmentPage.helpers({
  subactivity: function() {
    var assessment = Blocks.findOne(FlowRouter.getParam('_id'));
    if (assessment)
      return Activities.findOne(assessment.subActivityID);
    return '';
  },
  standards: function() {
    var assessment = Blocks.findOne(FlowRouter.getParam('_id'));
    if (!assessment)
      return '';
    var selectedStandardIDs = assessment.standardIDs || [];
    var selectedStandards = Standards.find({_id:{$in:selectedStandardIDs}}).fetch();
    selectedStandards.sort(function(sa,sb) {
      return selectedStandardIDs.indexOf(sa._id) - selectedStandardIDs.indexOf(sb._id);
    });
    return selectedStandards;
  },
  validStudent: function() {
    var studentID = Meteor.impersonatedOrUserId();
    return Roles.userIsInRole(studentID,'student');
  },
  LoMAveragecolorcode: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var standardID = this._id;
    if (!studentID || !standardID)
      return '';
    var LoM = LevelsOfMastery.findOne({studentID:studentID,standardID:standardID,visible:true});
    if (!LoM) return '';
    var standard = Standards.findOne(standardID);
    return Meteor.LoMcolorcode(LoM.average['schoolyear'],standard.scale);
    //update for grading period when available
  },
  LoMAveragetext: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var standardID = this._id;
    if (!studentID || !standardID)
      return '';
    var LoM = LevelsOfMastery.findOne({studentID:studentID,standardID:standardID,visible:true});
    if (!LoM) return '';
    var standard = Standards.findOne(standardID);
    if (_.isArray(standard.scale))
      return LoM.average['schoolyear']; //update for grading period when available 
    return +LoM.average['schoolyear'].toFixed(2) + ' out of ' + standard.scale;
  },
  showThis: function() {
    var tmpl = Template.instance();
    return (tmpl.showAssessment.get() == 'this') ? 'active' : '';
  },
  showAll: function() {
    var tmpl = Template.instance();
    return (tmpl.showAssessment.get() == 'all') ? 'active' : '';
  },
  showMostRecent: function() {
    var tmpl = Template.instance();
    return (tmpl.showTimePeriod.get() == 'mostRecent') ? 'active' : '';
  },
  showAllTime: function() {
    var tmpl = Template.instance();
    return (tmpl.showTimePeriod.get() == 'allTime')? 'active' : '';
  },
  LoMs: function() {
    var tmpl = Template.instance();
    var studentID = Meteor.impersonatedOrUserId();
    var standardID = this._id;
    if (!studentID || !standardID)
      return '';
    var selector = {
      studentID: studentID,
      standardID: standardID
    }
    //var editingPage = openlabSession.get('editingMainPage');
    //if (!editingPage)
    //  selector.visible = true; //show only visible LoMs
    if (tmpl.showAssessment.get() == 'this')
      selector.assessmentID = FlowRouter.getParam('_id');
    if (tmpl.showTimePeriod.get() == 'mostRecent') {
      return LevelsOfMastery.find(selector,{sort:{submitted:-1},limit:1});
    } else {
      return LevelsOfMastery.find(selector,{sort:{submitted:-1}});
    }
  }
});

Template.assessmentPage.events({
  'click .thisAssessment': function(event,tmpl) {
    tmpl.showAssessment.set('this');
  },
  'click .allAssessments': function(event,tmpl) {
    tmpl.showAssessment.set('all');
  },
  'click .mostRecent': function(event,tmpl) {
    tmpl.showTimePeriod.set('mostRecent');
  },
  'click .allTime': function(event,tmpl) {
    tmpl.showTimePeriod.set('allTime');
  },  
});