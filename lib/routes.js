FlowRouter.subscriptions = function() {
  //REASONING:  all of these collections should have few items, probably < 100
  //better to load them once and not have to worry at template level
  //so long as it doesn't appreciably slow down the initial load
  this.register('site',Meteor.subscribe('site'));
  this.register('gradingPeriods',Meteor.subscribe('gradingPeriods'));
  this.register('sections',Meteor.subscribe('sections'));
  this.register('userList',Meteor.subscribe('userList'));  //restricted at publication level, nothing returned unless user is logged in

  this.register('units',Meteor.subscribe('units',true)); //true => include hidden units
  this.register('activities',Meteor.subscribe('activities')); 
  this.register('workPeriods',Meteor.subscribe('workPeriods',null,null)); //sectionID = unitID = null means subscribe to all
  this.register('tags',Meteor.subscribe('tags'));   //Sthis is just the tag list, actual tags are set in
                                                   //activities or activitystatuses

  this.register('categories',Meteor.subscribe('categories',true)); //true => include hidden units
  this.register('standards',Meteor.subscribe('standards'));
  this.register('memberships',Meteor.subscribe('memberships'));  //could be lots, but this pulls in all of them anyway (?)
  this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees')); //only need those for current parent
  this.register('groups',Meteor.subscribe('groups')); //could be lots of them, but this subscribes to all of them anysay (?)
};
//load userList, sections, groups, memberships, childrenOrAdvisees with
//custom accounts UI on as needed basis, with extra data for teacher loaded in background?

FlowRouter.route('/', {
  //openlabSession.initializePage()  ... how to do with flow router?  
  //call from triggersEnter ... !
  subscriptions: function (params, queryParams) {
    //decide to load for whole app, this page or specific template
    //only activities list needs: units, activities ... but then available for rest so long as all needed are loaded in background
    //memberships only for currently impersonatedOrUser (others loaded in background for teacher?)
    //same with childrenOrAdvisees and groups 

    //units, activities, sections, userList ... are pretty much the same for all users
    //keep them here, but load hidden stuff in template for teacher
    //memberships, childrenOrAdvisees, groups ... depend on the user
    //REASONING:  not needed on all pages or might have large number of items, so want to subscribe to subset based on the page
    //but currently subscribing to all memberships and all groups
    
    //testing ... load these for whole site?
    //this.register('memberships',Meteor.subscribe('memberships'));  //could be lots, but this pulls in all of them anyway (?)
    //this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees')); //only need those for current parent
    //this.register('groups',Meteor.subscribe('groups')); //could be lots of them, but this subscribes to all of them anysay (?)
  },
  action: function (params, queryParams) {
    BlazeLayout.render('layout', { header: 'openlabHeader', main: 'openlab' });
  },
  triggersExit: [function(context, redirect) {
    if (Meteor.isClient)
      openlabSession.set('editingMainPage',false);
  }],
  name: 'openlab'
});

FlowRouter.route('/activity/:_id', {  
  subscriptions: function (params, queryParams) {
    if ('id' in queryParams) {
      var studentOrSectionID = [queryParams.id];
    } else {
      var studentOrSectionID = [];
    }
    var activityID = params._id || null;
    //moving this to template level subscription
    //this.register('initialActivityPagePub',Meteor.subscribe('activityPagePubs',studentOrSectionID,activityID));
    //testing ... load these for whole site?
    //this.register('memberships',Meteor.subscribe('memberships')); //could be lots, but this pulls in all of them anyway (?)
    //this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees')); //only need those for current parent
    //this.register('groups',Meteor.subscribe('groups'));  //could be lots of them, but this subscribes to all of them anysay (?)
  },
  action: function (params, queryParams) {
    BlazeLayout.render('layout', { header: 'activityHeader', main: 'activityPage' });
  },
  name: 'activityPage'
});


FlowRouter.route('/standard/:_id', {  
  //activityPageSession.initializePage() ... how to do with flow router?
  subscriptions: function (params, queryParams) {
    //decide to load for whole app, this page or specific template
    //units needed at all?
    //only one activity needed
    //files, walls, columns and blocks only need for the one activity and for the user and his or her current group and section
    //load above line with activityPage template itself?
    //groups, memberships and sections only needed for the specific user
    //teacher may want to load content for other students in the background
    //load childrenoradvisees for user when parent logs in or is impersonated only?
    //only leaves loading the activity from here ... hmmm.
    this.register('memberships',Meteor.subscribe('memberships'));  //could be lots, but this pulls in all of them anyway (?)
    this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));  //only need those for current parent
    //this.register('groups',Meteor.subscribe('groups'));
  },
  action: function (params, queryParams) {
    BlazeLayout.render('layout', { header: 'standardHeader', main: 'standardPage' });
  },
  triggersExit: [function(context, redirect) {
    if (Meteor.isClient)
      openlabSession.set('editingMainPage',false);
  }],
  name: 'standardPage'
});

FlowRouter.route('/assessment/:_id', {  
  //activityPageSession.initializePage() ... how to do with flow router?
  subscriptions: function (params, queryParams) {
    //this.register('categories',Meteor.subscribe('categories',false)); 
    //this.register('units',Meteor.subscribe('units',false)); 
    //this.register('activities',Meteor.subscribe('activities')); 
    this.register('memberships',Meteor.subscribe('memberships'));
    //this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));
    //this.register('groups',Meteor.subscribe('groups'));
  },
  action: function (params, queryParams) {
    BlazeLayout.render('layout', { header: 'assessmentHeader', main: 'assessmentPage' });
  },
  triggersExit: [function(context, redirect) {
    if (Meteor.isClient)
      openlabSession.set('editingMainPage',false);
  }],
  name: 'assessmentPage'
});


FlowRouter.route('/validateAccounts', {  
  //activityPageSession.initializePage() ... how to do with flow router?
  subscriptions: function (params, queryParams) {
    //decide to load for whole app, this page or specific template
    //all loaded with headers and custom accounts ui above?
    this.register('memberships',Meteor.subscribe('memberships'));
    this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));
    this.register('emails',Meteor.subscribe('emails'));
  },
  triggersEnter: [function(context, redirect) {
    var user = Meteor.user();
    if(!Roles.userIsInRole(user, ['teacher']))
      redirect('/');
  }],
  action: function (params, queryParams) {
    BlazeLayout.render('layout', { header: 'activityHeader', main: 'validateAccounts' });
  },
  name: 'validateAccounts'
});

FlowRouter.route('/siteAdmin', {  
  subscriptions: function (params, queryParams) {

  },
  triggersEnter: [function(context, redirect) {
    var user = Meteor.user();
    if(!Roles.userIsInRole(user, ['teacher']))
      redirect('/');
  }],
  action: function (params, queryParams) {
    BlazeLayout.render('layout', { header: 'siteAdminHeader', main: 'siteAdmin' });
  },
  name: 'siteAdmin'
});