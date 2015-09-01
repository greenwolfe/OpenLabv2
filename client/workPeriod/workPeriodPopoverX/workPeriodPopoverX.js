/* to use, pass in an object with the following fields via Session.set('workPeriod')
   a valid workPeriod set using the setWorkPeriod method will have these fields
   values give are well-behaved defaults if there is no workPeriod for this activity and section yet
      activityID: this._id,           //required:  valid activity _id
      unitID: this.unitID,            //passed in for completeness, probably not used to display data
      activityVisible: this.visible,  //passed in for completeness, probably not used to display data
      sectionID: 'applyToAll',        //rest are well-behaved default values
      startDate: longLongAgo(),       //new Date(0)
      endDate: longLongAgo(),
      unitStartDate: longLongAgo(),
      unitEndDate: notSoLongAgo(),    //newDate(0) plus one week
      unitStartDateWithoutSelf: wayWayInTheFuture(), //new Date(8630000000000000); //new Date(8640000000000000) =  Sat Sep 13 275760 01:00:00 GMT+0100 (BST) and is the maximum possible javascript Date
      unitEndDateWithoutSelf: notSoLongAgo()
*/


/*to do:
*  have this info show up in the calendar?
*  have it editable in the calendar?
*  provide for overrides at the individual or group level (make this a separate collection?)

*  switch values and keep popover open when click on new button
*      difficult to do, and double-click works
*  popover does not dismiss on blur, which causes problems when switching to a new unit without first dismissing it
*      the popover doesn't change content, but now points to a different activity
*      currently handled by hiding the modal on the unit title click event
*      would be better to handle it here

*improve stub simulation 
*     have all icons register the provisional change?
*     have it extend to more than a half-circle to show extended deadline?
*merge save for all and save for section handlers, getting
*    designation from event.target.id
*/


  /*******************/
 /**** utilities ****/
/*******************/
/** extended jquery to position the modal dialog box (target) 
    near the triggering element (element) using: **/
/** http://snippets.aktagon.com/snippets/310-positioning-an-element-over-another-element-with-jquery **/
/** positioning code from popover-x 
        https://github.com/kartik-v/bootstrap-popover-x/blob/master/js/bootstrap-popover-x.js 
        starting at line 54 **/

/* should be put in bootstrapPopoverX replacing old .js file? */

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
        } else if ((y + targetHeight > window.innerHeight) && (y + 0.4*targetHeight < $(window).scrollTop())) { //bottom of modal is off screen and adjusting up won't make the top go offscreen
          placement = 'right right-bottom'
        } else {
          return {
            top: y, 
            left: elementPos.left + elementWidth
          }; 
        }
        return moveTarget[placement]();
      },
      'right right-top': function() {
        return {
          top: elementPos.top - 0.1*targetHeight + 0.5*elementHeight, 
          left: elementPos.left + elementWidth
        };       
      },
      'right right-bottom': function() {
        return {
          top: elementPos.top - 0.9*targetHeight + 0.5*elementHeight, 
          left: elementPos.left + elementWidth
        };
      },

      left: function() {
        var y = elementPos.top + elementHeight / 2 - targetHeight / 2;
        if (y < $(window).scrollTop()) { //top of modal is off screen
          placement = 'left left-top';
        } else if ((y + targetHeight > window.innerHeight) && (y + 0.4*targetHeight < $(window).scrollTop())) { //bottom of modal is off screen and adjusting up won't make the top go offscreen
          placement = 'left left-bottom'
        } else {
          return {
            top: y, 
            left: elementPos.left  - targetWidth
          }; 
        }
        return moveTarget[placement]();
      },
      'left left-top': function() {
        return {
          top: elementPos.top - 0.1*targetHeight + 0.5*elementHeight, 
          left: elementPos.left  - targetWidth
        };       
      },
      'left left-bottom': function() {
        return {
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
            top: elementPos.top - targetHeight, 
            left: x
          }; 
        }
        return moveTarget[placement]();
      },
      'top top-right': function() {
        return {
          top: elementPos.top - targetHeight, 
          left: elementPos.left - 0.9*targetWidth + 0.5*elementWidth,
        };       
      },
      'top top-left': function() {
        return {
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
            top: elementPos.top + elementHeight, 
            left: x
          }; 
        }
        return moveTarget[placement]();
      },
      'bottom bottom-right': function() {
        return {
          top: elementPos.top + elementHeight, 
          left: elementPos.left - 0.9*targetWidth + 0.5*elementWidth,
        };       
      },
      'bottom bottom-left': function() {
        return {
          top: elementPos.top + elementHeight, 
          left: elementPos.left - 0.1*targetWidth + 0.5*elementWidth,
        };
      }       
    }

    var css = moveTarget[placement]();
    css.position = 'absolute';
    target.css(css);
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
        replace( /\*/g, '[A-Za-z0-9-_]+' ). //remove extra space after *
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

  /*******************/
 /**** onCreated ****/
/*******************/

Template.workPeriodPopoverX.onCreated(function() {
  this.nullWorkPeriod = {
    activityID: Random.id(17),
    unitID: Random.id(17),
    activityVisible: false,
    startDate: longLongAgo(),
    endDate: longLongAgo(),
    unitStartDate: longLongAgo(),
    unitEndDate: notSoLongAgo(),
    unitStartDateWithoutSelf: wayWayInTheFuture(),
    unitEndDateWithoutSelf: notSoLongAgo()
  };

  this.footerTemplate = new ReactiveVar('workPeriodSaveButtons');
  this.alertMessage = new ReactiveVar(null);
  this.alertType = new ReactiveVar('info');
});


  /********************/
 /**** onRendered ****/
/********************/

var dateTimeFormat = "ddd, MMM D YYYY [at] h:mm a";
var dateFormat = "ddd, MMM D YYYY";

Template.workPeriodPopoverX.onRendered(function() {
  this.$('#startDatePicker').datetimepicker({
    showClose:  true,
    showClear: true,
    keepOpen: false,
    format: dateTimeFormat,
    toolbarPlacement: 'top',
    widgetPositioning: {vertical:'bottom',horizontal:'auto'},
    keyBinds: {enter: function(widget) {
      if (widget.find('.datepicker').is(':visible')) {
        this.hide();
      } else {
        this.date(widget.find('.datepicker').val());
      }
    }}
  });
  this.$('#endDatePicker').datetimepicker({
    showClose: true,
    showClear: true,
    keepOpen: false,
    format: dateTimeFormat,  //bug in widgetPositioning: {vertial:'top'} so overriding default 'auto' and setting to 'bottom', which also means the picker does not cover the graphic
    toolbarPlacement: 'top',
    widgetPositioning: {vertical:'bottom',horizontal:'auto'},
    keyBinds: {enter: function(widget) {
      if (widget.find('.datepicker').is(':visible')) {
        this.hide();
      } else {
        this.date(widget.find('.datepicker').val());
      }
    }}
  });
})

  /****************/
 /**** events ****/
/****************/

//make save and apply to all buttons in the footer
Template.workPeriodPopoverX.events({
  'show.bs.modal #workPeriodPopoverX': function(event,tmpl) {
    //initialize date time pickers
    var wP = Session.get('workPeriod') || tmpl.nullWorkPeriod;

    if (dateIsNull(wP.startDate)) {
      tmpl.$('#startDatePicker').data('DateTimePicker').defaultDate(null);
    } else {
      tmpl.$('#startDatePicker').data('DateTimePicker').date(wP.startDate);
    }

    if (dateIsNull(wP.endDate)) {
      tmpl.$('#endDatePicker').data('DateTimePicker').date(null);
    } else {
      tmpl.$('#endDatePicker').data('DateTimePicker').date(wP.endDate);
    }
  },
  'shown.bs.modal #workPeriodPopoverX': function(event,tmpl) {
    //position the modal as a popover and show the cartoon bubble arrow
    var workPeriodGauge = $(event.relatedTarget);
    var workPeriodPopover = tmpl.$('#workPeriodPopoverX');
    workPeriodPopover.positionOn(workPeriodGauge,'right');
    $('body').css({overflow:'auto'}); //default modal behavior restricts scrolling
   },
  'dp.change #startDatePicker': function(event,tmpl) {
    //link the pickers to ensure startDate < endDate
    //reset session variable based on change
    var date = (event.date) ? event.date.toDate() : longLongAgo(); //the dateIsNull function treats longLongAgo as a null value
    var wP = Session.get('workPeriod');

    if (dateIsNull(date)) {
      tmpl.$('#endDatePicker').data("DateTimePicker").minDate(false);
      wP.startDate = longLongAgo();
    } else {
      tmpl.$('#endDatePicker').data("DateTimePicker").minDate(date);
      wP.startDate = date;
    }
    wP.unitStartDate = _.min([wP.startDate,wP.unitStartDateWithoutSelf]);

    Session.set('workPeriod',wP);
  },
  'dp.change #endDatePicker': function(event,tmpl) {
     //link the pickers to ensure startDate < endDate
    //reset session variable based on change
    var date = (event.date) ? event.date.toDate() : notSoLongAgo(); //dateIsNull treats notSoLongAgo as a null value
    var wP = Session.get('workPeriod');

    if (dateIsNull(date)) {
      tmpl.$('#startDatePicker').data("DateTimePicker").maxDate(false);
      wP.endDate = notSoLongAgo(); 
    } else {
      tmpl.$('#startDatePicker').data("DateTimePicker").maxDate(date);
      wP.endDate = date;
    }
    wP.unitEndDate = _.max([wP.endDate,wP.unitEndDateWithoutSelf]);

    Session.set('workPeriod',wP);
  },
  'click #saveForSection': function(event,tmpl) {
    var wP = Session.get('workPeriod');
    //when both dates null, check if user intends to delete WorkPeriod
    if (dateIsNull(wP.startDate) && dateIsNull(wP.endDate)) {
      if (Match.test(wP,Match.ObjectIncluding({_id: Match.idString}))) {
        var selectedSection = Sections.findOne(wP.sectionID);
        var sectionName = (selectedSection) ? selectedSection.name : '____';
        if (confirm('Do you want to delete this work period for ' + sectionName + ' ?')) {
          wP.sectionID = (selectedSection) ? selectedSection._id : '';
          Meteor.call('deleteWorkPeriod',wP,alertOnError);
        }
      }
      return;
    } else {
      //send warning message if only one of the dates is null
      if (dateIsNull(wP.startDate) || dateIsNull(wP.endDate)) {
        tmpl.alertMessage.set("Enter valid dates with end date greater than start date, or clear <i>both dates</i> to delete this work period.");
        tmpl.alertType.set('info');
        return tmpl.footerTemplate.set('workPeriodAlert');
      }
    }
    wP.sectionID = Meteor.selectedSectionId();
    Meteor.call('setWorkPeriod',wP,function(error,result) {
      if (error) return alert(error.reason);
      tmpl.alertMessage.set("Work Period Saved");
      tmpl.alertType.set('success');
      tmpl.footerTemplate.set('workPeriodAlertDismiss');
    });
  },
  'click #saveForAllSections': function(event,tmpl) {
    var wP = Session.get('workPeriod');
    //when both dates null, check if user intends to delete WorkPeriod
    if (dateIsNull(wP.startDate) && dateIsNull(wP.endDate)) {
      if (Match.test(wP,Match.ObjectIncluding({_id: Match.idString}))) {
        if (confirm('Do you want to delete this work period for all sections?'))
          wP.sectionID = 'applyToAll';
          Meteor.call('deleteWorkPeriod',wP,alertOnError);
      }
      return;
    } else {
      //send warning message ... only one of the dates is null
      if (dateIsNull(wP.startDate) || dateIsNull(wP.endDate)) {
        tmpl.alertMessage.set("Enter valid dates with end date greater than start date, or clear <i>both dates</i> to delete this work period.");        tmpl.alertType.set('info');
        return tmpl.footerTemplate.set('workPeriodAlert');
      }
    }
    wP.sectionID = 'applyToAll';
    Meteor.call('setWorkPeriod',wP,function(error,result) {
      if (error) return alert(error.reason);
      tmpl.alertMessage.set("Work Period Saved");
      tmpl.alertType.set('success');
      tmpl.footerTemplate.set('workPeriodAlertDismiss');
    });
  },
  'hide.bs.modal #workPeriodPopoverX': function(event,tmpl) {
    Session.set('workPeriod',tmpl.nullWorkPeriod);
    tmpl.footerTemplate.set('workPeriodSaveButtons');
    tmpl.alertMessage.set(null);
    tmpl.alertType.set('info');
    tmpl.$('#startDatePicker').data('DateTimePicker').date(null);
    tmpl.$('#endDatePicker').data('DateTimePicker').date(null);
  }
}); 

  /*****************/
 /**** helpers ****/
/*****************/

Template.workPeriodPopoverX.helpers({
  session: function(key,item) {
    var tmpl = Template.instance();
    var value = tmpl.Session.get(key);
    if ((value) && (item) && _.isObject(value) && (item in value)) {
      return value[item];
    }
    return value;
  },
  workPeriod: function() {
    var tmpl = Template.instance();
    return Session.get('workPeriod') || tmpl.nullWorkPeriod;
  },
  unitStartDate: function() {
    var wP = Session.get('workPeriod') || {};
    return (('unitStartDate' in wP) && !dateIsNull(wP.unitStartDate)) ? wP.unitStartDate : '';
  },
  unitEndDate: function() {
    var wP = Session.get('workPeriod') || {};
    return (('unitEndDate' in wP) && !dateIsNull(wP.unitEndDate)) ? wP.unitEndDate : '';
  },  
  sectionName: function() {
    if (Roles.userIsInRole(Meteor.userId(),'teacher')) {
      var selectedSection = Meteor.selectedSection();
      return (selectedSection) ? selectedSection.name : '&nbsp;';
    }
    return '&nbsp;'
  },
  formatDate: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateFormat) : '_____';
  },
  formatDateTime: function(date) {
    return ((Match.test(date,Date)) && !dateIsNull(date)) ? moment(date).format(dateTimeFormat) : '_____';
  },
  disabled: function() {
    return (Roles.userIsInRole(Meteor.userId(),'teacher')) ? '' : 'disabled';
  },
  footerTemplate: function() {
    var tmpl = Template.instance();
    return tmpl.footerTemplate.get();
  }
})


  /******************************************/
 /**** TEMPLATE WORKPERIOD SAVE BUTTONS ****/
/******************************************/

Template.workPeriodSaveButtons.helpers({
  sectionName: function() {
    if (Roles.userIsInRole(Meteor.userId(),'teacher')) {
      var selectedSection = Meteor.selectedSection();
      return (selectedSection) ? selectedSection.name : '&nbsp;';
    }
    return '&nbsp;'
  }
})

  /************************** ********/
 /**** TEMPLATE WORKPERIOD ALERT ****/
/***********************************/

Template.workPeriodAlert.events({
  'click #dismissWorkPeriodAlert': function(event,tmpl) {
    var parent = tmpl.closestInstance("workPeriodPopoverX");
    parent.footerTemplate.set('workPeriodSaveButtons');
    parent.alertMessage.set(null);
    parent.alertType.set('info');
  }
})
Template.workPeriodAlert.helpers({
  'alertMessage': function() {
    var tmpl = Template.instance();
    var parent = tmpl.closestInstance("workPeriodPopoverX");
    return parent.alertMessage.get();
  },
  'alertType': function() {
    var tmpl = Template.instance();
    var parent = tmpl.closestInstance("workPeriodPopoverX");
    return parent.alertType.get();
  }
})

  /*******************************************/
 /**** TEMPLATE WORKPERIOD ALERT DISMISS ****/
/*******************************************/

Template.workPeriodAlertDismiss.events({
  'click #returnWorkPeriodAlert': function(event,tmpl) {
    var parent = tmpl.closestInstance("workPeriodPopoverX");
    parent.footerTemplate.set('workPeriodSaveButtons');
    parent.alertMessage.set(null);
    parent.alertType.set('info');
  },
  'click #closeWorkPeriodAlert': function(event,tmpl) {
    var parent = tmpl.closestInstance("workPeriodPopoverX");
    parent.$('#workPeriodPopoverX').modal('hide'); 
    parent.alertMessage.set(null);
    parent.alertType.set('info');   
  }
})

Template.workPeriodAlertDismiss.helpers({
  'alertMessage': function() {
    var tmpl = Template.instance();
    var parent = tmpl.closestInstance("workPeriodPopoverX");
    return parent.alertMessage.get();
  },
  'alertType': function() {
    var tmpl = Template.instance();
    var parent = tmpl.closestInstance("workPeriodPopoverX");
    return parent.alertType.get();
  }
})


