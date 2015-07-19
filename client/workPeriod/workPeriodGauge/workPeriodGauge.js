  /******************************/
 /**** WORK PERIOD GAUGE *******/
/******************************/

Template.workPeriodGauge.onRendered(function() {
  var workPeriodGauge = this.find('.workPeriodGauge');
  //must pass in valid startDate, endDate, unitStartDate, unitEndDate or errors will result
  //set unitEndDate to notSoLongAgo() (new Date(0) + 1 week) and the others to longLongAgo() (new Date(0)) which will be treated as null dates
  var wP = this.data.workPeriod;
  var r = this.data.radius || 20;
  var wedgeColor = Meteor.getStatusColor(wP);

  var gauge = Raphael(workPeriodGauge, 2*r, r); // width of gauge assumed to be r/3
  var path = "M " + r/6 + " " + r; // width/2 from left edge
  path += "A " + 5*r/6 + " " + 5*r/6 + " 0 1 1 " + 11*r/6 + " " +  r; //180 degree arc
  var semicircle = gauge.path(path).attr({stroke: "#afafaf","stroke-width": r/3});

  var today = moment().toDate();
  var unitDuration = wP.unitEndDate.getTime() - wP.unitStartDate.getTime();
  var daysFromStart = today.getTime() - wP.unitStartDate.getTime();
  path = "M " + 17*r/20 + " " +  17*r/20; // just above center
  path += "L " + r/3 + " " +  r; // point
  path += "L " + 17*r/20 + " " +  23*r/20; // just below center
  path += "A " + 3*r/20 + " " + 3*r/20 + " 0 0 0 " + 17*r/20 + " " +  17*r/20 + "Z"; //circular arc to start
  var pointer = gauge.path(path).attr({fill: "#000"});
  pointer.transform( "R" + 180*daysFromStart/unitDuration + ","+r+","+r); //rotate to place
  if ((today < wP.unitStartDate) || (wP.unitEndDate < today)) //necessary?
    pointer.hide();

  var activityDuration = wP.endDate.getTime() - wP.startDate.getTime();
  activityDuration = Math.max(activityDuration,12*3600*1000); //minimum 12 hours to keep it visible
  var theta = Math.PI*activityDuration/unitDuration;
  var activityDaysFromStart = wP.startDate.getTime() - wP.unitStartDate.getTime();
  path = "M " + r/6 + " " + r; // width/2 from left edge
  path += "A " + 5*r/6 + " " + 5*r/6 + " 0 0 1 " + (r - 5*r/6*Math.cos(theta)) + " " +  (r - 5*r/6*Math.sin(theta)); //arc of angle theta
  var wedge = gauge.path(path).attr({stroke: wedgeColor,"stroke-width": r/3});
  wedge.transform("R" + 180*activityDaysFromStart/unitDuration + ", " + r + ", " + r); //rotate to place
  if ((wP.endDate < wP.unitStartDate) || (wP.unitEndDate < wP.startDate)) {
    wedge.hide();
  } else {
    wedge.show();
  }

  this.autorun(function(c) {
    var data = Template.currentData();
    var longLongAgo = new Date(0);
    var wP = data.workPeriod;
    wP.unitStartDate = wP.unitStartDate || longLongAgo;
    wP.unitEndDate = wP.unitEndDate || moment(longLongAgo).add(1,'weeks').toDate();
    wP.startDate = wP.startDate || longLongAgo;
    wP.endDate = wP.endDate || longLongAgo;
    var wedgeColor = Meteor.getStatusColor(wP);

    var r = data.radius || 20;

    gauge.setSize(2*r,r); //resize canvas

    var path = "M " + r/6 + " " + r; // resize semicircle
    path += "A " + 5*r/6 + " " + 5*r/6 + " 0 1 1 " + 11*r/6 + " " +  r; 
    semicircle.animate({path: path, "stroke-width": r/3},500);

    var today = moment().toDate(); //move and show/hide today pointer
    var unitDuration = wP.unitEndDate.getTime() - wP.unitStartDate.getTime();
    var daysFromStart = today.getTime() - wP.unitStartDate.getTime();
    pointer.animate( {transform: "R" + 180*daysFromStart/unitDuration + ","+r+","+r},500); //rotate to place
    if ((today < wP.unitStartDate) || (wP.unitEndDate < today)) {
      pointer.hide();
    } else {
      pointer.show();
    }

    //move and resize workPeriod wedge
    var activityDuration = wP.endDate.getTime() - wP.startDate.getTime();
    activityDuration = Math.max(activityDuration,12*3600*1000); //minimum 12 hours to keep it visible
    var theta = Math.PI*activityDuration/unitDuration;
    var activityDaysFromStart = wP.startDate.getTime() - wP.unitStartDate.getTime();
    path = "M " + r/6 + " " + r; // width/2 from left edge
    path += "A " + 5*r/6 + " " + 5*r/6 + " 0 0 1 " + (r - 5*r/6*Math.cos(theta)) + " " +  (r - 5*r/6*Math.sin(theta)); //arc of angle theta
    wedge.animate({path:path,stroke:wedgeColor},500);
    wedge.animate({transform: "R" + 180*activityDaysFromStart/unitDuration + ", " + r + ", " + r},500); //rotate to place
    if ((wP.endDate < wP.unitStartDate) || (wP.unitEndDate < wP.startDate) || (wP.endDate.getTime() - wP.startDate.getTime() < 1000)) {
      wedge.hide();
    } else {
      wedge.show();
    }
  })

})

