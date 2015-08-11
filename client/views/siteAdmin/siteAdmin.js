//to-do:  add a confirmation button when save is accepted 
//or add a notification area at the top that says this ... changed to ... that
  /*********************/
 /**** SITE ADMIN  ****/
/*********************/

Template.siteAdmin.helpers({
  Site: function() {
    return Site.findOne();
  },
  gradingPeriods: function() {
    return GradingPeriods.find();
  },
  sections: function() {
    return Sections.find();
  }
})
  /***************************/
 /**** EDIT SITE PARAMS  ****/
/***************************/

Template.editSiteParams.events({
  'click button[type="submit"]': function(event,tmpl) {
    var title = getTrimmedValbyClass(tmpl,'sitetitle');
    if (title)
      Meteor.call('updateSite',{
        _id:tmpl.data._id,
        title:title
      })
    return false;
  }
});

  /**********************/
 /**** EDIT SECTION ****/
/**********************/

Template.editSection.events({
  'click button[type="submit"]': function(event,tmpl) {
    var name = getTrimmedValbyClass(tmpl,'name');
    if (name) {
      var section = {
        name:name      
      }
      if (('_id' in tmpl.data) && Sections.findOne(tmpl.data._id)) {
        section._id = tmpl.data._id;
        Meteor.call('updateSection',section);
      } else {
        Meteor.call('insertSection',section);
      }
    }
    return false;
  },
  'click button[type="delete"]': function(event,tmpl) {
    if (('_id' in tmpl.data) && Sections.findOne(tmpl.data._id))
      Meteor.call('deleteSection',tmpl.data._id,alertOnError);
    return false;
  }
})

Template.editSection.helpers({
  new: function() {
    if (('_id' in this) && Sections.findOne(this._id))
      return '';
    return 'New ';
  },
  SaveSubmit: function() {
    if (('_id' in this) && Sections.findOne(this._id))
      return 'Save';
    return 'Submit';    
  },
  empty: function() {
    if (!('_id' in this) || !Sections.findOne(this._id))
      return false; //no need for delete button if section doesn't exist
    var enrolledStudents = Meteor.sectionMemberIds(this._id);
    return (enrolledStudents.length == 0);
  }
})

  /*****************************/
 /**** EDIT GRADING PERIOD ****/
/*****************************/

var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
var dateFormat = "ddd, MMM D YYYY";

Template.editGradingPeriod.onRendered(function() {
  this.$('.startDatePicker').datetimepicker({
    showClose:  true,
    showClear: true,
    keepOpen: false,
    format: dateFormat,
    widgetPositioning: {vertical:'bottom',horizontal:'auto'},
    keyBinds: {enter: function(widget) {
      if (widget.find('.datepicker').is(':visible')) {
        this.hide();
      } else {
        this.date(widget.find('.datepicker').val());
      }
    }}
  });
  this.$('.endDatePicker').datetimepicker({
    showClose: true,
    showClear: true,
    keepOpen: false,
    format: dateFormat,  
    widgetPositioning: {vertical:'bottom',horizontal:'auto'},
    keyBinds: {enter: function(widget) {
      if (widget.find('.datepicker').is(':visible')) {
        this.hide();
      } else {
        this.date(widget.find('.datepicker').val());
      }
    }}
  });
  var date = this.data.startDate || null;
  this.$('.startDatePicker').data("DateTimePicker").date(date);
  date = this.data.endDate || null;
  this.$('.endDatePicker').data("DateTimePicker").date(date);
})

Template.editGradingPeriod.events({
  'click button[type="submit"]': function(event,tmpl) {
    var name = getTrimmedValbyClass(tmpl,'name');
    var startDate = tmpl.$('.startDatePicker').data("DateTimePicker").date().toDate();
    var endDate = tmpl.$('.endDatePicker').data("DateTimePicker").date().toDate();
    if ((name) && (startDate) && (endDate)) {
      var gradingPeriod = {
        name:name,
        startDate:startDate,
        endDate:endDate        
      }
      if (('_id' in tmpl.data) && GradingPeriods.findOne(tmpl.data._id)) {
        gradingPeriod._id = tmpl.data._id;
        Meteor.call('updateGradingPeriod',gradingPeriod);
      } else {
        Meteor.call('insertGradingPeriod',gradingPeriod);
      }
    }
    return false;
  },
'click button[type="delete"]': function(event,tmpl) {
  if (('_id' in tmpl.data) && GradingPeriods.findOne(tmpl.data._id))
    Meteor.call('deleteGradingPeriod',tmpl.data._id);
  return false;
  },
  'dp.change .startDatePicker': function(event,tmpl) {
    //link the pickers to ensure startDate < endDate
    //reset session variable based on change
    var date = (event.date) ? event.date.toDate() : false;
    tmpl.$('.endDatePicker').data("DateTimePicker").minDate(date);
  },
  'dp.change .endDatePicker': function(event,tmpl) {
     //link the pickers to ensure startDate < endDate
    //reset session variable based on change
    var date = (event.date) ? event.date.toDate() : false; 
    var wP = Session.get('workPeriod');
    tmpl.$('.startDatePicker').data("DateTimePicker").maxDate(date);
  }
})

Template.editGradingPeriod.helpers({
  new: function() {
    if (('_id' in this) && GradingPeriods.findOne(this._id))
      return '';
    return 'New ';
  },
  SaveSubmit: function() {
    if (('_id' in this) && GradingPeriods.findOne(this._id))
      return 'Save';
    return 'Submit';    
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
