FlowRouter.subscriptions = function() {
  this.register('site',Meteor.subscribe('site'));
  //sections here, too? (or with accounts ui?)
  //userList here, too?
};
//load userList, sections, groups, memberships, childrenOrAdvisees with
//custom accounts UI on as needed basis, with extra data for teacher loaded in background?

FlowRouter.route('/', {
  //openlabSession.initializePage()  ... how to do with flow router?  
  subscriptions: function (params, queryParams) {
    //decide to load for whole app, this page or specific template
    //only activities list needs: units, activities ... but then available for rest so long as all needed are loaded in background
    //memberships only for currently impersonatedOrUser (others loaded in background for teacher?)
    //same with childrenOrAdvisees and groups 

    //units, activities, sections, userList ... are pretty much the same for all users
    //keep them here, but load hidden stuff in template for teacher
    //memberships, childrenOrAdvisees, groups ... depend on the user
    this.register('categories',Meteor.subscribe('categories',false)); 
    this.register('units',Meteor.subscribe('units',false)); 
    this.register('activities',Meteor.subscribe('activities')); 
    this.register('sections',Meteor.subscribe('sections'));
    this.register('userList',Meteor.subscribe('userList'));
    this.register('memberships',Meteor.subscribe('memberships'));
    this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));
    this.register('groups',Meteor.subscribe('groups'));
  },
  action: function (params, queryParams) {
    FlowLayout.render('layout', { header: 'openlabHeader', main: 'openlab' });
  },
  name: 'openlab'
});

FlowRouter.route('/activity/:_id', {  
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
    this.register('categories',Meteor.subscribe('categories',false)); 
    this.register('units',Meteor.subscribe('units',false)); 
    this.register('activities',Meteor.subscribe('activities')); 
    this.register('sections',Meteor.subscribe('sections'));
    this.register('userList',Meteor.subscribe('userList'));
    this.register('memberships',Meteor.subscribe('memberships'));
    this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));
    this.register('groups',Meteor.subscribe('groups'));
  },
  action: function (params, queryParams) {
    FlowLayout.render('layout', { header: 'activityHeader', main: 'activityPage' });
  },
  name: 'activityPage'
});

/*
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
    this.register('categories',Meteor.subscribe('categories',false)); 
    this.register('units',Meteor.subscribe('units',false)); 
    this.register('activities',Meteor.subscribe('activities')); 
    this.register('sections',Meteor.subscribe('sections'));
    this.register('userList',Meteor.subscribe('userList'));
    this.register('memberships',Meteor.subscribe('memberships'));
    this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));
    //this.register('groups',Meteor.subscribe('groups'));
  },
  action: function (params, queryParams) {
    FlowLayout.render('layout', { header: 'standardHeader', main: 'standardPage' });
  },
  name: 'standardPage'
});
*/

FlowRouter.route('/validateAccounts', {  
  //activityPageSession.initializePage() ... how to do with flow router?
  subscriptions: function (params, queryParams) {
    //decide to load for whole app, this page or specific template
    //all loaded with headers and custom accounts ui above?
    this.register('sections',Meteor.subscribe('sections'));
    this.register('userList',Meteor.subscribe('userList'));
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
    FlowLayout.render('layout', { header: 'activityHeader', main: 'validateAccounts' });
  },
  name: 'validateAccounts'
});

var parentPath;
FlowRouter.triggers.exit([function(context,redirect) {
  parentPath = context.path;
}])

//pass fileID as a parameter, then look up file
//object to find path? Might need file ID to
//do validation and permission checks
var uploadRoutes = FlowRouter.group({
  prefix: '/upload',
  triggersEnter: [function(context, redirect) {
    window.open(Meteor.absoluteUrl(context.path),"","",true);
    redirect(parentPath);
  }]
});

uploadRoutes.route('/(.*)',{})
