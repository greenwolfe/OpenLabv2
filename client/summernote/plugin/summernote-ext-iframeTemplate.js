//not working exactly right because it is disabled in code view
//enabled otherwise
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
   * @class plugin.hello 
   * 
   * Hello Plugin  
   */
  $.summernote.addPlugin({
    /** @property {String} name name of plugin */
    name: 'iframeTemplate',
    /** 
     * @property {Object} buttons 
     * @property {Function} buttons.iframeTemplate   function to make button
     * @property {Function} buttons.iframeTemplateDropdown   function to make button
     * @property {Function} buttons.iframeTemplateImage   function to make button
     */
    buttons: { // buttons
      iframeTemplate: function () {

        return tmpl.button('iframe Template', {
          event : 'iframeTemplate',
          title: 'iframe template',
          hide: true
        });
      },
      iframeTemplateDropdown: function () {


        var list = '<li><a data-event="iframeTemplateDropdown" href="#" data-value="summernote">summernote</a></li>';
        list += '<li><a data-event="iframeTemplateDropdown" href="#" data-value="codemirror">Code Mirror</a></li>';
        var dropdown = '<ul class="dropdown-menu">' + list + '</ul>';

        return tmpl.button('iframe Template', {
          title: 'iframe Template',
          hide: true,
          dropdown : dropdown
        });
      },
      iframeTemplateImage : function () {
        return tmpl.button('iframe Template', {
          event : 'iframeTemplateImage',
          title: 'iframe Template Image',
          hide: true
        });
      }

    },

    /**
     * @property {Object} events 
     * @property {Function} events.hello  run function when button that has a 'hello' event name  fires click
     * @property {Function} events.helloDropdown run function when button that has a 'helloDropdown' event name  fires click
     * @property {Function} events.helloImage run function when button that has a 'helloImage' event name  fires click
     */
    events: { // events
      iframeTemplate: function (event, editor, layoutInfo) {
        // Get current editable node
        var $editable = layoutInfo.editable();

        // Call insertText with 'hello'
        editor.insertText($editable, "<iframe src='http://yourURLhere' width=350px height=225px></iframe>");
      },
      iframeTemplateDropdown: function (event, editor, layoutInfo, value) {
        // Get current editable node
        var $editable = layoutInfo.editable();

        // Call insertText with 'hello'
        editor.insertText($editable, "<iframe src='http://yourURLhere' width=350px height=225px></iframe>" + value + '!!!!');
      },
      iframeTemplateImage : function (event, editor, layoutInfo) {
        var $editable = layoutInfo.editable();

        var img = $('<img src="http://upload.wikimedia.org/wikipedia/commons/b/b0/NewTux.svg" />');
        editor.insertNode($editable, img[0]);
      }
    }
  });
}));
