  /************************/
 /*** STANDARDS LIST  ****/
/************************/

Template.standardsList.onRendered(function() {
  $('.fa.fa-question-circle[data-toggle="tooltip"]').tooltip();
});

Template.standardsList.helpers({
  categories: function() {
    var selector = {};
    if (!editingMainPage())
      selector.visible = true; //show only visible categories
    return Categories.find(selector,{sort: {order: 1}});
  },
  sortableOpts: function() {
    return {
      draggable:'.categorytitle',
      handle: '.sortCategory',
      collection: 'Categories',
      selectField: 'app', //selects all categories
      selectValue: 'openlab', //as openlab is only allowed value of app field
      disabled: !editingMainPage() 
    }
  }
});

  /*************************/
 /**** CATEGORY TITLE  ****/
/*************************/

Template.categoryTitle.helpers({
  active: function() {
    var activeCategory = openlabSession.get('activeCategory');
    return (this._id == activeCategory) ? 'active' : '';
  },
  active2: function() {
    return (this._id == openlabSession.get('activeCategory2')) ? 'active2':'';
  },
  hidden: function() {
    var activeCategory = openlabSession.get('activeCategory');
    var activeCategory2 = openlabSession.get('activeCategory2');
    return ((this._id == activeCategory) || (this._id == activeCategory2)) ? '' : 'hidden';
  },
  percentExpected: function() { 
    var selector = {
      categoryID: this._id,
      visible: true //only visible standards count
    }
    var total = Standards.find(selector).count(); 
    if (total == 0)
      return 0;
    var today = new Date();
    selector.masteryExpected = {$lt:today};
    var expected = Standards.find(selector).count(); 
    return expected*100/total;
  },
  percentCompleted: function() { 
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return 0;
    var selector = {
      categoryID: this._id,
      visible: true //only visible standards count
    }
    var standards = Standards.find(selector).fetch();
    var total = standards.length;
    if (total == 0)
      return 0;
    standards = standards.filter(function(standard) {
      var LoM = LevelsOfMastery.findOne({standardID:standard._id,studentID:studentID});
      if (!LoM) return false;
      var level = LoM.average.schoolyear; //edit to select grading period when available
      if (_.isArray(standard.scale)) {
        var index = standard.scale.indexOf(level);
        return (index == standard.scale.length - 1);
      } else {
        return (level*100/standard.scale > 88);
      }
    });
    return standards.length*100/total;
  }
});

Template.categoryTitle.events({
  'click li > a': function(event,tmpl) {
    event.preventDefault();
    $('#workPeriodPopoverX').modal('hide'); // fixes bug in workPeriodPopoverX ... see notes there
    if (event.ctrlKey) {
      var activeCategory2 = openlabSession.get('activeCategory2');
      var activeCategory = openlabSession.get('activeCategory');
      if (tmpl.data._id == activeCategory2) {
        openlabSession.set('activeCategory2',null);
      } else if (tmpl.data._id == activeCategory){
        return;
      } else if ((activeCategory2) && (tmpl.data._id == activeCategory)) {
        openlabSession.set('activeCategory',activeCategory2);
        openlabSession.set('activeCategory2',null);
      } else {
        openlabSession.set('activeCategory2',tmpl.data._id);
      }
    } else {
      openlabSession.set('activeCategory',tmpl.data._id);
      if (tmpl.data._id == openlabSession.get('activeCategory2'))
        openlabSession.set('activeCategory2',null);
    }
  },
  'dragstart li > a': function(event,tmpl) {
    //bootstrap navs are draggable by default
    //disabling this behavior so you have to grab
    //the draggable handle to sort the categories
    event.preventDefault();
  }
})

  /*****************************/
 /** ACTIVITY LIST HEADER  ****/
/*****************************/

Template.standardListHeader.helpers({
  colWidth: function() {
    return openlabSession.get('activeCategory2') ? 'col-md-6' : 'col-md-12';
  },
  bgsuccess: function() {
    return openlabSession.get('activeCategory2') ? 'bgsuccess' : 'bgprimary';
  },
  bgprimary: function() {
    //return 'bgprimary';
    return openlabSession.get('activeCategory2') ? 'bgprimary' : '';
  },
  percentExpected: function() { 
    var selector = {
      categoryID: this._id,
      visible: true //only visible standards count
    }
    var total = Standards.find(selector).count(); 
    if (total == 0)
      return 0;
    var today = new Date();
    selector.masteryExpected = {$lt:today};
    var expected = Standards.find(selector).count(); 
    return expected*100/total;
  },
  percentCompleted: function() { 
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return 0;
    var selector = {
      categoryID: this._id,
      visible: true //only visible standards count
    }
    var standards = Standards.find(selector).fetch();
    var total = standards.length;
    if (total == 0)
      return 0;
    standards = standards.filter(function(standard) {
      var LoM = LevelsOfMastery.findOne({standardID:standard._id,studentID:studentID});
      if (!LoM) return false;
      var level = LoM.average.schoolyear; //edit to select grading period when available
      if (_.isArray(standard.scale)) {
        var index = standard.scale.indexOf(level);
        return (index == standard.scale.length - 1);
      } else {
        return (level*100/standard.scale > 88);
      }
    });
    return standards.length*100/total;
  }
});


  /*************************/
 /** STANDARD LIST  *******/
/*************************/

Template.standardList.onCreated(function() {
  instance = this;

  instance.autorun(function() {
    var userID = Meteor.impersonatedOrUserId();
    if (!userID)
      return;
    var categoryID = instance.data._id;
    //first get the info that will be immediately shown
    var LoMsThisCategory = Meteor.subscribe('levelsOfMastery',categoryID,userID,null);

    if (LoMsThisCategory.ready()) { //then load the rest in the background
      var LoMsThisUser = Meteor.subscribe('levelsOfMastery',null,userID,null); 
      if (LoMsThisUser.ready() && Roles.userIsInRole(Meteor.userId(),'teacher'))
        Meteor.subscribe('levelsOfMastery',categoryID,null,null);
    }
  })
})

Template.standardList.helpers({
  colWidth: function() {
    return openlabSession.get('activeCategory2') ? 'col-md-6' : 'col-md-12';
  },
  standards0: function() {
    var selector = {
      categoryID: this._id
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    return Standards.find(selector,{sort: {order: 1}}); 
  },
  standards2: function() {
    var activeCategory2 = openlabSession.get('activeCategory2');
    var selector = {
      categoryID: this._id
    };
    if (!editingMainPage())
      selector.visible = true; //show only visible activities
    return Standards.find(selector,{sort: {order: 1}}); 
  },
  bgsuccess: function() {
    return openlabSession.get('activeCategory2') ? 'bgsuccess' : '';
  },
  bgprimary: function() {
    //return 'bgprimary';
    return openlabSession.get('activeCategory2') ? 'bgprimary' : '';
  },
  sortableOpts2: function() {
    var activeCategory2 = openlabSession.get('activeCategory2');
    return {
      draggable:'.sItem',
      handle: '.sortStandard',
      group: 'standardColumn',
      collection: 'Standards',
      selectField: 'categoryID',
      selectValue: activeCategory2,
      disabled: !editingMainPage() //currently not working
      //disabled: (!Session.get('editedWall')), //!= this.wallID to apply to a single wall 
    }    
  },
  sortableOpts: function() {
    return {
      draggable:'.sItem',
      handle: '.sortStandard',
      group: 'standardColumn',
      collection: 'Standards',
      selectField: 'categoryID',
      selectValue: this._id,
      //disabled: !editingMainPage() //currently not working
      //disabled: (!Session.get('editedWall')), //!= this.wallID to apply to a single wall 
    }
  }
});


  /*************************/
 /** STANDARD ITEM  *******/
/*************************/

Template.standardItem.helpers({
  LoMAveragecolorcode: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var standard = this;
    if (!studentID || !standard)
      return '';
    var LoM = LevelsOfMastery.findOne({studentID:studentID,standardID:standard._id,visible:true});
    if (!LoM) return '';
    return Meteor.LoMcolorcode(LoM.average['schoolyear'],standard.scale);
    //update for grading period when available
  },
  LoMAveragetext: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var standard = this;
    if (!studentID || !standard)
      return '';
    var LoM = LevelsOfMastery.findOne({studentID:studentID,standardID:standard._id,visible:true});
    if (!LoM) return '';
    if (_.isArray(standard.scale))
      return LoM.average['schoolyear']; //update for grading period when available 
    return +LoM.average['schoolyear'].toFixed(2) + ' out of ' + standard.scale;
  },
  humanizedScaleHelp: function() {
    if (_.isFinite(this.scale))
      return '0 to ' + this.scale;
    return this.scaleHelp;
  },
  dateset: function() {
    var wayInTheFuture = moment(wayWayInTheFuture()).subtract(1,'days').toDate();
    return (this.masteryExpected < wayInTheFuture) ? 'dateset' : '';
  }
});

Template.standardItem.events({
  'click .standardSetCompletionDate': function(event,tmpl) {
    Session.set('completionDate', this);
  }
});

  /********************************/
 /*** SET COMPLETION DATE  *******/
/********************************/

var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
var dateFormat = "ddd, MMM D YYYY";

Template.setCompletionDate.onRendered(function() {
  var instance = this;
  instance.$('#completionDatePicker').datetimepicker({
    inline: true,
    format: "MM/DD/YYYY",
    showClear: true
  });
})

Template.setCompletionDate.helpers({
  title: function() {
    var standard = Session.get('completionDate');
    var title = 'Set Completion Date';
    if (standard)
      title = standard.title;
    return title;
  }
})

Template.setCompletionDate.events({
  'shown.bs.modal #setCompletionDate': function(event,tmpl) {
    //position the modal as a popover and show the cartoon bubble arrow
    var setCompletionDateButton = $(event.relatedTarget);
    var setCompletionDatePopover = tmpl.$('#setCompletionDate');
    setCompletionDatePopover.positionOn(setCompletionDateButton,'left');
    $('body').css({overflow:'auto'}); //default modal behavior restricts scrolling
   },
   'show.bs.modal #setCompletionDate': function(event,tmpl) {
     var standard = Session.get('completionDate');
     var date = null;
     if (standard) {
      var wayInTheFuture = moment(wayWayInTheFuture()).subtract(1,'days').toDate();
      if (standard.masteryExpected < wayInTheFuture) 
        date = standard.masteryExpected;
    }
    tmpl.$('#completionDatePicker').data('DateTimePicker').date(date);
   },
  'dp.change #completionDatePicker': function(event,tmpl) {
    var date = (event.date) ? event.date.startOf('day').toDate() : wayWayInTheFuture(); //the dateIsNull function treats longLongAgo as a null value
    var standard = Session.get('completionDate');
    if (!standard) return;
    Meteor.call('updateStandard',{
      _id:standard._id,
      masteryExpected: date
    },alertOnError);
  },
  'hide.bs.modal #setCompletionDate': function(event,tmpl) {
    Session.set('completionDate',null);
    tmpl.$('#completionDatePicker').data('DateTimePicker').date(null);
  }
})

  /*************************/
 /*** NEW STANDARD  *******/
/*************************/

Template.newStandard.helpers({
  fixedFields: function() {
    return {categoryID:this._id}
  }
})

  /**********************/
 /*** UTILITIES  *******/
/**********************/

var percentExpected = function() { 
  var selector = {
    categoryID: this._id,
    visible: true //only visible standards count
  }
  var total = Standards.find(selector).count(); 
  if (total == 0)
    return 0;
  var today = new Date();
  selector.masteryExpected = {$lt:today};
  var expected = Standards.find(selector).count(); 
  return expected*100/total;
};

var percentCompleted = function() { 
  var studentID = Meteor.impersonatedOrUserId();
  if (!Roles.userIsInRole(studentID,'student'))
    return 0;
  var selector = {
    categoryID: this._id,
    visible: true //only visible standards count
  }
  var standards = Standards.find(selector).fetch();
  var total = standards.length;
  if (total == 0)
    return 0;
  standards = standards.filter(function(standard) {
    var LoM = LevelsOfMastery.findOne({standardID:standard._id,studentID:studentID});
    if (!LoM) return false;
    var level = LoM.average.schoolyear; //edit to select grading period when available
    if (_.isArray(standard.scale)) {
      var index = standard.scale.indexOf(level);
      return (index == standard.scale.length - 1);
    } else {
      return (level*100/standard.scale > 88);
    }
  });
  return standards.length*100/total;
}