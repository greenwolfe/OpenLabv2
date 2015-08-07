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
    return 70;
  },
  percentCompleted: function() { //percentCompleted 
    return 30;
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