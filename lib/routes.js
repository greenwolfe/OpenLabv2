FlowRouter.route('/', {
  //openlabSession.initializePage()  ... how to do with flow router?  
  subscriptions: function (params, queryParams) {
    //decide to load for whole app, this page or specific template
    this.register('site',Meteor.subscribe('site'));
    this.register('units',Meteor.subscribe('units',false)); 
    this.register('activities',Meteor.subscribe('activities')); 
    this.register('sections',Meteor.subscribe('sections'));
    this.register('userList',Meteor.subscribe('userList'));
    this.register('memberships',Meteor.subscribe('memberships'));
    this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));
    this.register('groups',Meteor.subscribe('groups'));
    //activityStatuses is first for template subscription, as it needs impersonatedOrUserId
    this.register('activityStatuses',Meteor.subscribe('activityStatuses')); 
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
    this.register('site',Meteor.subscribe('site'));
    this.register('units',Meteor.subscribe('units',false)); 
    this.register('activities',Meteor.subscribe('activities')); 
    this.register('files',Meteor.subscribe('files')); 
    this.register('walls',Meteor.subscribe('walls')); 
    this.register('columns',Meteor.subscribe('columns')); 
    this.register('blocks',Meteor.subscribe('blocks')); 
    this.register('sections',Meteor.subscribe('sections'));
    this.register('userList',Meteor.subscribe('userList'));
    this.register('memberships',Meteor.subscribe('memberships'));
    this.register('childrenOrAdvisees',Meteor.subscribe('childrenOrAdvisees'));
    this.register('groups',Meteor.subscribe('groups'));
    //activityStatuses is first for template subscription, as it needs impersonatedOrUserId
    this.register('activityStatuses',Meteor.subscribe('activityStatuses')); 
  },
  action: function (params, queryParams) {
    FlowLayout.render('layout', { header: 'activityHeader', main: 'activityPage' });
  },
  name: 'activityPage'
});

FlowRouter.route('/validateAccounts', {  
  //activityPageSession.initializePage() ... how to do with flow router?
  subscriptions: function (params, queryParams) {
    //decide to load for whole app, this page or specific template
    this.register('site',Meteor.subscribe('site'));
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
