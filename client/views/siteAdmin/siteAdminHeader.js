Template.siteAdminHeader.helpers({
  siteTitle: function() {
    return Site.findOne().title;
  }
});

