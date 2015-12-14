Memberships = new Meteor.Collection('Memberships');

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
    membership.status='current'; // current, former, final

    var Collection = Mongo.Collection.get(membership.collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found', "Cannot add member, not a valid collection, " + membership.collectionName + '.');
    var item = Collection.findOne(membership.itemID);
    if (!item)
      throw new Meteor.Error('item-not-found', "Cannot add member, could not find item " + membership.itemID +  " in collection" + membership.collectionName + '.');
    if (today > item.openUntil)
      throw new Meteor.Error('closedGroup',"You are trying to join a closed group.");
    var member = Meteor.users.findOne(membership.memberID);
    if (!member)
      throw new Meteor.Error('user-not-found', "Cannot add member.  User not found.");

    //only allow invitation if do not already have a current membership
    Memberships.find({memberID:membership.memberID,collectionName:membership.collectionName}).forEach(function(mship){
      if ((mship.startDate < today) && (today < mship.endDate)) 
        throw new Meteor.Error('hasCurrentMembership','Cannot request to join a new group until you leave your old group.  groupID = ' + mship.itemID + ' collectionName = ' + mship.collectionName + ' membershipID = ' + mship._id);
    });

    return Memberships.insert(membership);
  },
  removeMember: function(membershipID,futureStatus) {
    check(membershipID,Match.idString);
    check(futureStatus,Match.Optional(Match.OneOf('former','final')));
    futureStatus = futureStatus || 'former';
    var membership = Memberships.findOne(membershipID);
    if (!membership)
      throw new Meteor.Error('membershipNotFound','Cannot remove member.  Membership not found.');
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent','Only a student (or a teacher on behalf of a student) can remove a student from a group.');
    if (Roles.userIsInRole(cU,'student')) {
      if (cU != membership.memberID)
        throw new Meteor.Error('canOnlyRemoveSelf','A student can only remove themselves from a group, not another student.');
    }

    var Collection = Mongo.Collection.get(membership.collectionName);
    if (!Collection)
      throw new Meteor.Error('collection-not-found', "Cannot remove member, not a valid collection, " + membership.collectionName + '.');
    var item = Collection.findOne(membership.itemID);
    if (!item)
      throw new Meteor.Error('item-not-found', "Cannot remove member, could not find item " + membership.itemID +  " in collection" + membership.collectionName + '.');
    var currentMemberIDs = _.pluck(Memberships.find({
        collectionName:membership.collectionName,
        itemID: membership.itemID,
        status: 'current'
      },
      {fields:{memberID:1}}).fetch(),'memberID');
    if (!_.contains(currentMemberIDs,membership.memberID))
      throw new Meteor.Error('notAMember','You cannot vote to leave the group unless you are a current member');
    if (currentMemberIDs.length == 1) //this is the last member to leave
      Collection.update(membership.itemID,{$set:{status:'disbanded'}});

    if (!(this.isSimulation) && (futureStatus == 'final')) { 
      if (currentMemberIDs.length > 1) { //this is not the last member to leave
        Meteor.setTimeout(function() { //check back in a couple days 
          var item = Collection.findOne(membership.itemID);
          if (item.status != 'disbanded') //change status to former instead of final
            return Memberships.update(membershipID,{$set: {status: 'former'}});
        },2*24*3600*1000) //two days in milliseconds
      }
    }

    //Indicate when the member left this group, and keep record rather than deleting it.
    var aLittleWhileAgo = moment().subtract(1,'minutes').toDate();  //converted to javascript date object after subtracting 1 minute
    return Memberships.update(membershipID,{$set: {
      endDate: aLittleWhileAgo,
      status: futureStatus
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
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent','Only a student (or a teacher on behalf of a student) can change membership dates.');
    if (Roles.userIsInRole(cU,'student')) {
      if (cU != membership.memberID)
        throw new Meteor.Error('canOnlyChangeOwnDates','A student can change their own membership dates, not those of another student.');
    }

    if (Match.test(endDate,Date))
      Memberships.update(membershipID,{$set: {endDate:endDate}});
    if (Match.test(startDate,Date))
      Memberships.update(membershipID,{$set: {startDate:startDate}});
  }
});