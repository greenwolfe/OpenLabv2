Template.showHide.helpers({
  yellow: function() {
    return (this.item.visible) ? 'yellow' : '';
  },
  visible: function() {
    return (this.item.visible) ? 'Itemvisible' : 'Itemhidden';
  }
});

Template.showHide.events({
  'click .Itemvisible' : function(event,tmpl) {
    Meteor.call('show',tmpl.data.collection,tmpl.data.item._id,false,alertOnError);
  },
  'click .Itemhidden' : function(event,tmpl) {
    Meteor.call('show',tmpl.data.collection,tmpl.data.item._id,true,alertOnError);
  }
});