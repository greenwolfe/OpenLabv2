Match.idString = Match.Where(function (id) {
    check(id, String);
    return /^[a-zA-Z0-9]{17}$/.test(id);
/*^         start of string
[a-zA-Z0-9]  a or b or c or ... z or A or B or C ... Z or 0 or 1 or ... 9
{17}        exactly 17 times (+ would mean any number of times, including 0, * would mean any number of times greater than 0
$         end of string*/
});

Match.nonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length > 0;
});
