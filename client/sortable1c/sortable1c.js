/* In addition to standard sortable parameters, must pass in:

  collection: mongoDB name of the collection of items to be updated (example:  Blocks)
            ****NOTE THIS IS THE MONGODB NAME, which may not be the same as the meteor variable
            ****referencing that collection
  sortField:  field used to select a subset of the collection
  sortValue:  value that defines this particular subset
  NOTE:  the items must the this particular subset of the collection

And may pass in:
  sortField: (optional) field of collection to update, defaults to order
  
The following standard parameters are often passed in
draggable: css specifier for draggable element
handle: css specifier for handle part of draggable
group:  css specifier (minus the .) for group if allowing dragging
         from one list to another (required?  what if not present?)
*/

Template.sortable1c.onRendered(function() {
  var templateInstance = this;
  var el = this.firstNode.parentElement;
  if (!el) return;
  var options = this.data.options || {};  //it appears handlebars automatically merges anything 
    //explicitly in the html data (excluding items) with anything in an options object passed from javascript.  
    //conflicts are resolved in favor of the explicit data
    //NOT SURE THIS IS TRUE, as I pass in only items and options,
    //  and I wouldn't want items to be passed into Sortable anyway
  options.sortField = options.sortField || 'order';
  options.onUpdate =  function(evt) {
    evt.stopPropagation(); //stop propagation if nested sortables
    //evt.newIndex && evt.oldIndex not accurate in nested cases, re-creating from template data
    var item = evt.item; //item being sorted
    var itemData = Blaze.getData(item); 
    var prevItem = item.previousElementSibling;
    var prevItemData = (prevItem) ? Blaze.getData(prevItem) : null;
    //validation:  previous item is part of same set
    var prevOrder = (prevItemData && (options.selectField in prevItemData) && (prevItemData[options.selectField] == options.selectValue)) ? prevItemData[options.sortField] : null;
    var nextItem = item.nextElementSibling;
    var nextItemData = (nextItem) ? Blaze.getData(nextItem) : null;
    //validation:  next item is part of same set
    var nextOrder = (nextItemData && (options.selectField in nextItemData) && (nextItemData[options.selectField] == options.selectValue)) ? nextItemData[options.sortField] : null;
    if (_.isFinite(nextOrder) && (itemData.order > nextOrder)) { //moved up
      Meteor.call('sortItem',options.collection,itemData._id,options.sortField,options.selectField,null,nextOrder,alertOnError);  
    } else if (_.isFinite(prevOrder) && (itemData.order < prevOrder)) { //moved down
      Meteor.call('sortItem',options.collection,itemData._id,options.sortField,options.selectField,prevOrder,null,alertOnError);
    } else {
      //do nothing - drag and drop in same location
    }
  };
  //do this for other sortable callbacks?
  //handle the ones I am not overwriting as in original sortable template?
  //in original template, why does he call onAdd BEFORE calling collection.insert?
  var optionsonAdd = options.onAdd || null;
  options.onAdd = function(evt) {
    evt.stopPropagation();
    var item = evt.item
    var itemData = Blaze.getData(item);

    var prevItem = item.previousElementSibling;
    var prevItemData = (prevItem) ? Blaze.getData(prevItem) : null;
    //validation:  previous item is part of same set
    var prevOrder = (prevItemData && (options.selectField in prevItemData) && (prevItemData[options.selectField] == options.selectValue)) ? prevItemData[options.sortField] : null;
    var nextItem = item.nextElementSibling;
    var nextItemData = (nextItem) ? Blaze.getData(nextItem) : null;
    //validation:  next item is part of same set
    var nextOrder = (nextItemData && (options.selectField in nextItemData) && (nextItemData[options.selectField] == options.selectValue)) ? nextItemData[options.sortField] : null;

    //a true move only uses nextItem and places item at end of list if there is no next Item
    //passing prevItem to handle the case of a single list split between multiple columns
    //this allows detection and proper handling (with regular sort rather than move) of moves to beginning or end of one sublist
    Meteor.call('moveItem',options.collection,itemData._id,options.sortField,options.selectField,options.selectValue,prevOrder,nextOrder,alertOnError);
    evt.data = itemData;
    if (optionsonAdd) optionsonAdd(evt);
  };
  var sortable = Sortable.create(el,options);
  
  //establish reactivity on any changes to sortable parameters
  //accesses sortable and options from parent context, updating options with current values whenever changed
  this.autorun(function() {
    var newOptions = this.templateInstance().data.options;
    _.each(newOptions, function(value, key){ 
        if (!(key in options) || !_.isEqual(value,options[key])) {
          sortable.option(key,value);
          options[key] = value; //keep this up to date
        }
    })
  });
});