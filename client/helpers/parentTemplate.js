/******************************************************/
/****from: http://stackoverflow.com/questions/27949407/how-to-get-the-parent-template-instance-of-the-current-template ****/
/******************************************************/

/**
 * Get the parent template instance
 * @param {Number} [levels] How many levels to go up. Default is 1
 * @returns {Blaze.TemplateInstance}
  * Example usage: someTemplate.parentTemplate() to get the immediate parent
  *didn't work in initial trial
 */
/*
Blaze.TemplateInstance.prototype.parentTemplate = function (levels) {
    var view = Blaze.currentView;
    if (typeof levels === "undefined") {
        levels = 1;
    }
    while (view) {
        if (view.name.substring(0, 9) === "Template." && !(levels--)) {
            return view.templateInstance();
        }
        view = view.parentView;
    }
};
*/

// extend Blaze.View prototype to mimick jQuery's closest for views
/*
Note that this is only supporting named parent templates and supposed to work in the same fashion as jQuery closest to traverse parent views nodes from a child to the top-most template (body), searching for the appropriately named template.
Once this extensions to Blaze have been registered somewhere in your client code, you can do stuff like this :

HTML
<template name="parent">
  <div style="background-color:{{backgroundColor}};">
    {{> child}}
  </div>
</template>

<template name="child">
  <button type="button">Click me to change parent color !</button>
</template>

JS
Template.parent.created=function(){
  this.backgroundColor=new ReactiveVar("green");
};

Template.parent.helpers({
  backgroundColor:function(){
    return Template.instance().backgroundColor.get();
  }
});

Template.child.events({
  "click button":function(event,template){
    var parent=template.closestInstance("parent");
    var backgroundColor=parent.backgroundColor.get();
    switch(backgroundColor){
      case "green":
        parent.backgroundColor.set("red");
        break;
      case "red":
        parent.backgroundColor.set("green");
        break;
    }
  }
});
 * worked well in initial trial
*/

_.extend(Blaze.View.prototype,{
    closest:function(viewName){
        var view=this;
        while(view){
            if(view.name=="Template."+viewName){
                return view;
            }
            view=view.parentView;
        }
        return null;
    }
});

// extend Blaze.TemplateInstance to expose added Blaze.View functionalities
_.extend(Blaze.TemplateInstance.prototype,{
    closestInstance:function(viewName){
        var view=this.view.closest(viewName);
        return view?view.templateInstance():null;
    }
});
