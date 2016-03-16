  /**********************/
 /******* HELPERS ******/
/**********************/
var validateFiles = function(files) {
  return (_.max(_.pluck(files,'size')) < 1e8);  //100MB
}
var deleteFile = function(event,template) {
  if (confirm('If this is the last link to this file, \nthe file itself will also be deleted.  \nAre you sure you want to delete this link?')) {
    Meteor.call('deleteFile', this._id,alertOnError);
  }
}

editingBlock = function(blockID) {
  var block = Blocks.findOne(blockID) || this;
  var cU = Meteor.userId();
  var iU = Meteor.impersonatedOrUserId();
  if (Roles.userIsInRole(cU,'parentOrAdvisor'))
    return false;
  var isEditing = inEditedWall(block.wallID);
  if (Roles.userIsInRole(cU,'teacher'))
    return isEditing;
  if (Roles.userIsInRole(cU,'student') && Meteor.studentCanEditBlock(iU,block))
    return isEditing;
  return false;
}

  /********************/
 /******* BLOCK ******/
/********************/

var dateTimeFormat = "[at] h:mm a MM[/]DD[/]YY";
var dateFormat = "ddd, MMM D YYYY";

Template.block.helpers({
  editingBlock: editingBlock,
  blockType: function() {
    return this.type + 'Block';
  },
  isAssessmentBlock: function() {
    return (this.type == 'assessment');
  },
  fileCount: function() {
    var selector = {blockID:this._id};
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    return Files.find(selector).count();
  },
  LoMcount: function() {
    return LevelsOfMastery.find({assessmentID:this._id}).count();
  },
  subactivity: function() {
    if (this.type == 'subactivities')
      return ''; //don't put subactivity in header of subactivity block ... redundant and possibly confusing
    var subactivity = Activities.findOne(this.subActivityID);
    var wall = Walls.findOne(this.wallID);
    if (subactivity) {
      subactivity.inBlockHeader = true;
      subactivity.inTeacherWall = (wall.type == 'teacher');
      return subactivity;
    }
    var cU = Meteor.userId();
    if (inEditedWall(this.wallID) && Roles.userIsInRole(cU,'teacher')) {
      subactivity = Activities.findOne(FlowRouter.getParam('_id'));
      if (subactivity) {
        subactivity.inBlockHeader = true;
        subactivity.inTeacherWall = (wall.type == 'teacher');
        subactivity.tag = '';
        subactivity.title = "link an activity to this block"
        subactivity._id = '';
        return subactivity;
      }
      return '';
    }
    return '';
  },
  /*virtualWorkStatus: function() {
    return 'icon-raise-virtual-hand';
  },
  raiseHand: function () {
    return this.raiseHand || '';
  },*/
  canView: function() {
    var cU = Meteor.user();
    if (!cU) return false;
    if (Roles.userIsInRole(cU,'parentOrAdvisor')) {
      var wall = Walls.findOne(this.wallID);
      if ((wall.type == 'group') || (wall.type == 'section'))
        return false;
      if (wall.type == 'student')
        return (_.contains(['file','text','assessment'],this.type));
    }
    return true;
  },
  createdForName: function() {
    var site = Site.findOne(this.createdFor);
    if (site)
      return 'all students';
    var student = Meteor.users.findOne(this.createdFor);
    if (student)
      return Meteor.getname(this.createdFor,'full');
    var group = Groups.findOne(this.createdFor);
    if (group)
      return Meteor.groupies(this.createdFor);
    var section = Sections.findOne(this.createdFor);
    if (section)
      return section.name;
    return '';
  },
  formatDate: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateFormat) : '_____';
  },
  formatDateTime: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateTimeFormat) : '_____';
  }
});

Template.block.events({
  'click .deleteBlock':function() {
    if (confirm('Are you sure you want to delete this block?')) {
      Meteor.call('deleteBlock', this._id,alertOnError);
    }
  },
  'click .copyBlock': function(event,tmpl) {
    if (!event.ctrlKey) { //clear the clipboard
      ClipboardBlocks.find().forEach(function(block) {
        ClipboardBlocks.remove(block._id);
      });
    } //else do nothing ... add block to clipboard
    var block = Blocks.findOne(this._id);
    block.order = ClipboardBlocks.find().count() + 1;
    ClipboardBlocks.insert(block);
  },
  'click .buttonRaiseVirtualHand': function() {
    var block = {
      _id: this._id,
      raiseHand: (this.raiseHand) ? '' : 'visible'
    }
    Meteor.call('updateBlock',block,alertOnError);
  }
});

  /**********************/
 /***** TEXTBLOCK ******/
/**********************/
Template.textBlock.onCreated(function() {
  this.blockTextSubscription = this.subscribe('blockText',this.data._id);
})

Template.textBlock.helpers({
  editingBlock:editingBlock
})

  /**********************/
 /**** EMBEDBLOCK ******/
/**********************/
Template.embedBlock.helpers({
  //if I encounter anyone inserting a title or text
  //before the iframe, I can add a beforeIframe component
  embedCodeIframe: function() { //returns just the iframe
    return _.strLeft(this.embedCode, '</iframe>') + '</iframe>';
  },
  embedCodeAfterIframe: function() { //includes an html after the iframe
    return _.strRight(this.embedCode, '</iframe>') 
  },
  editingBlock:editingBlock
});

/* to embed javascript ... currently disabled as
some javascript seems to hang the site, even
when loaded after rendering as below
Template.embedBlock.onRendered(function() {
  if (!this.data.embedCode) return;
  if (_.str.include(this.data.embedCode,'<script')) {
    var el = this.firstNode.parentElement;
    //$(el).prepend(this.data.embedCode);
  }
});*/

  /**********************/
 /**** CODEMIRROR ******/
/**********************/

Template.codemirror.onRendered(function() {
  var data = this.data || {};
  editor = CodeMirror.fromTextArea(this.find(".codemirror"), {
    lineNumbers: false,
    lineWrapping: true,
    theme: 'monokai',
    mode: "htmlmixed"
  });
  editor.on("blur", function(codemirror) {
    var embedCode = codemirror.getValue();
    if (_.str.include(embedCode,'<script')) {
      codemirror.setValue('This embed code contains javascript and has been blocked because some embedded javascript makes \n the site hang up. If you are trying to aggregate and post rss, atom or twitter feeds, use the feed block.');
      return;
    }
    Meteor.call('updateBlock',{_id:data._id,
                               embedCode:embedCode
                              },
                              alertOnError);
  })
})

Template.codemirror.events({
  'click .codeexample': function(event,tmpl) {
    var embedCode = '<iframe src="http://www.caryacademy.org" width="500" height="212"></iframe> <!--replace www.caryacademy.org with your own url if the web page or web app does not provide its own embed code -->' + tmpl.data.embedCode;
    Meteor.call('updateBlock',{_id:tmpl.data._id,
                               embedCode:embedCode
                             },
                             alertOnError);
    var editor = tmpl.find('.CodeMirror').CodeMirror;
    editor.setValue(embedCode);
  }
});

  /**********************/
 /**** FILEBLOCK *******/
/**********************/

Template.fileBlock.onCreated(function() {
  this.blockTextSubscription = this.subscribe('blockText',this.data._id);
})

Template.fileBlock.helpers({
  files: function() {
    var selector = {blockID:this._id};
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    return Files.find(selector,{sort: {order:1}});
  },
  processUpload: function() { //passed to insertFile method to create object referring to file
    var blockID = this._id
    var studentOrGroupID = Meteor.impersonatedOrUserId();
    //var purpose = 'fileBlock';
    return {
      finished: function(index, file, tmpl) {
        file.blockID = blockID;
        var fileId = Meteor.call('insertFile',file,alertOnError);
      },
      validate: validateFiles
    }
  },
  //path = /username/unit/activity/walltype[/userorgroup]/date 
  formData: function() { //passed to tomi:uploadserver to create file path
    var path = '';
    var name;
    /* username */
    var cU = Meteor.user(); 
    if (cU) name = _.str.slugify(Meteor.user().username);
    if (name) path += '/' + name;
    var activity = Activities.findOne(this.activityID);
    if (activity) {
      /* unit */
      var unit = Units.findOne(activity.unitID);
      name = (unit) ? _.str.slugify(unit.title) : '';
      if (name) path += '/' + name;
      /* activity */
      name = _.str.slugify(activity.title);
      if (name) path += '/' + name;
    }
    var wall = Walls.findOne(this.wallID);
    if (wall) {
      /* wall type */
      path += '/' + wall.type + 'Wall';
      if (Roles.userIsInRole(cU,'teacher')) {
        /* student */
        if (wall.type == 'student') {
          var student = Meteor.users.findOne(wall.createdFor);
          name = (student && Roles.userIsInRole(student,'student')) ? student.username : '';
          if (name) path += '/' + name;
        }
        /* group */
        if (wall.type == 'group') {
          name = Meteor.groupFirstNames(wall.createdFor);
          if (name) path += '/' + name;
        }
        /* section */
        if (wall.type == 'section') {
          var section = Sections.findOne(wall.createdFor);
          name =  (section) ? _.str.slugify(section.name) : '';
          if (name) path += '/' + name;
        }
      }
    }
    /* date */
    path += '/' + moment().format('DDMMMYYYY');
    return {path:path};
  },
  sortableOpts: function() {
    return {
      draggable:'.file',
      handle: '.moveFile',
      collection: 'Files',
      selectField: 'blockID',
      selectValue: this._id
    }
  },
  editingBlock:editingBlock
});

  /**********************/
 /**** FILELINK  *******/
/**********************/

Template.fileLink.onRendered(function() {
  $('a[data-toggle="tooltip"]').tooltip();
})

Template.fileLink.helpers({
  //not using right now ... saving for later reference
  absolutePath: function() {
    return Meteor.absoluteUrl('.uploads' + this.path);
  },
  editingBlock: function() {
    return editingBlock(this.blockID);
  },
  formatDate: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateFormat) : '_____';
  },
  formatDateTime: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateTimeFormat) : '_____';
  }
})

Template.fileLink.events({
  'click .deleteFile': deleteFile 
});




  /******************************/
 /**** SUBACTIVITIES BLOCK *****/
/******************************/

//subscriptions to status and progress occur at activity page level

Template.subactivitiesBlock.helpers({
  helpMessages: function () {
    return [
      'Activities created here will also appear in the main units and activities list, for example on the main page.',
      "They will all link back to the same activity page - this one.",
      "Reordering of the list in this block is independent of the main list.  In the main list, these activities can be sorted among the other activities or even moved to other units.",
      "The title of this block, if it exists, will be used as the title of the page as well.  Otherwise, the title of the initial activity is used.",
      "Create just one subactivities block per activity page.  It can be deleted and re-created without causing problems, but it is probably better just to hide it if you don't want it visible to students."
    ]
  },
  subactivities: function() {
    var activity = Activities.findOne(this.activityID);
    return Activities.find({
      pointsTo:activity._id
    },{sort: {suborder: 1}});
  },
  sortableOpts: function() {
    var activity = Activities.findOne(this.activityID);
    return {
      draggable:'.aItem',
      handle: '.sortActivity',
      collection: 'Activities',
      selectField: 'pointsTo',
      selectValue: activity._id,
      sortField: 'suborder',
      disabled: (!inEditedWall(this.wallID)) //!= this.wallID to apply to a single wall 
      //onAdd: function(evt) {
      //  Meteor.call('denormalizeBlock',evt.data._id,alertOnError);
      //}
    }
  }
})

  /**************************/
 /*** SUBACTIVITY ITEM  ****/
/**************************/

/* currentStatus */
var currentStatus = function(activityID) {
  var studentID = Meteor.impersonatedOrUserId();
  var data = Template.parentData(function(data){return ('createdFor' in data)});
  if ((data) && Meteor.users.find(data.createdFor).count())
    studentID = data.createdFor;
  var studentID = ((data) && Meteor.users.find(data.createdFor).count()) ? data.createdFor : Meteor.impersonatedOrUserId();
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
}
/* currentProgress */
/*var currentProgress = function(activityID) {
  var studentID = Meteor.impersonatedOrUserId();
  var data = Template.parentData(function(data){return ('createdFor' in data)});
  if ((data) && Meteor.users.find(data.createdFor).count())
    studentID = data.createdFor;
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityProgress.findOne({studentID:studentID,activityID:activityID});
}*/

Template.subactivityItem.helpers({
  currentlyEditing: function() {
    var parent = Template.parentData();
    if ('wallID' in parent)
      return (activityPageSession.get('editedWall') == parent.wallID);
    var instance = Template.instance();
    parent = instance.parent();
    if ('editingList' in parent)
      return parent.editingList.get();
    return false;
  },
  canDelete: function() {
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher')) return false;
    var numBlocks = Blocks.find({activityID:this._id,type:{$ne:'subactivities'}}).count();
    var numSubActivities = Activities.find({pointsTo:this._id}).count();
    return ((this._id != this.pointsTo) || ((numBlocks == 0) && (numSubActivities == 1)) );
  },
  subactivities: function() {
    return Activities.find({pointsTo:this.pointsTo});
  },
  workPeriod: function () {
    //find existing workPeriod
    var workPeriod =  WorkPeriods.findOne({
      activityID: this._id,
      sectionID: Meteor.selectedSectionId()
    });
    if (workPeriod) 
      return workPeriod;

    //else get unit dates off a workPeriod for another activity from the same unit and section
    //unitDatesWithoutSelf are by definition the unitDates for the other workPeriod
    workPeriod = WorkPeriods.findOne({
      unitID: this.unitID,
      sectionID: Meteor.selectedSectionId()
    });
    if (workPeriod) {
      //keep existing unitID, sectionID, unitDates 
      workPeriod.activityID = this._id;
      workPeriod.activityVisible = this.visible;
      workPeriod.startDate = longLongAgo();
      workPeriod.endDate = longLongAgo();
      workPeriod.unitStartDateWithoutSelf = workPeriod.unitStartDate;
      workPeriod.unitEndDateWithoutSelf = workPeriod.unitEndDate;
      return workPeriod;
    }

    //else make up a stub with all null values
    workPeriod = {
      activityID: this._id, //passed in for later use
      unitID: this.unitID, //passed in for completeness, probably not used to display data
      activityVisible: this.visible, //passed in for completeness, probably not used to display data
      sectionID: 'applyToAll', //default value
      startDate: longLongAgo(),
      endDate: longLongAgo(),
      unitStartDate: longLongAgo(),
      unitEndDate: notSoLongAgo(),
      unitStartDateWithoutSelf: wayWayInTheFuture(),
      unitEndDateWithoutSelf: notSoLongAgo()
    };
    return workPeriod;
  },
  /*progress: function() {
    var progress = currentProgress(this._id);
    if (!progress)
      return 'icon-notStarted'
    return 'icon-' + progress.level;
  },*/
  status: function() {
    var status = currentStatus(this._id);
    if (!status)
      return 'icon-nostatus'
    return 'icon-' + status.level;
  },
  statusTitle: function() {
    var status = currentStatus(this._id);
    if (!status)
      return 'not started';
    var titleDict = {
      'nostatus':'empty inbox: not started',
      'submitted':'full inbox: work submitted, waiting for teacher response',
      'returned':'full outbox:  Returned with comments by your teacher.  Please revise and resubmit.',
      'donewithcomments':'Done.  Revisions not required but review comments by your teacher before taking an assessment',
      'done':'Done.'};
    return titleDict[status.level];
  },
  /*progressTitle: function() {
    var progress = currentProgress(this._id);
    if (!progress)
      return 'not started';
    var titleDict = {
      'notStarted':'not started',
      'oneBar':'barely started',
      'twoBars':'almost half-way done',
      'threeBars':'more than half-way done',
      'fourBars':'80% there',
      'fiveBars':'just about done'};
    return titleDict[progress.level];
  },*/
  late: function() {
    var status = currentStatus(this._id);
    if (!status)
      return '';
    return (status.late) ? 'icon-late' : '';  
  },
  studentOrSectionID: function() {
    var cU = Meteor.userId();
    if (Roles.userIsInRole(cU,'teacher')) {
      var studentID = Meteor.impersonatedId();
      var data = Template.parentData(function(data){return ('createdFor' in data)});
      if ((data) && Meteor.users.find(data.createdFor).count())
        studentID = data.createdFor;
      if (studentID)
        return 'id=' + studentID;
      var sectionID = Meteor.selectedSectionId();
      if (sectionID)
        return 'id=' + sectionID;
      return '';
    } else {
      var studentID = Meteor.impersonatedOrUserId(); //in case is parent viewing as student
      var data = Template.parentData(function(data){return ('createdFor' in data)});
      if ((data) && Meteor.users.find(data.createdFor).count())
        studentID = data.createdFor;
      if (studentID)
        return 'id=' + studentID; 
      return '';     
    }
  },
  tags: function() {
    var studentID = Meteor.impersonatedOrUserId();
    var data = Template.parentData(function(data){return ('createdFor' in data)});
    if ((data) && Meteor.users.find(data.createdFor).count())
      studentID = data.createdFor;
    var activityID = this._id;
    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
    var tags = '';
    if (this.tag) 
      tags += ' (' + this.tag + ')';
    var block = Template.parentData();
    var wall = Walls.findOne(block.wallID);
    if ((wall) && (wall.type == 'teacher') && (this.inBlockHeader))
      return tags;
    if ((status) && (status.tag))
      tags += '<strong> (' + status.tag + ')</strong>';
    return tags;    
  }
});

Template.subactivityItem.events({
  'click .deleteActivity':function(event,tmpl) {
    var isNotSubActivity = (tmpl.data._id == tmpl.data.pointsTo);
    if (confirm('Are you sure you want to delete this activity?')) {
      Meteor.call('deleteActivity', tmpl.data._id,function(error,num){
        if (error) {
          alert(error.reason);
        } else {
          alert('Activity deleted');
          if (isNotSubActivity)
            FlowRouter.go('/');
        }
      });
    }
  },
  'click li.subactivityChoice': function(event,tmpl) {
    var block = Template.parentData();
    var subactivity = this;
    if (subactivity._id != block.subActivityID) 
      Meteor.call('updateBlock',{_id:block._id,subActivityID:subactivity._id},alertOnError);
    event.preventDefault();
  },
  'click li.chooseNoSubactivity': function(event,tmpl) {
    var block = Template.parentData();
    Meteor.call('updateBlock',{_id:block._id,subActivityID:''},alertOnError);
    event.preventDefault();
  },
  'click .activityProgress': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    var data = Template.parentData(function(data){return ('createdFor' in data)});
    if ((data) && Meteor.users.find(data.createdFor).count())
      studentID = data.createdFor;
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('incrementProgress',studentID,tmpl.data._id,alertOnError);  
  },
  'click .activityStatus': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    var data = Template.parentData(function(data){return ('createdFor' in data)});
    if ((data) && Meteor.users.find(data.createdFor).count())
      studentID = data.createdFor;
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('incrementStatus',studentID,tmpl.data._id,alertOnError);  
  },
  'click .activityPunctual': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    var data = Template.parentData(function(data){return ('createdFor' in data)});
    if ((data) && Meteor.users.find(data.createdFor).count())
      studentID = data.createdFor;
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('markOnTime',studentID,tmpl.data._id,alertOnError);  
  },
  'click .tagActivity': function(event,tmpl) {
    Session.set('activityForTagModal',this);
    var studentID = Meteor.impersonatedOrUserId();
    var data = Template.parentData(function(data){return ('createdFor' in data)});
    if ((data) && Meteor.users.find(data.createdFor).count())
      studentID = data.createdFor;
    Session.set('studentIDForTagModal',studentID);
  }
})

  /*************************/
 /*** NEW SUBACTIVITY  ****/
/*************************/

Template.newSubactivity.helpers({
  fixedFields: function() {
    var activity = Activities.findOne(this.activityID);
    if (!activity) 
      activity = Activities.findOne(Activities.findOne(FlowRouter.getParam('_id')));
    return {
      unitID:activity.unitID,
      pointsTo:activity._id
    }
  }
})

  /***************************/
 /**** ASSESSMENT BLOCK *****/
/***************************/

Template.assessmentBlock.onCreated(function() {
  this.blockTextSubscription = this.subscribe('blockText',this.data._id);
})

Template.assessmentBlock.onRendered(function() {
  instance = this;
  instance.$('[data-toggle="tooltip"]').tooltip();
})

Template.assessmentBlock.helpers({
  standards: function() {
    var selectedStandardIDs = this.standardIDs || [];
    var selectedStandards = Standards.find({_id:{$in:selectedStandardIDs}}).fetch();
    selectedStandards.sort(function(sa,sb) {
      return selectedStandardIDs.indexOf(sa._id) - selectedStandardIDs.indexOf(sb._id);
    });
    return selectedStandards;
  },
  LoMs: function() {
    var block = Template.parentData();
    var wall = Walls.findOne(block.wallID);
    var studentID = (wall.type == 'student') ? block.createdFor : Meteor.impersonatedOrUserId();
    var standardID = this._id;
    var instance = Template.instance();
    if (!studentID || !standardID)
      return '';
    var selector = {
      studentID: studentID,
      standardID: standardID,
      assessmentID: instance.data._id,
      visible: true
    }
    return LevelsOfMastery.find(selector,{sort:{submitted:-1}});
  },
  LoMAveragecolorcode: function() {
    var block = Template.parentData();
    var wall = Walls.findOne(block.wallID);
    var studentID = (wall.type == 'student') ? block.createdFor : Meteor.impersonatedOrUserId();
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
    var block = Template.parentData();
    var wall = Walls.findOne(block.wallID);
    var studentID = (wall.type == 'student') ? block.createdFor : Meteor.impersonatedOrUserId();
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
  editingBlock:editingBlock
});

Template.assessmentBlock.events({
  'click .assessmentAddStandards': function(event,tmpl) {
    activityPageSession.set('assessmentID',tmpl.data._id);
  },
  'click .gradeAssessment': function(event,tmpl) {
    var data = Template.parentData(function(data){return ('createdFor' in data)});
    if ((data) && Roles.userIsInRole(data.createdFor,'student'))
      loginButtonsSession.set('viewAs',data.createdFor);    
    FlowRouter.go('assessmentPage',{_id:tmpl.data._id});
  }
})

  /******************************/
 /**** WORK SUBMIT BLOCK *******/
/******************************/
/*** needs a student ID - as all blocks do ***/
/*** disable ability for student to copy/paste or move to another wall ***/
/*
Template.workSubmitBlock.helpers({
  helpMessages: function () {
    return [
      'Submit one or more distinct files here, as the assignment requires.',
      "Just click inside the dotted blue outline and start typing to add additional information or a note about your assignment.",
      "Click anywhere outside the blee outline to save changes.",
      "The formatting menu appears when you select text.",
      "Your teacher will look over your work and return a file with comments and/or leave you a message in return.",
      "It is suggested that you use a new work submission block to submit a new draft or revision of the same file or files.  That way each resubmission and the teacher response are kept together."
    ]
  },
  studentFiles: function() {
    var selector = {blockID:this._id};
    //what if this is in a group wall?
    selector.studentOrGroupID = Meteor.impersonatedOrUserId();;
    selector.purpose = 'submittedWork';
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    return Files.find(selector,{sort: {order:1}});
  },
  teacherFiles: function() {
    var selector = {blockID:this._id};
    //selector.studentOrGroupID = theUserID; //show files for all teachers
    selector.purpose = 'teacherResponse';
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    return Files.find(selector,{sort: {order:1}});
  },
  processStudentUpload: function() {
    var blockID = this._id;
    //what if this is in a group wall?
    var studentOrGroupID = Meteor.impersonatedOrUserId();
    return {
      //make this a standard function at the top?
      finished: function(index, file, tmpl) {
        file.blockID = blockID;
        file.studentOrGroupID = studentOrGroupID;
        file.purpose = 'submittedWork';
        var fileId = Meteor.call('insertFile',file,alertOnError);
        var block = {
         _id: blockID,
          raiseHand: 'visible'
        }
        Meteor.call('updateBlock',block,alertOnError);
      },
      validate: validateFiles
    }
  },
  processTeacherUpload: function() {
    var blockID = this._id;
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher'))
      return null;
    //what if this is in a group wall?
    var student = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(student,'student'))
      return null;
    var studentOrGroupID = student;
    return {
      finished: function(index, file, tmpl) {
        file.blockID = blockID;
        file.studentOrGroupID = studentOrGroupID;
        file.purpose = 'teacherResponse';
        var fileId = Meteor.call('insertFile',file,alertOnError);
      },
      validate: validateFiles
    }
  },
  studentFormData: function() {
    var student = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(student,'student'))
      return null;
    var formData = this;
    formData.user = student;
    formData.purpose = 'submittedWork';
    return formData;
  },
  teacherFormData: function() {
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,'teacher'))
      return null;
    var formData = this; //work out system, would be nice to store this together with student submission
    formData.user = cU;
    formData.purpose = 'teacherResponse';
    return formData;
  }/*,
  //Right now, sortable cannot handle a more complicated
  //selector involving two fields
  sortableOpts: function() {
    return {
      draggable:'.file',
      handle: '.moveFile',
      collection: 'Files',
      selectField: 'blockID',
      selectValue: this._id
    }
  }//
});*/

  /******************************/
 /**** WORK SUBMIT LINK  *******/
/******************************/

//make this a standard helper at the top?
/*Template.workSubmitLink.events({
  'click .deleteFile': deleteFile 
});*/

  /***********************************/
 /**** TEACHER RESPONSE LINK  *******/
/***********************************/

/*Template.teacherResponseLink.events({
  'click .deleteFile': deleteFile 
})*/