/* need instructions and examples of use here */

Template.plaintexteditor.onRendered(function() {
  var templateInstance = this;
  var element = this.find('div.plaintexteditor');
  if (!element) return;
  var $element = $(element);
  var data = this.data || {}; //options set explicitly in html template
  var Collection = Mongo.Collection.get(data.collection);
  var fields = {};
  fields[data.field] = 1;
  var item = Collection.findOne(data._id,{field:fields});
  var text = '';
  if (item)
    text = item[data.field] || '';
  $element.text(text);
});

Template.plaintexteditor.events({
  "blur div[contenteditable='true'][class~='plaintexteditor']": function(event,tmpl) {
    var $element = $(event.target);
    var text = _.trim(_.stripTags($element.text()));

    var id = tmpl.data._id || 'new';
    if ((id == 'new') && (text == '')) 
      return; //avoiding text not changed error below, since there wasn't any text to begin with

    var method = _.rtrim(tmpl.data.collection,'s'); //if collection = Posts, method=Post
    method = method.replace(/ie$/,'y'); //if collection = Activities, method  = Activity
    method = method.replace('sOf','Of'); //if collection = LevelsOfMastery, method = LevelOfMastery
    var item = tmpl.data.fixedFields || {};
    if (id == 'new') {
      method = 'insert' + method;
    } else {
      var method = 'update' + method; 
      item._id = id;
    }
    item[tmpl.data.field] = text;
    var clearOnSave = tmpl.data.clearOnSave || false;
    if (clearOnSave)
      text = '';

    var Collection = Mongo.Collection.get(tmpl.data.collection);
    var fields = {};
    fields[tmpl.data.field] = 1;
    var originalItem = Collection.findOne(tmpl.data._id,{field:fields});
    var originalText = '';
    if (originalItem)
      originalText = originalItem[tmpl.data.field] || '';
  
    Meteor.call(method,item,function(error,id) {
      if (error) {
        $element.text(originalText); //reset to original value
        alert('Error encountered.  Text not changed.  This is often because it is not allowed to be blank.')
      } else { //reset displayed text to avoid duplicate value 
        $element.text(text); 
      }
    });                          
  }
});

Template.plaintexteditor.helpers({
  placeholder: function() {
    return this.placeholder || 'type something here';
  }
})
