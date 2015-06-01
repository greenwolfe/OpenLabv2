  /************************************/
 /*** HELP BANNER NAV PILLS  *********/
/************************************/
/*  example
/client/blocks.html

{{>helpBannerNavPills messages=subactivitiesHelpMessages}}

/client/blocks.js

Template.subactivitiesBlock.helpers({
  subactivitiesHelpMessages: function () {
    return [
      'Activities created here will also appear in the main units and activities list, for example on the main page.',
      "They will all link back to the same activity page - this one.",
      "Reordering of the list in this block is independent of the main list.  In the main list, these activities can be sorted among the other activities or even moved to other units.",
      "The title of this block, if it exists, will be used as the title of the page as well.  Otherwise, the title of the initial activity is used.",
      "Create just one subactivities block per activity page.  It can be deleted and re-created without causing problems, but it is probably better just to hide it if you don't want it visible to students."
    ]
  },
  ...

*/

Template.helpBannerNavPills.onCreated(function() {
  this.idString = Random.id();
})


Template.helpBannerNavPills.helpers({
  helpmessages: function() {
    var idString = Template.instance().idString;
    var helpmessages = this.messages.map(function(message,index){
      return {
        message: message,
        index: index,
        id: idString + index,
        href: '#' + idString + index,
        number: index+1
      }
    })
    helpmessages.push({
      message: '',
      index: -1,
      id: idString + 'x',
      href: '#' + idString + 'x',
      number: 'x'
    })
    return helpmessages;
  }
});