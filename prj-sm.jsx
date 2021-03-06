Tasks = new Mongo.Collection('tasks');
Orders = new Mongo.Collection('orders');
Dishes = new Mongo.Collection('dishes');
Settings = new Mongo.Collection('settings');

if (Meteor.isClient) {
  // This code is executed on the client only
 

  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_ONLY'
  });

  Meteor.subscribe('tasks');
  Meteor.subscribe('orders');
  Meteor.subscribe('dishes');

  Meteor.startup(function () {
    ReactDOM.render(<Routes />, document.getElementById('root'));
  });
}

if (Meteor.isServer) {


  Meteor.publish('orders', function(filter) {
    var self = this,
        ready = false;

    var subHandle = Orders.find(filter || {}).observeChanges({
      added: function (id, fields) {
        if (!ready)
          fields.existing = true;
        self.added("orders", id, fields);
      },
      changed: function(id, fields) {
        self.changed("orders", id, fields);
      },
      removed: function (id) {
        self.removed("orders", id);
      }
    });

    self.ready();
    ready = true;

    self.onStop(function () {
      subHandle.stop();
    });
  });

  Meteor.publish("dishes", function () {
    return Dishes.find({});
  });



  // 
  // 
  // 
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.publish('todos', function(listId) {
    // check(listId, String);

    return Todos.find({listId: listId});
  }, {
    url: "/publications/todos/:0"
  });

  Meteor.methods({
    sendSMS(phone, price, customer) {
      const accountSid = 'AC78613017db5b491563d248932c405ba6';
      const authToken = 'e23740731e740dac8c1fb2b5b2645a90';

      twilio = Twilio(accountSid, authToken); //this appears to be the issue

      // twilio.sendSms({
      //   to:'+16132662918', 
      //   from: '+16136931086', 
      //   body: `您有新的订单: 电话: ${phone} 金额: $${price}`
      // }, function(err, responseData) { 
      //   if (!err) { 
      //     console.log(err)
      //   }
      // });

      let to = '';
      let body = '';
      if (customer) {
        to = '+1'+phone;
        body = '你好，我们已经开始处理您的订单!';
      } else {
        to = '+16132662918';
        body = '您有新的订单: 电话: ${phone} 金额: $${price}';
      }
      console.log(to);
      console.log(body);
      twilio.sendSms({
        to:to, 
        from: '+16136931086', 
        body: body
      }, function(err, responseData) { 
        if (!err) { 
          console.log(err)
        }
      });
    }
  })
}

Meteor.methods({

  sendEmail(to, from, subject, text) {
    check([to, from, subject, text], [String]);

    // Let other method calls from the same client start running,
    // without waiting for the email sending to complete.
    this.unblock();

    Email.send({
      to: to,
      from: from,
      subject: subject,
      text: text
    });
  },

  getDishes(owner) {
    const dishes = Dishes.find({owner: owner}).fetch();
    return dishes;
  },

  addOrder(order) {
    order.createdAt = new Date();
    order.received = true;
    order.dispatched = false;
    order.completed = false;

    Orders.insert(order);
  },

  completeOrder(orderID) {
    const order = Orders.findOne(orderID);
    Orders.update(orderID, { $set: { completed: true, completedAt: new Date()} });
  },

  setDispatched(orderID, value) {
    const order = Orders.findOne(orderID);
    Orders.update(orderID, { $set: { dispatched: value} });
  },

  // getOrders(owner) {
  //   const orders = Orders.find({owner: owner}).fetch();
  //   return orders;
  // },

  // getAllRecords(username) {
  //   const tasks = Tasks.find({username: username}).fetch();
  //   return tasks;
  // },

  addTaskREST(req) {
    Tasks.insert({
      text: req.text,
      createdAt: new Date(),
      owner: req.owner,
      username: req.username
    });
  },

  addTask(text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }
 
    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
 
  removeTask(taskId) {
    const task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
 
  setChecked(taskId, setChecked) {
    const task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },

  setPrivate(taskId, setToPrivate) {
    const task = Tasks.findOne(taskId);
 
    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }
 
    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});