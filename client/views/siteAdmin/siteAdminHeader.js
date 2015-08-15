Template.siteAdminHeader.helpers({
  siteTitle: function() {
    var site = Site.findOne();
    if (site) {
      document.title = site.title;
      return site.title;
    }
  }
});

