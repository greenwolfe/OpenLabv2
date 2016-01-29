Todos = new Meteor.Collection('Todos');

Meteor.methods({
  insertTodo: function(todo) {
    check(todo, {
      calendarEventID: Match.idString,
      text: Match.nonEmptyString

      /* not passed in, will be filled automatically below
      completed: Match.Boolean, //false
      order: Match.Integer, //inserted after the last one in the list
      createdBy: Match.idString,  //current user
      createdOn: Match.Optional(Date),  //today's date
      modifiedBy: Match.Optional(Match.idString), //current user
      modifiedOn: Match.Optional(Date),           //current date
      checkedCorICby: Match.Optional(Match.idString), //checked Complete or InComplete ... current user
      checkedCorICon: Match.Optional(Date)
      */
    })
    todo.completed = false;
    var today = new Date();
    todo.createdOn = today;
    todo.modifiedOn = today;
    todo.checkedCorICon = today;

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to insert a todo item.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Roles.userIsInRole(cU,['student','teacher']))
      throw new Meteor.Error('notStudentOrTeacher','Only teachers and students may insert a todo item.'); 
    todo.createdBy = cU._id;
    todo.modifiedBy = cU._id;
    todo.checkedCorICby = cU._id;

    var calendarEvent = CalendarEvents.findOne(todo.calendarEventID);
    if (!calendarEvent)
      throw new Meteor.Error('calendarEventNotFound',"Cannot insert todo item.  Calendar event not found.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(calendarEvent.group,cU._id))
        throw new Meteor.Error('studentNotInGroup',"A student cannot insert a new todo item unless they are part of that group.");
    }
    todo.order = calendarEvent.numberOfTodoItems;

    var todoID = Todos.insert(todo,function(error,id){
      if (error) return;
      CalendarEvents.update(calendarEvent._id,{$inc:{numberOfTodoItems:1}});
    })

    return todoID;

  },

  updateTodoText: function(todoID,newText) {
    check(todoID,Match.idString);
    check(newText,Match.nonEmptyString);

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a todo item.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Roles.userIsInRole(cU,['student','teacher']))
      throw new Meteor.Error('notStudentOrTeacher','Only teachers and students may update a todo item.'); 

    var todo = Todos.findOne(todoID);
    if (!todo)
      throw new Meteor.Error('todoNotFound',"Cannot update todo item.  Todo item not found.");

    var calendarEvent = CalendarEvents.findOne(todo.calendarEventID);
    if (!calendarEvent)
      throw new Meteor.Error('calendarEventNotFound',"Cannot update todo item.  Calendar event not found.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(calendarEvent.group,cU._id))
        throw new Meteor.Error('studentNotInGroup',"A student cannot update a todo item unless they are part of that group.");
    }

    return Todos.update(todoID,{$set:{text:newText}});
  },
  markTodoComplete: function(todoID) {
    check(todoID,Match.idString);

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a todo item.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Roles.userIsInRole(cU,['student','teacher']))
      throw new Meteor.Error('notStudentOrTeacher','Only teachers and students may update a todo item.'); 

    var todo = Todos.findOne(todoID);
    if (!todo)
      throw new Meteor.Error('todoNotFound',"Cannot update todo item.  Todo item not found.");

    var calendarEvent = CalendarEvents.findOne(todo.calendarEventID);
    if (!calendarEvent)
      throw new Meteor.Error('calendarEventNotFound',"Cannot update todo item.  Calendar event not found.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(calendarEvent.group,cU._id))
        throw new Meteor.Error('studentNotInGroup',"A student cannot update a todo item unless they are part of that group.");
    }

    if (!todo.completed) {
      var numUpdated = Todos.update(todoID,{$set:{completed:true}},function(error,id) {
        if (error) return;
        if (calendarEvent.numberTodosCompleted < calendarEvent.numberOfTodoItems) {
          CalendarEvents.update(calendarEvent._id,{$inc:{numberTodosCompleted:1}});
        } else {
          throw new Meteor.Error('alreadyCompleted','Error updating total of completed items.  Calendar event says all todo items are already completed.');
        }
      })
      return numUpdated;
    } else  {
      return 0;
    }
  },
  markTodoIncomplete: function(todoID) {
    check(todoID,Match.idString);

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a todo item.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Roles.userIsInRole(cU,['student','teacher']))
      throw new Meteor.Error('notStudentOrTeacher','Only teachers and students may update a todo item.'); 

    var todo = Todos.findOne(todoID);
    if (!todo)
      throw new Meteor.Error('todoNotFound',"Cannot update todo item.  Todo item not found.");

    var calendarEvent = CalendarEvents.findOne(todo.calendarEventID);
    if (!calendarEvent)
      throw new Meteor.Error('calendarEventNotFound',"Cannot update todo item.  Calendar event not found.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(calendarEvent.group,cU._id))
        throw new Meteor.Error('studentNotInGroup',"A student cannot update a todo item unless they are part of that group.");
    }

    if (todo.completed) {
      var numUpdated = Todos.update(todoID,{$set:{completed:false}},function(error,id) {
        if (error) return;
        if (calendarEvent.numberTodosCompleted > 0) {
          CalendarEvents.update(calendarEvent._id,{$inc:{numberTodosCompleted:-1}});
        } else {
          throw new Meteor.Error('noneCompleted','Error updating total of completed items.  Calendar event says none are completed yet.');
        }
      })
      return numUpdated;
    } else  {
      return 0;
    }
  },
  deleteTodo: function(todoID) {
    check(todoID,Match.idString);

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to delete a todo item.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Roles.userIsInRole(cU,['student','teacher']))
      throw new Meteor.Error('notStudentOrTeacher','Only teachers and students may delete a todo item.'); 

    var todo = Todos.findOne(todoID);
    if (!todo)
      throw new Meteor.Error('todoNotFound',"Cannot delete todo item.  Todo item not found.");

    var calendarEvent = CalendarEvents.findOne(todo.calendarEventID);
    if (!calendarEvent)
      throw new Meteor.Error('calendarEventNotFound',"Cannot delete todo item.  Calendar event not found.");
    if (calendarEvent.numberOfTodoItems < 2)
      throw new Meteor.Error('needAtLeastOneTodo',"Cannot delete the last todo item.  Calendar events must have at leaast one.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(calendarEvent.group,cU._id))
        throw new Meteor.Error('studentNotInGroup',"A student cannot delete a todo item unless they are part of that group.");
    }

    //re-order remaining todos
    Todos.remove(todoID,function(error,id) {
      if (error) return;
      if (calendarEvent.numberOfTodoItems > 1)
        CalendarEvents.update(calendarEvent._id,{$inc:{numberOfTodoItems:-1}});
      if (todo.completed && (calendarEvent.numberTodosCompleted > 0)) {
        CalendarEvents.update(calendarEvent._id,{$inc:{numberTodosCompleted:-1}});
      }
    })
  }
})