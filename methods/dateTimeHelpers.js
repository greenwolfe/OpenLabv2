dateIsNull = function(date) {
  if (!Match.test(date,Date))
    return true;
  var longLongAgo = new Date(0);
  var longLongAgoPlusTwoWeeks = moment(longLongAgo).add(2,'weeks').toDate();
  return (date < longLongAgoPlusTwoWeeks);
}

longLongAgo = function() { // qualifies as null date
  return new Date(0);
}

notSoLongAgo = function() { // > longLongAgo, but still null
  var longLongAgo = new Date(0);
  return moment(longLongAgo).add(1,'weeks').toDate();  
}