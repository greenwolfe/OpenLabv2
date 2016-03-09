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
      if (!_.contains(calendarEvent.participants,cU._id))
        throw new Meteor.Error('studentNotParticipant',"A student cannot insert a new todo item unless they are part a participant in the calendar event.");
    }
    var lastTodo = Todos.findOne({calendarEventID: todo.calendarEventID},{
      fields:{order:1},
      sort:{order:-1},
      limit:1
    });
    todo.order = (lastTodo) ? lastTodo.order + 1 : 0;
    var numberOfTodoItems =  Todos.find({calendarEventID: todo.calendarEventID}).count() + 1;

    var todoID = Todos.insert(todo,function(error,id){
      if (error) return;
      CalendarEvents.update(calendarEvent._id,{$set:{numberOfTodoItems:numberOfTodoItems}});
    })

    return todoID;

  },

  updateTodo: function(newTodo) {
    check(newTodo,{
      _id: Match.idString,
      text: String,
      // fields below will be ignored if passed in
      completed: Match.Optional(Match.Boolean), //false
      order: Match.Optional(Match.Integer), //inserted after the last one in the list
      createdBy: Match.Optional(Match.idString),  //current user
      createdOn: Match.Optional(Match.Optional(Date)),  //today's date
      modifiedBy: Match.Optional(Match.Optional(Match.idString)), //current user
      modifiedOn: Match.Optional(Match.Optional(Date)),           //current date
      checkedCorICby: Match.Optional(Match.Optional(Match.idString)), //checked Complete or InComplete ... current user
      checkedCorICon: Match.Optional(Match.Optional(Date))
    })

    var cU = Meteor.user(); //currentUser
    if (!cU)  
      throw new Meteor.Error('notLoggedIn', "You must be logged in to update a todo item.");
    if (Roles.userIsInRole(cU,'parentOrAdvisor'))
      throw new Meteor.Error('parentNotAllowed', "Parents may only observe.  They cannot create new content.");
    if (!Roles.userIsInRole(cU,['student','teacher']))
      throw new Meteor.Error('notStudentOrTeacher','Only teachers and students may update a todo item.'); 

    var todo = Todos.findOne(newTodo._id);
    if (!todo)
      throw new Meteor.Error('todoNotFound',"Cannot update todo item.  Todo item not found.");

    var calendarEvent = CalendarEvents.findOne(todo.calendarEventID);
    if (!calendarEvent)
      throw new Meteor.Error('calendarEventNotFound',"Cannot update todo item.  Calendar event not found.");
    if (Roles.userIsInRole(cU,'student')) {
      if (!_.contains(calendarEvent.participants,cU._id))
        throw new Meteor.Error('studentNotParticipant',"A student cannot update a todo item unless they are a participant in that calendar event.");
    }

    if (_.trim(_.stripTags(newTodo.text))) {
      return Todos.update(newTodo._id,{$set:{
        text:newTodo.text,
        modifiedBy: cU._id,
        modifiedOn: new Date()
      }});
    } else {
      if (calendarEvent.numberOfTodoItems < 2)
        throw new Meteor.Error('needAtLeastOneTodo',"Cannot delete the last todo item.  Calendar events must have at leaast one.");
      var ids = _.pluck(Todos.find({calendarEventID:todo.calendarEventID,order:{$gt: todo.order}},{fields: {_id: 1}}).fetch(), '_id');
      return Todos.remove(todo._id,function(error,id) {
        if (error) return;
        if (calendarEvent.numberOfTodoItems > 1)
          CalendarEvents.update(calendarEvent._id,{$inc:{numberOfTodoItems:-1}});
        if (todo.completed && (calendarEvent.numberTodosCompleted > 0)) {
          CalendarEvents.update(calendarEvent._id,{$inc:{numberTodosCompleted:-1}});
        }
        Todos.update({_id: {$in: ids}}, {$inc: {order:-1}}, {multi: true});
      }) 
    }
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
      if (!_.contains(calendarEvent.participants,cU._id))
        throw new Meteor.Error('studentNotParticipant',"A student cannot update a todo item unless they are a participant in the calendar event.");
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
      if (!_.contains(calendarEvent.participants,cU._id))
        throw new Meteor.Error('studentNotParticipant',"A student cannot update a todo item unless they are a participant in the calendar event.");
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
  }
})