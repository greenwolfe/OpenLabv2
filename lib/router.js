/*Router.configure({
  layoutTemplate: 'layout',
  loadingTemplate: 'loading',
  waitOn: function () { 
    var currentUser = Meteor.user();
    var userToShow = ['_ALL_'];
    if (currentUser) {
      userToShow.push(currentUser._id);
      if (currentUser.hasOwnProperty(profile) && currentUser.profile.hasOwnProperty(sectionID))
        userToShow.push(currentUser.profile.sectionID);
    }
    return [
      Meteor.subscribe('activities',Meteor.userId()), 
      Meteor.subscribe('units',false)
    ];
  }
});*/

Router.route('/', {
  name: 'openlab',
  layoutTemplate: 'layout',
  yieldRegions: {
    'openlabHeader': {to: 'header'}
  },
  subscriptions: function() {
    //returning a subscription handle or an array of subscription handles
    //adds them to the wait list
    //can use onAfterAction to load additional subscriptions behind the scenes?
    var userID = Meteor.impersonatedOrUserId() || '';
    return [
      Meteor.subscribe('activities'), 
      Meteor.subscribe('units',false),
      Meteor.subscribe('site'),
      Meteor.subscribe('sections'), 
      Meteor.subscribe('userList'),
      Meteor.subscribe('memberships'),
      Meteor.subscribe('childrenOrAdvisees'),
      Meteor.subscribe('groups'),
      Meteor.subscribe('activityStatuses',userID)
    ]
  },
  onBeforeAction: function() {
    if (Meteor.isClient) {
      openlabSession.initializePage();
    }
    this.next();
  },
  action: function() {
    if (this.ready()) {
      this.render();
    } else {
      this.render('loading');
    };
  }
})

Router.route('/activity/:_id', {
  name: 'activityPage',
  layoutTemplate: 'layout',
  data: function() { return Activities.findOne(this.params._id); },
  yieldRegions: {
    'activityHeader': {to: 'header'}
  },
  subscriptions: function() {
    //returning a subscription handle or an array of subscription handles
    //adds them to the wait list
    //can use onAfterAction to load additional subscriptions behind the scenes?
    var userID = Meteor.impersonatedOrUserId() || '';
    return [
      Meteor.subscribe('site'),
      Meteor.subscribe('units',false), //for subactivity block
      Meteor.subscribe('activities'),
      Meteor.subscribe('files'), 
      Meteor.subscribe('walls'),
      Meteor.subscribe('columns'),
      Meteor.subscribe('blocks'),
      Meteor.subscribe('sections'), 
      Meteor.subscribe('userList'),
      Meteor.subscribe('memberships'),
      Meteor.subscribe('childrenOrAdvisees'),
      Meteor.subscribe('groups'),
      Meteor.subscribe('activityStatuses',userID)
    ]
  },
  onBeforeAction: function() {
    if (Meteor.isClient) {
      activityPageSession.initializePage();
    }
    this.next();
  },
  action: function() {
    if (this.ready()) {
      this.render();
    } else {
      this.render('loading');
    };
  }
})

Router.route('/validateAccounts', {
  name: 'validateAccounts',
  layoutTemplate: 'layout',
  yieldRegions: {
    'activityHeader': {to: 'header'}
  },
  subscriptions: function() {
    //returning a subscription handle or an array of subscription handles
    //adds them to the wait list
    //can use onAfterAction to load additional subscriptions behind the scenes?
    return  [
      Meteor.subscribe('site'),
      Meteor.subscribe('sections'), 
      Meteor.subscribe('userList'),
      Meteor.subscribe('memberships'),
      Meteor.subscribe('emails'),
      Meteor.subscribe('childrenOrAdvisees')
    ]
  },
  onBeforeAction: function() {
    user = Meteor.user();
    if(!Roles.userIsInRole(user, ['teacher'])) {
      this.redirect('/');
      this.stop();
    }
    this.next();
    return true; //needed?
  },
  action: function() {
    if (this.ready()) {
      this.render();
    } else {
      this.render('loading');
    };
  }
})

/*Router.map(function() {
  this.route('studentView', {
    path: '/',
    yieldTemplates: {
      'studentHeader': {to: 'header'}
    },
    waitOn: function() {
      return Meteor.subscribe('site');
    },
    onRun : function () {
       if (this.ready()) this.render();
    }
  });
});*/

//Router.onBeforeAction('loading');
