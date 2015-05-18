(function (factory) {
  /* global define */
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else {
    // Browser globals: jQuery
    factory(window.jQuery);
  }
}(function ($) {
  // template
  var tmpl = $.summernote.renderer.getTemplate();

  /**
   * @class plugin.hide
   * 
   * Save Plugin  
   */
  $.summernote.addPlugin({
    /** @property {String} name name of plugin */
    name: 'hide',
    /** 
     * @property {Object} buttons 
     * @property {Function} buttons.hide   function to make button
    */
    buttons: { // buttons
      hide: function () {
        return tmpl.iconButton('fa fa-close', {
          event : 'hide',
          title: 'hide toolbar',
          hide: true
        });
      }
    },

    /**
     * @property {Object} events 
     * @property {Function} events.hide  run function when button that has a 'hello' event name  fires click
    */
    events: { // events
        hide: function (event, editor, layoutInfo) {
            // set blur
            layoutInfo.editable().blur();

            // hide all popover
            setTimeout(function() {
                layoutInfo.popover().children().hide();
            }, 10);

        }
    }
  });
}));
