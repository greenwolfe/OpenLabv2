  /*************************/
 /*** ACTIVITIES LIST  ****/
/*************************/

Template.activitiesList.rendered = function() {
  $('#activities').accordion({heightStyle: "content"});
}

Template.activitiesList.helpers({
  units: function() {
    return Units.find({visible:true},{sort: {rank: 1}});
  }
});

  /*************************/
 /** ACTIVITIES SUBLIST  **/
/*************************/

Template.activitiesSublist.rendered = function() {
  if ($( "#activities" ).data('ui-accordion')) //if accordion already applied
    $('#activities').accordion("refresh");
};

Template.activitiesSublist.helpers({
  activities: function() {
    var Acts = Activities.find({unitID: this._id, 
      ownerID: {$in: [null,'']}, //matches if Activities does not have onwerID field, or if it has the field, but it contains the value null or an empty string
      visible: true},
      {sort: {rank: 1}}).fetch(); 
    Acts.forEach(function(A,i) {
      A.irank = i;
    })
    var max = Acts.length - 1;
    var half = Math.floor(max/2);
    Acts.sort(function(A,B) {
      var Ai = (A.irank <= half) ? 2*A.irank : 2*A.irank - max + max%2 - 1;
      var Bi = (B.irank <= half) ? 2*B.irank : 2*B.irank - max + max%2 - 1;      
      return Ai-Bi;
    });
    return Acts;
  },
  reassessments: function() {
    var userToShow = Meteor.userId();
    if (Roles.userIsInRole(userToShow,'teacher')) {
      userToShow = Session.get('TeacherViewAs');
    };
    return Activities.find({unitID: this._id, 
      ownerID: {$in: [userToShow]},
      type: 'assessment',
      visible: true},
      {sort: {rank: 1}});
  }
});