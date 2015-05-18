Template.studentHeader.helpers({
  title: function() {
      return Site.findOne().title;
  }
});