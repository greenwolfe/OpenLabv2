Meteor.publish('sections',function() {
  return Sections.find();
});
Meteor.publish('userList',function() {
  if (this.userId) 
    return Meteor.users.find({},{fields : {username : 1, roles: 1, profile: 1}});
  this.ready(); //returns blank collection
});
Meteor.publish('emails',function() {
  if (this.userId && Roles.userIsInRole(this.userId,'teacher')) 
    return Meteor.users.find({},{fields: {emails: 1}});
  this.ready();
})
Meteor.publish('childrenOrAdvisees',function() {
  if (!this.userId) this.ready();
  if (Roles.userIsInRole(this.userId,'teacher')) {
    return Meteor.users.find({},{fields: {childrenOrAdvisees: 1}});
  } else if (Roles.userIsInRole(this.userId,'parentOrAdvisor')) {
     return Meteor.users.find({_id:this.userId},{fields: {childrenOrAdvisees: 1}});   
  }
  this.ready();
})
Meteor.publish('memberships',function() {
  if (this.userId) {
    return Memberships.find();
  } else {
    this.ready(); //returns blank collection
  }
})
Meteor.publish('groups',function() {
  if (this.userId) {
    return Groups.find();
  } else {
    return this.ready();
  }
})