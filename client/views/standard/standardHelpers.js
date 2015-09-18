  Meteor.LoMcolorcode = function(level,scale) {
    var colorcodes = ['LoMlow','LoMmedium','LoMhigh']
    var maxVal;
    var index;
    if (_.isArray(scale)) {
      level = scale.indexOf(level);
      maxVal = scale.length;
      index = Math.floor(level*3/maxVal);
      index = Math.min(index,2);
    }
    if (_.isFinite(scale)) {
      maxVal = scale;
      var percent = level*100/maxVal;
      index = 0;
      if (percent >= 70) index = 1;
      if (percent > 88) index = 2;
      //index = Math.floor(level*3/maxVal);
      //index = Math.min(index,2);
    }
    return colorcodes[index];
  }