  //add separately to popover
/*
in header B block, etc (just notification) ... unit and activity names 
similar view for student, but no editing capability? 

PROBABLY NOT DO BELOW ... TOO COMPLICATED
add a calendar section which can be toggled on and off showing the suggested work periods
make it a mini activity-list complete with status indicators?
that way when I give them more freedom, they can see their progress
each day in the calendar ... show status as of that particular*/

/** extend jquery to position the modal dialog box (target) 
    near the triggering element (element) **/
/** http://snippets.aktagon.com/snippets/310-positioning-an-element-over-another-element-with-jquery **/
/** positioning code from popover-x 
        https://github.com/kartik-v/bootstrap-popover-x/blob/master/js/bootstrap-popover-x.js 
        starting at line 54 **/
$.fn.positionOn = function(element, placement) {
  return this.each(function() {
    var target   = $(this);
    var targetWidth = target[0].offsetWidth
    var targetHeight = target[0].offsetHeight
    var targetPos; //new position of target, to be calculated

    var elementPos = element.offset();
    var elementWidth = element[0].offsetWidth;
    var elementHeight = element[0].offsetHeight;

    placement = placement || 'right';
    var moveTarget = {
      right: function() {
        var y = elementPos.top + elementHeight / 2 - targetHeight / 2;
        if (y < $(window).scrollTop()) { //top of modal is off screen
          placement = 'right right-top';
        } else if (y + targetHeight > window.innerHeight) { //bottom of modal is off screen
          placement = 'right right-bottom'
        } else {
          return {
            position: 'absolute',
            top: y, 
            left: elementPos.left + elementWidth
          }; 
        }
        return moveTarget[placement]();
      },
      'right right-top': function() {
        return {
          position: 'absolute',
          top: elementPos.top - 0.1*targetHeight + 0.5*elementHeight, 
          left: elementPos.left + elementWidth
        };       
      },
      'right right-bottom': function() {
        return {
          position: 'absolute',
          top: elementPos.top - 0.9*targetHeight + 0.5*elementHeight, 
          left: elementPos.left + elementWidth
        };
      },

      left: function() {
        var y = elementPos.top + elementHeight / 2 - targetHeight / 2;
        if (y < $(window).scrollTop()) { //top of modal is off screen
          placement = 'left left-top';
        } else if (y + targetHeight > window.innerHeight) { //bottom of modal is off screen
          placement = 'left left-bottom'
        } else {
          return {
            position: 'absolute',
            top: y, 
            left: elementPos.left  - targetWidth
          }; 
        }
        return moveTarget[placement]();
      },
      'left left-top': function() {
        return {
          position: 'absolute',
          top: elementPos.top - 0.1*targetHeight + 0.5*elementHeight, 
          left: elementPos.left  - targetWidth
        };       
      },
      'left left-bottom': function() {
        return {
          position: 'absolute',
          top: elementPos.top - 0.9*targetHeight + 0.5*elementHeight, 
          left: elementPos.left  - targetWidth
        };
      },

      top: function() {
        var x = elementPos.left + elementWidth / 2 - targetWidth / 2;
        if (x < $(window).scrollLeft()) { //left edge of modal is off screen
          placement = 'top top-left';
        } else if (x + targetWidth > window.innerWidth) { //right edge of modal is off screen
          placement = 'top top-right'
        } else {
          return {
            position: 'absolute',
            top: elementPos.top - targetHeight, 
            left: x
          }; 
        }
        return moveTarget[placement]();
      },
      'top top-right': function() {
        return {
          position: 'absolute',
          top: elementPos.top - targetHeight, 
          left: elementPos.left - 0.9*targetWidth + 0.5*elementWidth,
        };       
      },
      'top top-left': function() {
        return {
          position: 'absolute',
          top: elementPos.top - targetHeight, 
          left: elementPos.left - 0.1*targetWidth + 0.5*elementWidth,
        };
      },

      bottom: function() {
        var x = elementPos.left + elementWidth / 2 - targetWidth / 2;
        if (x < $(window).scrollLeft()) { //left edge of modal is off screen
          placement = 'bottom bottom-left';
        } else if (x + 100*targetWidth > window.innerWidth) { //right edge of modal is off screen
          placement = 'bottom bottom-right'
        } else {
          return {
            position: 'absolute',
            top: elementPos.top + elementHeight, 
            left: x
          }; 
        }
        return moveTarget[placement]();
      },
      'bottom bottom-right': function() {
        return {
          position: 'absolute',
          top: elementPos.top + elementHeight, 
          left: elementPos.left - 0.9*targetWidth + 0.5*elementWidth,
        };       
      },
      'bottom bottom-left': function() {
        return {
          position: 'absolute',
          top: elementPos.top + elementHeight, 
          left: elementPos.left - 0.1*targetWidth + 0.5*elementWidth,
        };
      }       
    }

    target.css(moveTarget[placement]());
    target.alterClass('right* left* top* bottom*',placement);
  });
};

/**
 * https://gist.github.com/peteboere/1517285
 * jQuery alterClass plugin
 *
 * Remove element classes with wildcard matching. Optionally add classes:
 *   $( '#foo' ).alterClass( 'foo-* bar-*', 'foobar' )
 *
 * Copyright (c) 2011 Pete Boere (the-echoplex.net)
 * Free under terms of the MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 */

$.fn.alterClass = function ( removals, additions ) {
  
  var self = this;
  
  if ( removals.indexOf( '*' ) === -1 ) {
    // Use native jQuery methods if there is no wildcard matching
    self.removeClass( removals );
    return !additions ? self : self.addClass( additions );
  }
 
  var patt = new RegExp( '\\s' + 
      removals.
        replace( /\*/g, '[A-Za-z0-9-_]+' ).
        split( ' ' ).
        join( '\\s|\\s' ) + 
      '\\s', 'g' );
 
  self.each( function ( i, it ) {
    var cn = ' ' + it.className + ' ';
    while ( patt.test( cn ) ) {
      cn = cn.replace( patt, ' ' );
    }
    it.className = $.trim( cn );
  });
 
  return !additions ? self : self.addClass( additions );
};

Template.workPeriodPopoverX.events({
  'dp.change #startDatePicker': function(event,tmpl) {
    var date = event.date.toDate();
    tmpl.$('#endDatePicker').data("DateTimePicker").minDate(date);
    var wP = Session.get('workPeriod');
    wP.startDate = date;
    Session.set('workPeriod',wP);
  },
  'dp.change #endDatePicker': function(event,tmpl) {
    var date = event.date.toDate();
    tmpl.$('#startDatePicker').data("DateTimePicker").maxDate(date);
    var wP = Session.get('workPeriod');
    wP.endDate = date;
    Session.set('workPeriod',wP);
  },
  'shown.bs.modal #workPeriodPopoverX': function(event,tmpl) {
    var workPeriodGauge = $(event.relatedTarget);
    var workPeriodPopover = tmpl.$('#workPeriodPopoverX');
    workPeriodPopover.positionOn(workPeriodGauge,'right');
  }
});

var dateFormatString = "ddd, MMM D YYYY [at] h:mm a";

Template.workPeriodPopoverX.onRendered(function() {
  this.$('#startDatePicker').datetimepicker({
    showClose:  true,
    showClear: true,
    keepOpen: false,
    format: dateFormatString
  });
  this.$('#endDatePicker').datetimepicker({
    showClose: true,
    showClear: true,
    keepOpen: false,
    format: dateFormatString
  });

  tmpl = this;
  this.autorun(function(c) {
    var wP = Session.get('workPeriod');
    if (Match.test(wP,Match.ObjectIncluding({
        startDate: Date,
        endDate: Date,
        unitStartDate: Date,
        unitEndDate: Date
      }))) {
      tmpl.$('#startDatePicker').data('DateTimePicker').date(wP.startDate);
      tmpl.$('#endDatePicker').data('DateTimePicker').date(wP.endDate);
    }  
  })
})
//all working here, but no provision for sending initial values
//to datetimepicker inputs
Template.workPeriodPopoverX.helpers({
  workPeriod: function() {
    var wP = Session.get('workPeriod');
    if (Match.test(wP,Match.ObjectIncluding({
        startDate: Date,
        endDate: Date,
        unitStartDate: Date,
        unitEndDate: Date
      }))) 
        return wP;
    longLongAgo = new Date(0);
    return {
      startDate: longLongAgo,
      endDate: longLongAgo,
      unitStartDate: longLongAgo,
      unitEndDate: moment(longLongAgo).add(1,'days').toDate()
    }
  },
  formatDate: function(date) {
    return (Match.test(date,Date)) ? moment(date).format(dateFormatString) : '_____';
  }
})