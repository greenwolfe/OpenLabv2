Memberships = new Meteor.Collection('Memberships');

//for groups, switch from invite to request to join, welcome new member, leave group
//cannot request to join unless first leave old group
//fields:
//   welcomingCommittee ... all current members at the time new member requests to join
//   status ... pending, current, former, final 
//            ... where final means was a member at the time the group disbanded
//            ... and former means left the group while it was still active
//            ... and pending means either invited or requested to join, so it is pending either acceptance of an invitation or welcoming by all current members
//membership is destroyed if not welcomed, and have to apply again
//if accepted, withdraw other applications

//if leave ... set welcoming fields to [], status to 'former'
//if last to leave ... set status=final for yourself and anyone who recently left
//                 ... define recently?  since last content posted and/or last few days (?)
//if anyone left longer ago than "recently" pop up a box.  Are ____, ____, and ____ all the final members of the group?  <yes>
//                                                         <include ____>
//                                                         <include ____>          

//or set up separate leave/disband systems
//if leave, then lose access after that date ... unwelcomed, endDate set
//if disband (select "vote to disband" button) welcoming fields left untouched
//   endDate not set until last person votes to disband

//in group menu:  current group:  names ... leave button
// list of members who have requested to join with "welcome name to the groupb" yes/now
//if no current group:  create new group button ... list of available groups with request to join button

//on activity page:  if group wall is blank, menu to select past group
//                   if group wall has contents, button to add wall
Meteor.methods({
  //do any of these need checks that currentUser is teacher
  //or membership.member is or is not the current user?
  addMember: function(membership) {
    check(membership,{
      memberID:  Match.idString,
      itemID: Match.idString,
      collectionName: Match.OneOf('Groups','Sections'),
      startDate: Match.Optional(Date),
      endDate: Match.Optional(Date)
      /* new stuff here */
    });
    var longLongAgo = new Date(0);
    var aLittleWhileAgo = moment().subtract(1,'minutes').toDate();  //converted to javascript date object after subtracting 1 minute
    var today = new Date();
    var wayWayInTheFuture = new Date(8630000000000000); //new Date(8640000000000000) =  Sat Sep 13 275760 01:00:00 GMT+0100 (BST) and is the maximum possible javascript Date
    membership.invitedUntil = longLongAgo; //expired invitation = no invitation
    membership.startDate = membership.startDate || aLittleWhileAgo;
    membership.endDate = membership.endDate || wayWayInTheFuture; 
    membership.welcomingCommittee = [];
    membership.status='current'; //pending, current, former, final

    var Collection = Mongo.Collection.get(membership.collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found', "Cannot add member, not a valid collection, " + membership.collectionName + '.');
    var item = Collection.findOne(membership.itemID);
    if (!item)
      throw new Meteor.Error('item-not-found', "Cannot add member, could not find item " + membership.itemID +  " in collection" + membership.collectionName + '.');
    var member = Meteor.users.findOne(membership.memberID);
    if (!member)
      throw new Meteor.Error('user-not-found', "Cannot add member.  User not found.");

    //deactivate any past memberships before adding new membership
    //throw error instead ... cannot join unless have left past groups/sections
    Memberships.find({memberID:membership.memberID,collectionName:membership.collectionName}).forEach(function(mship){
      if (today < mship.endDate)
        Memberships.update(mship._id,{$set:{endDate:aLittleWhileAgo}})
    })

    return Memberships.insert(membership);
  },
  requestToJoin: function(membership) {
    check(membership,{
      memberID: Match.idString,
      itemID: Match.idString, //probably groupID
      collectionName: Match.Optional(Match.OneOf('Groups','Sections')) //probably just used for groups, process too cumbersome for sections
    });
    var collectionName = collectionName || 'Groups';
    var longLongAgo = new Date(0);
    var wayWayInTheFuture = new Date(8630000000000000); //new Date(8640000000000000) =  Sat Sep 13 275760 01:00:00 GMT+0100 (BST) and is the maximum possible javascript Date
    membership.invitedUntil = longLongAgo;
    membership.startDate = wayWayInTheFuture; 
    membership.endDate = longLongAgo;

    var Collection = Mongo.Collection.get(membership.collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found', "Cannot add member, not a valid collection " + membership.collectionName + '.');
    var item = Collection.findOne(membership.itemID);
    if (!item)
      throw new Meteor.Error('item-not-found', "Cannot add member, could not find item " + membership.itemID +  " in collection" + membership.collectionName + '.');
    var member = Meteor.users.findOne(membership.memberID);
    if (!member)
      throw new Meteor.Error('user-not-found', "Cannot add member.  User not found.");
    //only allow invitation if not a member of another group?

    membership.welcomingCommittee = _.pluck(
      Memberships.find({
        collectionName: collectionName,
        itemID:itemID,
        startDate: {$lt: today},   
        endDate: {$gt: today}   
      },{fields:{memberID:1}}).fetch(),'memberID');
    membership.status = 'pending';

    return Memberships.insert(membership);
  },
  welcomeMember: function(membershipID,memberID) {
    check(membershipID,Match.idString);
    check(memberID,Match.idString);

    var membership = Memberships.findOne(membershipID);
    if (!membership)
      throw new Meteor.Error('membershipNotFound','Cannot accept invite.  Invitation not found.');
    if (!_.contains(membership.welcomingCommittee,memberID)) 
      return membershipID;
    Memberships.update(membershipID,{$pull:{welcomingCommittee:memberID}});

    if (membership.welcomingCommittee.length > 1)
      return membershipID;
    //everyone has welcomed new member
    //withdraw any other pending memberships
    Memberships.find({memberID:membership.memberID,collectionName:membership.collectionName,status:'pending'}).forEach(function(mship) {
      if (mship._id != membershipID)
        Memberships.remove(membershipID);
    });
    //check to see if there are any current memberships???

    //make it current
    var aLittleWhileAgo = moment().subtract(1,'minutes').toDate();  //converted to javascript date object after subtracting 1 minute
    var wayWayInTheFuture = new Date(8630000000000000);
    return Memberships.update(membershipID,{$set: {
      status: 'current',
      startDate: aLittleWhileAgo,
      endDate: wayWayInTheFuture
    }});
  },
  inviteMember: function(membership) {
    check(membership,{
      memberID:  Match.idString,
      itemID: Match.idString,
      collectionName: Match.OneOf('Groups','Sections'),
      invitedUntil: Match.Optional(Date)
      /* new stuff here */
    });
    var longLongAgo = new Date(0);
    var nextWeek = moment().add(7,'days').toDate(); //converted to javascript date object after adding one week
    var wayWayInTheFuture = new Date(8630000000000000); //new Date(8640000000000000) =  Sat Sep 13 275760 01:00:00 GMT+0100 (BST) and is the maximum possible javascript Date
    membership.invitedUntil = membership.invitedUntil || nextWeek; //default is one week from now
    membership.startDate = wayWayInTheFuture; 
    membership.endDate = longLongAgo; 
    membership.welcomingCommittee = [];
    membership.status='current';

    var Collection = Mongo.Collection.get(membership.collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found', "Cannot add member, not a valid collection " + membership.collectionName + '.');
    var item = Collection.findOne(membership.itemID);
    if (!item)
      throw new Meteor.Error('item-not-found', "Cannot add member, could not find item " + membership.itemID +  " in collection" + membership.collectionName + '.');
    var member = Meteor.users.findOne(membership.memberID);
    if (!member)
      throw new Meteor.Error('user-not-found', "Cannot add member.  User not found.");
    //only allow invitation if not a member of another group?

    return Memberships.insert(membership);
  },
  acceptInvite: function(membershipID) {
    check(membershipID,Match.idString);
    var membership = Memberships.findOne(membershipID);
    if (!membership)
      throw new Meteor.Error('membershipNotFound','Cannot accept invite.  Invitation not found.');
    if (today > membership.invitedUntil)
      throw new Meteor.Error('invitationExpired','This invitation expeired on ' + moment(membership.invitedUntil).format("dddd, MMMM Do YYYY") + '. Have a current member issue a new invitation.')

    var longLongAgo = new Date(0);
    var aLittleWhileAgo = moment().subtract(1,'minutes').toDate();  //converted to javascript date object after subtracting 1 minute
    var today = new Date();
    var wayWayInTheFuture = new Date(8630000000000000);
    //deactivate any past memberships before adding new membership
    //throw error instead, cannot accept invite unless student has left all past groups
    Memberships.find({memberID:membership.memberID,collectionName:membership.collectionName}).forEach(function(mship) {
      if (today < mship.endDate)
        Memberships.update(mship._id,{$set:{endDate:today}})
    })

    //expire the invitation
    Memberships.update(membershipID,{$set: {invitedUntil:longLongAgo }}); 
    //make membership current
    if (today < membership.startDate)  { //only need to change date if membership is not already current
      Memberships.update(membershipID,{$set: {startDate:aLittleWhileAgo}}); 
    }
    if  (membership.endDate < today) { //same here
      Memberships.update(membershipID,{$set: {endDate:wayWayInTheFuture }}); 
    }
    if (membership.status != 'current') {
      Memberships.update(membershipID,{$set: {status:'current' }});       
    }
    return membershipID;
  },
  declineInvite: function(membershipID) {
    check(membershipID,Match.idString);
    var membership = Memberships.find(membershipID);
    var today = new Date();
    if (!membership)
      return; //no need to decline if not found in the first place    
    if ((membership.startDate < today) && (today < membership.endDate)) {
      new Meteor.Error('isCurrent','Cannot deline invitation when membership is already current.')
    } else {
      return Memberships.remove(membershipID);
    }
  },
  removeMember: function(membershipID) {
    check(membershipID,Match.idString);
    var membership = Memberships.find(membershipID);
    if (!membership)
      throw new Meteor.Error('membershipNotFound','Cannot remove member.  Membership not found.');

    //Indicate when the member left this group, and keep record rather than deleting it.
    var aLittleWhileAgo = moment().subtract(1,'minutes').toDate();  //converted to javascript date object after subtracting 1 minute
    return Memberships.update(membershipID,{$set: {
      endDate: aLittleWhileAgo,
      status: 'former'
    }})
  },
  changeMembershipDates: function(membershipID,startDate,endDate) {
    check(membershipID,Match.idString);
    check(startDate,Match.Optional(Date));
    check(endDate,Match.Optional(Date));
    //this is dangerous, as it could expire a membership
    //and there is no provision to add a new one
    //or it could activate a membership and then there
    //would be two active memberships
    //perhaps check if membership is current and then allow increasing to
    //rename it to extend membership period or some such?
    var membership = Memberships.findOne(membershipID);
    if (!membership)
      throw new Meteor.Error('membership not found','Cannot remove member.  Membership not found.');
    if (Match.test(endDate,Date))
      Memberships.update(membershipID,{$set: {endDate:endDate}});
    if (Match.test(startDate,Date))
      Memberships.update(membershipID,{$set: {startDate:startDate}});
  }
});