Template.activityTagsPopoverX.onCreated(function() {
  var instance = this;
  instance.nullActivity = {
      _id: '',
      pointsTo: '',
      title: '',
      unitID: '',
      studentID: '',  //deprecated?
      visible:  true,
      order: 0, 
      suborder: 0,
      wallOrder: ['teacher','student','group','section'],
      wallVisible: {teacher:true,student:true,group:true,section:true},
      tag: ''
  };
  instance.activity = new ReactiveVar(this.nullActivity);

  instance.nullStatus = {
    _id: '',
    studentID: '',
    activityID: '',
    unitID: '',
    pointsTo: '',
    level: 'nostatus',
    incrementedBy: '',
    incrementedAt: new Date(),
    increment: 1,
    late: false,
    tag: ''
  };
  instance.status = new ReactiveVar(this.nullStatus);

  instance.autorun(function() {
    var activity = Session.get('activityForTagModal') || instance.nullActivity;
    activity.tag = 'no activity tags yet'; // remove this once activities have tags!
    instance.activity.set(activity);
    var studentID = Meteor.impersonatedOrUserId();
    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activity._id}) || instance.nullStatus;
    instance.status.set(status);
  })
});

Template.activityTagsPopoverX.helpers({
  title: function() {
    var tmpl = Template.instance();
    var activity = tmpl.activity.get();
    var status = tmpl.status.get();
    var title = activity.title;
    if (activity.tag)
      title += ' (' + activity.tag + ')';
    if (status.tag)
      title += ' <strong>(' + status.tag + ')</strong>';
    return title || 'Add/change tags';
  },
  studentID: function() {
    var studentID = Meteor.impersonatedOrUserId();
    if (Roles.userIsInRole(studentID,'student'))
      return studentID;
    return '';
  }
})

Template.activityTagsPopoverX.events({
  /*'show.bs.modal #activityTagsPopoverX': function(event,tmpl) {
    //data passed from triggering element
    var activity = Session.get('activityForTagModal') || tmpl.nullActivity;
    activity.tag = 'no activity tags yet'; // remove this once activities have tags!
    tmpl.activity.set(activity);
    var studentID = Meteor.impersonatedOrUserId();
    var status = ActivityStatuses.findOne({studentID:studentID,activityID:activity._id}) || tmpl.nullStatus;
    tmpl.status.set(status);
  },*/
  'shown.bs.modal #activityTagsPopoverX': function(event,tmpl) {
    //position the modal as a popover and show the cartoon bubble arrow
    var tagIcon = $(event.relatedTarget);
    var activityTagsPopover = tmpl.$('#activityTagsPopoverX');
    activityTagsPopover.positionOn(tagIcon,'right');
    $('body').css({overflow:'auto'}); //default modal behavior restricts scrolling
  },
  'hide.bs.modal #activityTagsPopoverX': function(event,tmpl) {
    Session.set('activityForTagModal',tmpl.nullActivity);
    tmpl.activity.set(tmpl.nullActivity);
    tmpl.status.set(tmpl.nullStatus);
    tmpl.$('#newTag').val('');
  },
  'click #saveForStudent' : function(event,tmpl) {
    var newTag = tmpl.$('#newTag').val();
    var activity = tmpl.activity.get();
    var studentID = Meteor.impersonatedOrUserId();
    Meteor.call('statusSetTag',studentID,activity._id,newTag,function(error,id) {
      if (error) {
        alert(error.reason);
      } else {
        var status = ActivityStatuses.findOne({studentID:studentID,activityID:activity._id});
        tmpl.status.set(status);
      }
    });
  }
})