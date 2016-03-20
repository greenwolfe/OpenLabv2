Match.idString = Match.Where(function (id) {
    check(id, String);
    return /^[a-zA-Z0-9]{17}$/.test(id);
/*^         start of string
[a-zA-Z0-9]  a or b or c or ... z or A or B or C ... Z or 0 or 1 or ... 9
{17}        exactly 17 times (+ would mean any number of times, including 0, * would mean any number of times greater than 0
$         end of string*/
});

Match.enrollmentTokenString = Match.Where(function (id) {
    return (Match.test(id,String) && (id.length  == 43));
});

Match.nonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length > 0;
});

//my best attempt to strip all html tags and spaces to see if
//there is actual text content
Match.stringWithContent = Match.Where(function(x) {
  var justTheText = _.str.clean(
  _.str.stripTags(
    _.unescapeHTML(
      x.replace(/&nbsp;/g,'')
  )));
  return !!justTheText;
})

Match.email = Match.Where(function (e) {
  var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return (Match.test(e,String) && filter.test(e))
/*
^                       start of string
([a-zA-Z0-9_\.\-])+     any number of alphanumeric charaters, _, . and -
\@                      @
(([a-zA-Z0-9\-])+       any number of alphanumeric characters, and -
                \.)    .
([a-zA-Z0-9]{2,4})+    2 - 4 alphanumberic characters
$                      end of string
*/
})

Match.password = Match.Where(function(p) {
  var filter = /^(?=.*[0-9@#$%^&+=_-])(?=.*[a-z])(?=.*[A-Z])(?=\S+$).{8,}$/;
  return (Match.test(p,String) && filter.test(p))
/*
^                            # start-of-string
(?=.*[0-9@#$%^&+=_\-])       # a digit or special character must occur at least once
(?=.*[a-z])                  # a lower case letter must occur at least once
(?=.*[A-Z])                  # an upper case letter must occur at least once
(?=\S+$)                     # no whitespace allowed in the entire string
.{8,}                        # at least eight characters long
$                            # end-of-string
*/
})

//CA password policy, at least one from 3 of the following 5 categories
//a.       Uppercase characters of European languages (A through Z, with diacritic marks, Greek and Cyrillic characters)
//b.      Lowercase characters of European languages (a through z, sharp-s, with diacritic marks, Greek and Cyrillic characters)
//c.       Base 10 digits (0 through 9)
//d.      Non alphanumeric characters: ~!@#$%^&*_-+=`|\(){}[]:;"'<>,.?/
//e.       Any Unicode character that is categorized as an alphabetic character but is not uppercase or lowercase. This includes Unicode characters from Asian languages.
//The minimal password length is 8 character
//cannot contain the username embedded in it
//very difficult to implement in regexp

Match.calcMethodString = Match.Where(function(method) {
  var calcMethod = method.split(/[0-9]/)[0]; 
  var calcParam = _.str.toNumber(_.str.strRight(method,calcMethod)); 
  var validMethods = ['mostRecent','average','decayingAverage'];
  if (!_.contains(validMethods,calcMethod))
    return false;
  //decaying average must have a valid parameter (meaning = percent assigned to most recent score)
  if ((calcMethod == 'decayingAverage') && (!calcParam)) 
    return false;
  //mostRecent must not have a parameter
  if ((calcMethod == 'mostRecent') && (calcParam))
    return false;
  //average can take a parameter (meaning = average most recent p scores) 
  //or not (meaning = average all scores)
  return true;
})

//string must be a number or
//have the form "NM (no mastery), DM (developing mastery), M (mastery)"
Match.scaleString = Match.Where(function(scaleHelp) {
  var scaleHelp = _.str.trim(scaleHelp);
  var numericalScale = _.str.toNumber(scaleHelp);
  if (_.isFinite(numericalScale)) return true;
  var symbolicScale = scaleHelp.split(',');
  if (symbolicScale.length == 0) return false;
  var goodValues = true;
  symbolicScale.forEach(function(step) {
    if (step.match(/\(([^)]+)\)/))  //contains (anything)
      step = _.str.strLeft(step,'('); //everything to left of first (
    step = step.replace(/ /g,''); //delete all spaces
    if (!step) goodValues = false; //if nothing left
  })
  return goodValues;
/* regexp matches (anything), explanation below
    \( : match an opening parentheses
    ( : begin capturing group
    [^)]+: match one or more non ) characters
    ) : end capturing group
    \) : match closing parentheses
*/
});

Match.timePeriod = Match.Where(function(tP) {
  if (!Match.test(tP,{
    Mon:Match.Optional({start:String,end:String}),
    Tue:Match.Optional({start:String,end:String}),
    Wed:Match.Optional({start:String,end:String}),
    Thu:Match.Optional({start:String,end:String}),
    Fri:Match.Optional({start:String,end:String}),
  }))
    return false;
  if (!_.keys(tP).length)
    return false;

  _.each(tP,function(times,day) {
    var start = moment(times.start,'h:mm a');
    var end = moment(times.end,'h:mm a');
    if (end.isBefore(start))
      return false;
    if (!start.isBefore(end))
      return false;
  })
  return true;
})
