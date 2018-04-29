var Profile = require("../models/profile");
var Task = require("../models/task");

//middleware to check if user activated account yet
var pendingTasks=function(req, res, next) {
    Profile.findById(res.locals.user).populate({path: 'pendingTasks'}).exec(function(err, taskList) { //looks for true value in status active field
    if(err)
        console.log(err);
       res.locals.pendingTasks = taskList.pendingTasks;
        

    });
    
    Task.find({creator: res.locals.user._id, 'payout.status': true}).exec(function(err, pendingPayouts){
        if(err)
        console.log(err);
        console.log("Number of pending payouts: ", pendingPayouts.length);
        res.locals.pendingPayouts = pendingPayouts;
    });
    next();
};

module.exports = pendingTasks;