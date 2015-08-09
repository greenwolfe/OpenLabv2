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

Match.calcMethodString = Match.Where(function(c) {
  if (!Match.test(Match.nonEmptyString)) return false;
//latest means average (or total) is just the latest score
  if (c == 'latest') return true;
  var param;
//average means average all scores, average 5 means average the five latest scores
  if (_.str.startsWith(c,'average')) {
    param = _.str.strRight(c,'average');
    if (!param) return true;
    if ((param) && (_.str.toNumber(param))) return true;
    return false;
  } 
//decayingAverage33 means the latest score counts 33% and all the rest together count 66%
  if (_.str.startsWith(c,'decayingAverage')) {
    param = _.str.strRight(c,'decayingAverage');
    if ((param) && (_.str.toNumber(param))) return true;
    return false;
  } 
//totalPoints10 means the scores will be summed and divided by 10 to find the average
  if (_.str.startsWith(c,'totalPoints')) {
    param = _.str.strRight(c,'totalPoints');
    if ((param) && (_.str.toNumber(param))) return true;
    return false;
  }
  return false;
})
