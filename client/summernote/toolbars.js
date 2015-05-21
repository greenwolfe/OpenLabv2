Template.registerHelper('summernoteOptions',function() {
  return { //default/standard air popover toolbar
    airMode: true,
    airPopover: [
      ['style',['style']],
      ['color', ['color']],
      ['fontname', ['fontname']],
      ['fontsize', ['fontsize']],
      ['supersub', ['superscript','subscript']],
      ['font', ['bold', 'italic', 'strikethrough', 'underline', 'clear']],
      ['para', ['ul', 'ol', 'paragraph']],
      ['table', ['table']],
      ['insert', ['link', 'picture'/*,'video'*/]],
      //['undoredo', ['undo','redo']], //leaving out for now ... not clear what is undone ... not a large queue of past changes, and ctrl-z, ctrl-shift-z reacts more like what you would expect
      ['other',[/*'codeview','fullscreen',*/'help','hide']]
      //ISSUE codeview, fullscreen, not working ... does it work from toolbar and just not from air mode?
      //ISSUE video works, but can't resize it, no context menu as for image
      //leaving out video for now, can use video blocks until this is better
    ]
  }
});

Template.registerHelper('summernoteTitleOptions',function() {
  return {
      airMode: true,
      airPopover: [ //shorter set of options for title
        ['style',['style']],
        ['color', ['color']],
        ['fontname', ['fontname']],
        ['fontsize', ['fontsize']], 
        ['supersub', ['superscript','subscript']],
        ['font', ['bold', 'italic', 'underline', 'clear']],
        ['para', ['paragraph']],
        ['insert', ['link']],
        //['undoredo', ['undo','redo']], //leaving out for now ... not clear what is undone ... not a large queue of past changes
        ['other',['help','hide']]
      ]      
    }
});
