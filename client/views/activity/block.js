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

  /**********************/
 /******* BLOCK** ******/
/**********************/

Template.block.onCreated(function() {
  var instance = this;
  instance.autorun(function() {
    var fileSubscription = instance.subscribe('files', instance.data._id);
  });
})

var dateTimeFormat = "[at] h:mm a MM[/]DD[/]YY";
var dateFormat = "ddd, MMM D YYYY";

Template.block.helpers({
  editingBlock: editingBlock,
  blockType: function() {
    return this.type + 'Block';
  },
  fileCount: function() {
    var selector = {blockID:this._id};
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    return Files.find(selector).count();
  },
  virtualWorkStatus: function() {
    return 'icon-raise-virtual-hand';
  },
  raiseHand: function () {
    return this.raiseHand || '';
  },
  isParentAndCantView: function() {
    var cU = Meteor.user();
    if (Roles.userIsInRole(cU,['teacher','student']))
      return false;
    var wall = Walls.find(this.wallID);
    if (wall.type == 'teacher')
      return false;
    if ((wall.type == 'student') && (this.type = 'file'))
      return false;
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
    mode: "htmlmixed", 
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
  formData: function() { //passed to uploads to create file path
    //is this actually used?  If so, for what?
    var formData = this;
    formData.createdBy = Meteor.userId();
    //formData.purpose = 'fileBlock'; //deprecated?
    return formData;
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


  /******************************/
 /**** SUBACTIVITIES BLOCK *****/
/******************************/

Template.subactivitiesBlock.onCreated(function() {
  instance = this;

  instance.autorun(function() {
    var userID = Meteor.impersonatedOrUserId();
    var activity = Activities.findOne(instance.data.activityID);

    if (activity)
      var thisUnitSubscription = Meteor.subscribe('subActivityStatuses',userID,activity.pointsTo);
  })
})

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
  if (!Roles.userIsInRole(studentID,'student'))
    return undefined;
  return ActivityStatuses.findOne({studentID:studentID,activityID:activityID});
}

Template.subactivityItem.helpers({
  workPeriod: function () {
    return {
      unitStartDate: moment().subtract(2, 'weeks').toDate(),
      unitEndDate: moment().add(2,'weeks').toDate(),
      startDate: moment().add(2,'days').toDate(),
      endDate: moment().add(6,'days').toDate()
    };
  },
  status: function() {
    var status = currentStatus(this._id);
    if (!status)
      return 'icon-notStarted'
    return 'icon-' + status.level;
  },
  late: function() {
    var status = currentStatus(this._id);
    if (!status)
      return '';
    return (status.late) ? 'icon-late' : '';  
  }
});

Template.subactivityItem.events({
  'click .activityStatus': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('incrementStatus',studentID,tmpl.data._id,alertOnError);  
  },
  'click .activityPunctual': function(event,tmpl) {
    var studentID = Meteor.impersonatedOrUserId();
    if (!Roles.userIsInRole(studentID,'student'))
      return; 
    Meteor.call('markOnTime',studentID,tmpl.data._id,alertOnError);  
  }
})

  /*************************/
 /*** NEW SUBACTIVITY  ****/
/*************************/

Template.newSubactivity.helpers({
  fixedFields: function() {
    var activity = Activities.findOne(this.activityID);
    return {
      unitID:activity.unitID,
      pointsTo:activity._id
    }
  }
})