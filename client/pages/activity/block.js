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

  /**********************/
 /******* BLOCK** ******/
/**********************/


Template.block.helpers({
  blockType: function() {
    return Template[this.type + 'Block'];
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
    block.idFromCopiedBlock = block._id;
    block.order = ClipboardBlocks.find().count() + 1;
    delete block._id;
    delete block.columnID;
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
  }
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
    var studentOrGroupID = theUserID;
    var purpose = 'fileBlock';
    return {
      finished: function(index, file, tmpl) {
        file.blockID = blockID;
        file.purpose='fileBlock';
        var fileId = Meteor.call('insertFile',file,alertOnError);
      },
      validate: validateFiles
    }
  },
  formData: function() { //passed to uploads to create file path
    var formData = this;
    formData.user = 'username';
    formData.purpose = 'fileBlock';
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
  }
});

  /**********************/
 /**** FILELINK  *******/
/**********************/

Template.fileLink.events({
  'click .deleteFile': deleteFile 
});

  /******************************/
 /**** WORK SUBMIT BLOCK *******/
/******************************/
/*** needs a student ID - as all blocks do ***/
/*** disable ability for student to copy/paste or move to another wall ***/

Template.workSubmitBlock.helpers({
  studentFiles: function() {
    var selector = {blockID:this._id};
    selector.studentOrGroupID = theUserID;
    selector.purpose = 'submittedWork';
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    return Files.find(selector,{sort: {order:1}});
  },
  teacherFiles: function() {
    var selector = {blockID:this._id};
    selector.studentOrGroupID = theUserID;
    selector.purpose = 'teacherResponse';
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    return Files.find(selector,{sort: {order:1}});
  },
  processStudentUpload: function() {
    var blockID = this._id;
    var studentOrGroupID = theUserID;
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
    var studentOrGroupID = theUserID;
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
    var formData = this;
    formData.user = 'username';
    formData.purpose = 'submittedWork';
    return formData;
  },
  teacherFormData: function() {
    var formData = this; //work out system, would be nice to store this together with student submission
    formData.user = 'username';
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
  }*/
});

  /******************************/
 /**** WORK SUBMIT LINK  *******/
/******************************/

//make this a standard helper at the top?
Template.workSubmitLink.events({
  'click .deleteFile': deleteFile 
});

  /***********************************/
 /**** TEACHER RESPONSE LINK  *******/
/***********************************/

Template.teacherResponseLink.events({
  'click .deleteFile': deleteFile 
})