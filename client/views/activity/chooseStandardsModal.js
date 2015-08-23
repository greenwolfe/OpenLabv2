Template.chooseStandardsModal.onCreated(function() {
  var instance = this;
  var activeCategory = openlabSession.get('activeCategory');
  instance.activeCategory = new ReactiveVar(activeCategory);
  instance.selectedStandards = new ReactiveVar([]);
});

Template.chooseStandardsModal.helpers({
  categories: function() {
    return Categories.find({visible:true},{sort: {order: 1}});
  },
  active: function() {
    var tmpl = Template.instance();
    var activeCategory = tmpl.activeCategory.get();
    return (this._id == activeCategory) ? 'active' : '';
  },
  activeCategory: function() {
    var tmpl = Template.instance();
    return Categories.findOne(tmpl.activeCategory.get());
  },
  activeCategoryStandards: function() {
    var tmpl = Template.instance();
    return Standards.find({categoryID:tmpl.activeCategory.get()});
  },
  selectedStandards: function() {
    var tmpl = Template.instance();
    var selectedStandardIDs = tmpl.selectedStandards.get();
    var selectedStandards = Standards.find({_id:{$in:selectedStandardIDs}}).fetch();
    selectedStandards.sort(function(sa,sb) {
      return selectedStandardIDs.indexOf(sa._id) - selectedStandardIDs.indexOf(sb._id);
    });
    return selectedStandards;
  },
  activeStandard: function() {
    var tmpl = Template.instance();
    var selectedStandardIDs = tmpl.selectedStandards.get();
    return (_.contains(selectedStandardIDs,this._id)) ? 'active' : '';
  }
});

Template.chooseStandardsModal.events({
  'shown.bs.modal #chooseStandardsModal': function(event,tmpl) {
    var activeCategory = openlabSession.get('activeCategory');
    tmpl.activeCategory.set(activeCategory);
    var assessmentID = activityPageSession.get('assessmentID');
    var assessment = Blocks.findOne(assessmentID);
    if (assessment && ('standardIDs' in assessment)) {
      tmpl.selectedStandards.set(assessment.standardIDs);
    } else {
      tmpl.selectedStandards.set([]);
    }
  },
  'click li.categoryTitle a.displayTitle': function(event,tmpl) {
    tmpl.activeCategory.set(this._id);
  },
  'click li.standardForChoosing': function(event,tmpl) {
    var selectedStandardIDs = tmpl.selectedStandards.get();
    if (_.contains(selectedStandardIDs,this._id)) {
      tmpl.selectedStandards.set(_.without(selectedStandardIDs,this._id));
    } else {
      selectedStandardIDs.push(this._id)
      tmpl.selectedStandards.set(selectedStandardIDs);
    }
  },
  'click #chooseStandardsCancel': function(event,tmpl) {
    $('#chooseStandardsModal').modal('hide');
  },
  'click #chooseStandardsSave': function(event,tmpl) {
    var assessmentID = activityPageSession.get('assessmentID');
    var selectedStandardIDs = tmpl.selectedStandards.get();
    Meteor.call('updateBlock',{_id:assessmentID,standardIDs:selectedStandardIDs},alertOnError);    
    $('#chooseStandardsModal').modal('hide');
  }
})

