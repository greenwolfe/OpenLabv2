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
  percentExpected: function() { //percentExpected,
    return 0; //replace this by checking standard.masteryExpected
  },
  percentCompleted: function() { //percentCompleted 
    return 0; //replace this by checking levelOfMastery.level
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
  percentExpected: function() { //percentExpected,
    return 70;
  },
  percentCompleted: function() { //percentCompleted 
    return 30;
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

    var colorcodes = ['LoMlow','LoMmedium','LoMhigh']
    var level;
    var maxVal;
    var index;
    if (_.isArray(standard.scale)) {
      level = standard.scale.indexOf(LoM.average['schoolyear']); //update for grading period when available
      maxVal = standard.scale.length;
      index = Math.floor(level*3/maxVal);
      index = Math.min(index,2);
    }
    if (_.isFinite(standard.scale)) {
      level = LoM.average['schoolyear']; //update for grading period when available
      maxVal = standard.scale;
      index = Math.floor(level*3/maxVal);
      index = Math.min(index,2);
    }
    return colorcodes[index];
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

