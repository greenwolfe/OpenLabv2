  /****************************/
 /******* STANDARD PAGE ******/
/****************************/

Template.standardPage.onCreated(function() {
  instance = this;
  var standardID = FlowRouter.getParam('_id');

  instance.autorun(function() {
    var studentID = Meteor.impersonatedOrUserId();
    if ((!studentID) || !Roles.userIsInRole(studentID,'student'))
      return;
    //first get the info that will be immediately shown
    var LoMsThisStudent = Meteor.subscribe('levelsOfMastery',standardID,studentID,null);

    if (LoMsThisStudent.ready()) { //then load the rest in the background
      if (Roles.userIsInRole(Meteor.userId(),'teacher'))
        Meteor.subscribe('levelsOfMastery',standardID,null,null);
    }
  })
})

Template.standardPage.helpers({
  standard: function() {
    return Standards.findOne(FlowRouter.getParam('_id'));
  },
  LoMAveragecolorcode: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var standardID = FlowRouter.getParam('_id');
    if (!studentID || !standardID)
      return '';
    var LoM = LevelsOfMastery.findOne({studentID:studentID,standardID:standardID,visible:true});
    if (!LoM) return '';
    var standard = Standards.findOne(standardID);

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
    var standardID = FlowRouter.getParam('_id');
    if (!studentID || !standardID)
      return '';
    var LoM = LevelsOfMastery.findOne({studentID:studentID,standardID:standardID,visible:true});
    if (!LoM) return '';
    var standard = Standards.findOne(standardID);
    if (_.isArray(standard.scale))
      return LoM.average['schoolyear']; //update for grading period when available 
    return +LoM.average['schoolyear'].toFixed(2) + ' out of ' + standard.scale;
  },
  humanizedCalcMethod: function() {
    var calcMethod = this.calcMethod.split(/[0-9]/)[0]; 
    var calcParam = _.str.toNumber(_.str.strRight(this.calcMethod,calcMethod)); 
    if (calcMethod == 'mostRecent') {
      return 'Your current level of mastery is the most recent score, which replaces all previous scores.';
    } else if (calcMethod == 'average') {
      if (calcParam)
        return 'The most recent ' + calcParam + ' scores are averaged to determine your current level of mastery.';
      return 'All scores are averaged to determine your current level of mastery.'
    } else if (calcMethod == 'decayingAverage') {
      return 'Your current score is ' + calcParam + '% of your most recent score plus ' + (100 - calcParam) + '% of the average of all previous scores.';
    }
  },
  calcHelpMessages: function() {
    return [
      'Enter <i>mostRecent</i> to keep only the most recent score as the current level of mastery.',
      'Enter <i>average</i> to determine the current level of mastery by averaging all scores.',
      'You can add a number after average.  For example, <i>average5</i> means average only the five latest scores.',
      'If you enter <i>decayingAverage33</i> the current level of mastery will be calculated as 33% of the most recent score plus 67% of the average of all previous scores.',
      'You must enter the exact spelling, including the capital letters.'
    ];
  },
  symbolicScale: function() {
    if (_.isArray(this.scale))
      return ' ' + this.scale.join(', ');
    return '0 to ' + this.scale;
  },
  humanizedScaleHelp: function() {
    if (_.isFinite(this.scale))
      return '0 to ' + this.scale;
    return this.scaleHelp;
  },
  scaleHelpMessages: function() {
    return [
      'Enter a positive integer to specify a numerical scale starting at zero.',
      'Enter comma-separated values with explanatory text in parentheses to create a symbolic scale.',
      'Example: NM (no mastery), DM (developing mastery), M (mastery) creates the scale NM,DM,M.',
      'The text you enter will be the help message displayed wherever grades are displayed.'
    ]
  },
  isTeacherViewingAsStudent: function() {
    var cU = Meteor.userId();
    var iU = Meteor.impersonatedId();
    return (Roles.userIsInRole(cU,'teacher') && Roles.userIsInRole(iU,'student'));
  },
  LoMs: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var standardID = FlowRouter.getParam('_id');
    if (!studentID || !standardID)
      return '';
    var selector = {
      studentID: studentID,
      standardID: standardID
    }
    var editingPage = openlabSession.get('editingMainPage');
    if (!editingPage)
      selector.visible = true; //show only visible LoMs
    return LevelsOfMastery.find(selector,{sort:{submitted:-1}});
  }
});

  /***********************/
 /******* LOM ITEM ******/
/***********************/

Template.LoMitem.onRendered(function() {
  instance = this;
  instance.$('[data-toggle="tooltip"]').tooltip();

})

var dateTimeFormat = "[at] h:mm a [on] MM[/]DD[/]YY";
var dateFormat = "ddd, MMM D YYYY";

Template.LoMitem.helpers({
  LoMcolorcode: function() {
    var standard = Standards.findOne(this.standardID);
    var colorcodes = ['LoMlow','LoMmedium','LoMhigh']
    var level;
    var maxVal;
    var index;
    if (_.isArray(standard.scale)) {
      level = standard.scale.indexOf(this.level);
      maxVal = standard.scale.length;
      index = Math.floor(level*3/maxVal);
      index = Math.min(index,2);
    }
    if (_.isFinite(standard.scale)) {
      level = this.level;
      maxVal = standard.scale;
      index = Math.floor(level*3/maxVal);
      index = Math.min(index,2);
    }
    return colorcodes[index];
  },
  LoMtext: function() {
    var standard = Standards.findOne(this.standardID);
    if (_.isArray(standard.scale))
      return this.level;
    return this.level + ' out of ' + standard.scale;
  },
  commentOrNote: function() {
    return this.comment || 'No teacher comment.';
  },
  activity: function() {
    var activity = Activities.findOne(FlowRouter.getParam('_id'));
    if (activity) // is on activity page already
      return '';
    //else return info to make link to activity page
    return Activities.findOne(this.activityID);
  },
  formatDate: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateFormat) : '_____';
  },
  formatDateTime: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateTimeFormat) : '_____';
  }
})

Template.LoMitem.events({
  'click .deleteLoM':function() {
    if (confirm('Are you sure you want to delete this grade and comment?')) {
      Meteor.call('deleteLoM', this._id,alertOnError);
    }
  }
});

  /**********************/
 /******* NEW LOM ******/
/**********************/

Template.newLoM.onCreated(function() {
  var instance = this;
  var standardID = this.data._id;
  instance.previousLoMindex = new ReactiveVar(-1);
  instance.previousLoM = new ReactiveVar();

  instance.autorun(function() {
    var previousLoMindex = instance.previousLoMindex.get();
    if (previousLoMindex >= 0) {
      var previousLoM = LevelsOfMastery.findOne({standardID:standardID},{sort:{copiedAndPasted:-1,submitted:-1},skip:previousLoMindex});
      instance.previousLoM.set(previousLoM);
    } else {
      instance.previousLoM.set(null);
    }
  })
});

Template.newLoM.onRendered(function() {
  var instance = this;
  instance.$('.summernote.comment').summernote({ //default/standard air popover toolbar
    airMode: true,
    airPopover: [
      ['style',['style']],
      ['color', ['color']],
      ['fontname', ['fontname']],
      ['fontsize', ['fontsize']],
      ['supersub', ['superscript','subscript']],
      ['font', ['bold', 'italic', 'strikethrough', 'underline', 'clear']],
      ['para', ['ul', 'ol', 'paragraph']],
      ['table', ['table']],
      ['insert', ['link', 'picture'/*,'video'*/]],
      //['undoredo', ['undo','redo']], //leaving out for now ... not clear what is undone ... not a large queue of past changes, and ctrl-z, ctrl-shift-z reacts more like what you would expect
      ['other',[/*'codeview','fullscreen',*/'help','hide']]
      //ISSUE codeview, fullscreen, not working ... does it work from toolbar and just not from air mode?
      //ISSUE video works, but can't resize it, no context menu as for image
      //leaving out video for now, can use video blocks until this is better
    ]
  })
});

Template.newLoM.helpers({
  previousLoM: function() {
    return Template.instance().previousLoM.get();
  },
  LoMcolorcode: function() {
    var standard = Standards.findOne(this.standardID);
    var colorcodes = ['LoMlow','LoMmedium','LoMhigh']
    var level;
    var maxVal;
    var index;
    if (_.isArray(standard.scale)) {
      level = standard.scale.indexOf(this.level);
      maxVal = standard.scale.length;
      index = Math.floor(level*3/maxVal);
      index = Math.min(index,2);
    }
    if (_.isFinite(standard.scale)) {
      level = this.level;
      maxVal = standard.scale;
      index = Math.floor(level*3/maxVal);
      index = Math.min(index,2);
    }
    return colorcodes[index];
  },
  /*LoMtext: function() { //just number or level here
    var standard = Standards.findOne(this.standardID);
    if (_.isArray(standard.scale))
      return this.level;
    return this.level + ' out of ' + standard.scale;
  },*/
  commentOrNote: function() {
    return this.comment || 'No teacher comment.';
  }
})

Template.newLoM.events({
  'click button[type="submit"]': function(event,tmpl) {
    var level = getTrimmedValbyClass(tmpl,'level');
    var comment = _.str.trim(tmpl.$('.summernote.comment').code());
    comment = _.str.trim(comment,'&nbsp;');
    var LoM = {
      level:level,
      comment: comment,
      studentID: Meteor.impersonatedId(),
      standardID: tmpl.data._id
    }
    Meteor.call('insertLoM',LoM,alertOnError);
    return false;
  },
  'click .showPrevious': function(event,tmpl) {
    tmpl.previousLoMindex.set(0);
  },
    'click .hidePrevious': function(event,tmpl) {
    tmpl.previousLoMindex.set(-1);
  },
  'click .previousCommentStepBackward': function(event,tmpl) {
    var previousLoMindex = tmpl.previousLoMindex.get();
    var maxIndex = LevelsOfMastery.find({standardID:tmpl.data._id}).count() - 1;
    previousLoMindex = Math.min(previousLoMindex + 1,maxIndex);
    tmpl.previousLoMindex.set(previousLoMindex);
  },
  'click .previousCommentStepForward': function(event,tmpl) {
    var previousLoMindex = tmpl.previousLoMindex.get();
    previousLoMindex = Math.max(previousLoMindex - 1,0);
    tmpl.previousLoMindex.set(previousLoMindex);
  },
  'click .pastePrevious': function(event,tmpl) {
    var $comment = tmpl.$('.summernote.comment');
    var $level = tmpl.$('.form-control.level');
    var currentComment = _.str.trim($comment.code());
    var currentLevel = $level.val();
    currentComment = (currentComment) ? _.str.trim(currentComment.replace('&nbsp;',' ')) : null;
    var previousLoM = tmpl.previousLoM.get();
    if (previousLoM) {
      if ((currentComment) && !confirm('This will replace your current comment.  Proceed?'))
        return;
      $comment.code(previousLoM.comment);
      $level.val(previousLoM.level);
      var today = new Date();
      Meteor.call('updateLevelOfMastery',{_id:previousLoM._id,copiedAndPasted:today},function(error) {
        if (error)
          return alert(error.reason);
        tmpl.previousLoMindex.set(0);
      });
    }
  }
})

  /********************************************/
 /****************** HELPERS *****************/
/********************************************/


var getVal = function(tmpl,id) {
  var $element = $(tmpl.find("#" + id));
  if (!$element){
    return null;
  } else {
    return $element.val();
  }
};

var getValbyClass = function(tmpl,c) {
  var $element = $(tmpl.find("." + c));
  if (!$element){
    return null;
  } else {
    return $element.val();
  }
};

var getTrimmedVal = function(tmpl,id) {
  var $element = $(tmpl.find("#" + id));
  if (!$element){
    return null;
  } else {
    return $element.val().replace(/^\s*|\s*$/g, ""); // trim;
  }
};

var getTrimmedValbyClass = function(tmpl,c) {
  var $element = $(tmpl.find("." + c));
  if (!$element){
    return null;
  } else {
    return $element.val().replace(/^\s*|\s*$/g, ""); // trim;
  }
};


