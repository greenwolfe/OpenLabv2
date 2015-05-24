  /**********************/
 /******* HELPERS ******/
/**********************/
var getBlocks = function(column) {
  var selector = {columnID:column._id};
  if (!inEditedWall(column.wallID)) //if not editing
    selector.visible = true //show only visible blocks
  return Blocks.find(selector,{sort: {order:1}});
}

//add a paste block(s) option to paste copied blocks into the column
Template.column.helpers({
  blocks: function() {
    return getBlocks(this);
  },
  sortableOpts: function() {
    return {
      draggable:'.block',
      handle: '.blockSortableHandle',
      group: 'column',
      collection: 'Blocks',
      selectField: 'columnID',
      selectValue: this._id,
      disabled: (!Session.get('editedWall')), //!= this.wallID to apply to a single wall 
      onAdd: function(evt) {
        Meteor.call('denormalizeBlock',evt.data._id,alertOnError);
      }
    }
  },
  empty: function() {
    var selector = {columnID:this._id};
    if (!inEditedWall(this.wallID)) //if not editing
      selector.visible = true //show only visible blocks
    var numBlocks = Blocks.find(selector,{sort: {order:1}}).count();
    return (this.visible && (numBlocks > 0)) ? '' : 'empty';
  },
  disableShrink: function() {
    return (this.width > 2) ? '':'disabled';
  },
  disableExpand: function() {
    var widths = _.pluck(Columns.find({wallID:this.wallID},{fields:{width:1}}).fetch(),'width');
    var totalWidth = widths.reduce(function(a, b){return a+b;})
    return (totalWidth < 12) ? '':'disabled';
  },
  disableAdd: function() {
    var widths = _.pluck(Columns.find({wallID:this.wallID},{fields:{width:1}}).fetch(),'width');
    var totalWidth = widths.reduce(function(a, b){return a+b;})
    return (totalWidth < 11) ? '':'disabled';
  },
  disableDelete: function() {
    var numBlocks = Blocks.find({columnID:this._id}).count();
    var numColumns = Columns.find({wallID:this.wallID}).count();
    return ((numColumns >1) && (numBlocks == 0)) ? '':'disabled';
  },
  visibleOrEditing: function() {
    return (this.visible || (inEditedWall(this.wallID)));
  },
  blocksInClipboard: function() {
    return !!ClipboardBlocks.find().count();
  }
});

Template.column.events({
  'click .copyBlocks': function(event,tmpl) {
    if (!event.ctrlKey) { //clear the clipboard
      ClipboardBlocks.find().forEach(function(block) {
        ClipboardBlocks.remove(block._id);
      });
    } //else do nothing ... add block to clipboard
    getBlocks(tmpl.data).forEach(function(block) {
      block.idFromCopiedBlock = block._id;
      block.order = ClipboardBlocks.find().count() + 1;
      delete block._id;
      delete block.columnID;
      ClipboardBlocks.insert(block);
    });
  },
  'click .pasteBlock': function(event,tmpl) {
    ClipboardBlocks.find({},{sort:{order:-1}}).forEach(function(block) {
      delete block._id;
      delete block.order;
      block.columnID = tmpl.data._id;
      Meteor.call('insertBlock',block,alertOnError);
    });
  },
  'click .addTextBlock': function(event,tmpl) {
    var block = {
      columnID: tmpl.data._id,
      type: 'text',
      title: '',
      text: ''
    }
    Meteor.call('insertBlock',block,alertOnError);
  },
  'click .addEmbedBlock': function(event,tmpl) {
    var block = {
      columnID: tmpl.data._id,
      type: 'embed',
      title: '',
      embedCode: ''
    }
    Meteor.call('insertBlock',block,alertOnError);
  },
  'click .addFileBlock': function(event,tmpl) {
    var block = {
      columnID: tmpl.data._id,
      type: 'file',
      title: ''
    }
    Meteor.call('insertBlock',block,alertOnError);
  },
  'click .addWorkSubmitBlock': function(event,tmpl) {
    var block = {
      columnID: tmpl.data._id,
      type: 'workSubmit',
      title: ''
    }
    Meteor.call('insertBlock',block,alertOnError);
  },
  'click .shrinkColumn': function(event,tmpl) {
    Meteor.call('shrinkColumn',tmpl.data._id,alertOnError);
  },
  'click .expandColumn': function(event,tmpl) {
    Meteor.call('expandColumn',tmpl.data._id,alertOnError);
  },
  'click .addLeft': function(event,tmpl) {
    Meteor.call('insertColumn',tmpl.data.wallID,tmpl.data.order,'left',alertOnError);
  },
  'click .addRight': function(event,tmpl) {
    Meteor.call('insertColumn',tmpl.data.wallID,tmpl.data.order,'right',alertOnError); 
  },
  'click .deleteColumn': function(event,tmpl) {
    Meteor.call('deleteColumn',tmpl.data._id,alertOnError);
  }
});