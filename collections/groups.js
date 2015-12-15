Groups = new Meteor.Collection('Groups');

Meteor.methods({
  addGroup: function(openUntil) {
    check(openUntil,Match.Optional(Date));
    var wayWayInTheFuture = new Date(8630000000000000);
    openUntil = openUntil || wayWayInTheFuture;
    var longLongAgo = new Date(0);
    return Groups.insert({
      openUntil: openUntil, 
      votesToOpen: [],
      pollClosesAt: longLongAgo,
      status: 'active' //active or disbanded
                       //set to disbanded by membership function if all members have voted to disband
    });
  },
  voteToOpenGroup: function(groupID,memberID) {
    check(groupID,Match.idString);
    check(memberID,Match.idString);
    var group = Groups.findOne(groupID);
    if (!group)
      throw new Meteor.Error('groupNotFound','Cannot vote to open group.  Group not found. ' + groupID);
    if (group.status != 'active') 
      throw new Meteor.Error('groupNotActive','Only active groups can accept new members.');
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent','Only a student (or a teacher on behalf of a student) can vote to open a group to new members');
    if (Roles.userIsInRole(cU,'student')) {
      if (cU != memberID)
        throw new Meteor.Error('notOwnVote','A student can only vote to open a group for themself, not for another student.');
    }
    var currentMemberIDs = Meteor.groupMemberIds('current',groupID);
    if (!_.contains(currentMemberIDs,memberID))
      throw new Meteor.Error('notAMember','You cannot vote to opne the group unless you are a member');
    var today = new Date();
    if (today < group.openUntil)
      throw new Meteor.Error('alreadyOpen','This group is already open. Why are you trying to vote to open it?');

    if (today < group.pollClosesAt) { //poll is open
      if (!_.contains(group.votesToOpen,memberID)) //record vote
        group.votesToOpen.push(memberID);
    } else {//any past poll is closed
      group.pollClosesAt = moment().add(2,'hours').toDate(); //open a new one for a limited time
      group.votesToOpen = [memberID]; //with just a vote for this member
    } 
    //if all members have voted to open, then make group open for a limited time
    if (_.difference(currentMemberIDs,group.votesToOpen).length == 0) {
      group.openUntil = moment().add(2,'hours').toDate();
      group.pollClosesAt = new Date(0); //and close the poll
      group.votesToOpen = [];
    }
    delete group._id

    Groups.update(groupID,{$set: group});
  },
  closeGroup: function(groupID,memberID) {
    check(groupID,Match.idString);
    check(memberID,Match.idString);
    var group = Groups.findOne(groupID);
    if (!group)
      throw new Meteor.Error('groupNotFound','Cannot vote to open group.  Group not found. ' + groupID);
    var cU = Meteor.userId();
    if (!Roles.userIsInRole(cU,['teacher','student']))
      throw new Meteor.Error('notTeacherOrStudent','Only a student (or a teacher on behalf of a student) can vote to open a group to new members');
    if (Roles.userIsInRole(cU,'student')) {
      if (cU != memberID)
        throw new Meteor.Error('notOwnVote','A student can only vote to open a group for themself, not for another student.');
    }
    var currentMemberIDs = Meteor.groupMemberIds('current',groupID);
    if (!_.contains(currentMemberIDs,memberID))
      throw new Meteor.Error('notAMember','You cannot vote to opne the group unless you are a member');
    var today = new Date(); 
    if (!_.contains(group.votesToOpen,memberID)) { //no current vote to open
      if (today > group.openUntil) //and didn't already vote to open 
        throw new Meteor.Error('alreadyClosed','This group is not open.  No need to take action to close it.');
    }

    var longLongAgo = new Date(0);
    Groups.update(groupID,{$set: {
      openUntil:longLongAgo,
      pollClosesAt: longLongAgo, 
      votesToOpen: []
    }});
  }
});