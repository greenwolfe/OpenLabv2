Template.xedit.rendered = function () {
  var container = $(this.find('.editable'));
  var data = this.data;
  var width = data.hasOwnProperty('width') ? data.width : '200px';
  if (data.type == 'text') {
    _.extend(data,{
      rows: 0,
      tpl: "<input type='text' style='width: " + width + "'>",
      mode: data.hasOwnProperty('mode') ? data.mode : 'inline',
      showbuttons: data.hasOwnProperty('showbuttons') ? data.showbuttons : 'right',
      placement: data.hasOwnProperty('placement') ? data.placement : 'bottom'
    });
  } else if (data.type == 'wysihtml5') {
    _.extend(data,{
      rows: 0,
      tpl: "<textarea></textarea>",
      mode: data.hasOwnProperty('mode') ? data.mode : 'popup',
      showbuttons: data.hasOwnProperty('showbuttons') ? data.showbuttons : 'top',
      placement: data.hasOwnProperty('placement') ? data.placement : 'bottom'
      /*wysihtml5: { // how to get this working?
        'lists':true,
        'link':true
      },*/
    });    
  } else   if (data.type == 'textarea') {
    _.extend(data,{
      tpl: "<textarea></textarea>",
      rows: data.hasOwnProperty('rows') ? data.rows : 1,
      mode: data.hasOwnProperty('mode') ? data.mode : 'inline',
      showbuttons: data.hasOwnProperty('showbuttons') ? data.showbuttons : 'right',
      placement: data.hasOwnProperty('placement') ? data.placement : 'bottom'
    });
  };
  container.editable({
    type: data.type,                // passed in
    value: data.value,
    placeholder: data.placeholder,
    emptytext: data.emptytext,
    mode: data.mode,                // probably set here based on type
    showbuttons: data.showbuttons,
    placement: data.placement,
    rows: data.rows,
    disabled: true,                 // set here for all
    unsavedclass: null,
    tpl: data.tpl,
    success: function(response,newValue) {
      console.log(response);
      //console.log('in success function');
      //console.log(data);
      //console.log(newValue);
      Session.set(data.field,newValue);
    }
  });
  container.on('save',function(e,params) {
    e.preventDefault();
  });

  this.autorun (function() {
    //must include logic for teacher edit mode
    //pseudocode:  if data.requireEditButton
    //  if (!Session.get('editMode')) disable and return
    //implied:  if editMode is on, then check allowed roles to see if teacher
    if (Session.get(data.allowedRoles)) { //if (isInRole(Meteor.userId(),data.allowedRoles)) 
      container.editable('enable');
    } else {
      container.editable('disable');
    }
  });

};