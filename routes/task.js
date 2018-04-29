var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var Profile = require("../models/profile");
var Task = require("../models/task");
var isLoggedIn = require('../middleware/loggedIn');
var checkSignIn = require('../middleware/signedIn');
var updateBalance = require('../middleware/updateBalance');
var setCookie = require("../middleware/setCookie");
var currentPage = require('../middleware/getCurrentPage');
var methodOverride = require("method-override");
var pendingTasks = require("../middleware/pendingTask");
var sanitizer = require("../middleware/sanitizer");


router.use(currentPage);
router.use(methodOverride("_method"));



router.get('/:id', checkSignIn, setCookie, updateBalance, pendingTasks, function(req, res) {
    var id = sanitizer(req.params.id);
    Profile.findById(id).populate({ path: 'subAccounts' }).exec(function(err, user) {
        if (err) {
            return res.redirect('/');
        }
        res.render("newTask", { userProfile: user, page: req.active, pendingTasks: res.locals.pendingTasks });
    });

});

router.post('/:id', checkSignIn, updateBalance, function(req, res) {
    var id = sanitizer(req.params.id);
    var title = sanitizer(req.body.task.title);
    var description = sanitizer(req.body.task.description);
    var acceptor = sanitizer(req.body.task.acceptor);
    var payout = sanitizer(req.body.task.payout);
    /******Creates random hash value for account verification********/
    var crypto = require('crypto');
    var text = 'Activating new User!!!';
    var secret = req.body.task.acceptor;
    var algorithm = 'sha256';
    var hash, hmac;


    hmac = crypto.createHmac(algorithm, secret);
    hmac.write(text); // write in to the stream
    hmac.end(); // can't read from the stream until you call end()
    hash = hmac.read().toString('hex'); // read out hmac digest
    // console.log("Method 1: ", hash);
    /************EOF hash creation*******************/

    // console.log(req.body.task.acceptor); //testing
    Task.create({
        title: title,
        description: description,
        date: new Date(),
        creator: req.session.user._id,
        acceptor: acceptor,
        payout: { amount: payout, status: false },
        status: { active: false, tempHash: hash }
    }, function(err, createdTask) {
        if (err) {
            console.log(err);
        }

        Profile.findById(createdTask.acceptor, function(err, taskAcceptor) {
            if (err)
                console.log(err);
            taskAcceptor.pendingTasks.push(createdTask);
            taskAcceptor.save();

            if (req.body.task.emailAlert == 'send') {

                // Set the region 
                AWS.config.update({ region: ""+process.env.AWS_REGION });

                // Create sendEmail params 
                var params = {
                    Destination: { /* required */
                        ToAddresses: [
                            taskAcceptor.email
                            /* more items */
                        ]
                    },
                    Message: { /* required */
                        Body: { /* required */
                            Html: {
                                Charset: "UTF-8",
                                Data: "<h1>New Task to Review</h1>" +
                                    "<a href='http://" + req.hostname + "/task/review/" + createdTask._id + "/" + hash + "'><p>Click here to view task!</p></a>"
                            },
                        },
                        Subject: {
                            Charset: 'UTF-8',
                            Data: 'PinUp Task Review'
                        }
                    },
                    Source: ""+process.env.EMAIL_CLIENT,
                    /* required */
                    ReplyToAddresses: [
                        ""+process.env.EMAIL_CLIENT
                        /* more items */
                    ],
                };

                // Create the promise and SES service object
                var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

                // Handle promise's fulfilled/rejected states
                sendPromise.then(
                    function(data) {
                        console.log(data.MessageId);
                        console.log('Email sent: ' + data.response);
                        req.session.messages = {message: "Email sent to" + taskAcceptor.firstName};
                        res.redirect("/profile/" + req.session.user._id);
                    }).catch(
                    function(err) {
                        console.error(err, err.stack);
                    });
            }
            else {
                res.redirect("/profile/" + req.session.user._id);
            }


        });

    });

});
router.get("/review/:id/:key", checkSignIn, updateBalance, pendingTasks, function(req, res) {
    var id = sanitizer(req.params.id);
    Task.findById(id).populate({ path: 'creator' }).populate({ path: 'acceptor' }).exec(function(err, taskFound) {
        if (err)
            console.log(err);


        res.render("reviewTask", { reviewTask: taskFound, page: req.active, pendingTasks: res.locals.pendingTasks });

    });
});

router.post("/review/:id/:key", checkSignIn, setCookie, function(req, res) {
    var id = sanitizer(req.params.id);
    var key = sanitizer(req.params.key);

    Task.findById(id).populate({ path: "acceptor" }).populate({ path: "creator" }).exec(function(err, task) {
        if (err) {
            throw err;
        }
        if (req.session.user._id == task.acceptor._id) {

            if (task.status.tempHash === key) {
                Task.update(task, { 'status.active': true }, function(err, updateStatus) { //updates account activation status to true
                    if (err) {
                        throw err;
                    }
                    Task.update(task, { $unset: { 'status.tempHash': "" } }, function(err, updateStatus) { //removes temp hash from table ---activation complete
                        if (err) {
                            console.log(err);
                        }
                    });


                });
                Profile.findById(task.creator._id, function(err, taskCreator) {
                    if (err)
                        console.log(err);
                    taskCreator.createdTasks.push(task);
                    taskCreator.save();
                });

                Profile.findById(task.acceptor._id, function(err, taskAcceptor) {
                    if (err)
                        console.log(err);
                    taskAcceptor.acceptedTasks.push(task);
                    taskAcceptor.save();
                    taskAcceptor.pendingTasks.remove(task);
                    taskAcceptor.save();
                    req.session.user = taskAcceptor;
                });
                res.redirect("/profile/" + req.session.user._id);
            }
            else {
                res.render('error');
            }
        }
        else {
            res.redirect("/profile/" + req.session.user._id);
        }
    });


});

router.delete("/review/:id/:key", checkSignIn, setCookie, function(req, res) {
    var id = sanitizer(req.params.id);
    Task.findById(id).populate({ path: "acceptor" }).exec(function(err, task) {
        if (err) {
            throw err;
        }

        if (req.session.user._id == task.acceptor._id) {


            Profile.findById(task.acceptor._id, function(err, taskDecliner) {
                if (err)
                    console.log(err);

                taskDecliner.pendingTasks.remove(task);
                taskDecliner.save();
            });
            res.redirect("/profile/" + req.session.user._id);
        }
        else {
            res.render('error');
        }

    });


});

router.get("/:userID/:taskID", checkSignIn, setCookie, updateBalance, pendingTasks, function(req, res) {
    var taskID = sanitizer(req.params.taskID);
    Task.findById(taskID).populate({ path: 'creator' }).populate({ path: 'acceptor' }).exec(function(err, taskFound) {
        if (err)
            console.log(err);


        res.render("viewTask", { viewTask: taskFound, page: req.active, pendingTasks: res.locals.pendingTasks });

    });
});

router.delete("/:userID/:taskID", checkSignIn, setCookie, function(req, res) {
    var taskID = sanitizer(req.params.taskID);
    Task.findByIdAndRemove(taskID, function(err, taskFound) {
        if (err)
            console.log(err);


        res.redirect("/profile/" + req.session.user._id);

    });
});

router.put("/:userID/:taskID", checkSignIn, setCookie, function(req, res) {
    var taskID = sanitizer(req.params.taskID);
    var title = sanitizer(req.body.task.title);
    var description = sanitizer(req.body.task.description);
    Task.findByIdAndUpdate(taskID, { title: title, description: description }, function(err, updatedTask) {
        if (err)
            console.log(err);


        res.redirect("/profile/" + req.session.user._id);

    });
});

router.get('/payout/pending/:userID', checkSignIn, updateBalance, pendingTasks, function(req, res) {
    var userID = sanitizer(req.params.userID);
    Profile.findById(userID).exec(function(err, user) {
        if (err) {
            return res.redirect('/');
        }
        res.render("displayPendingPayouts", { userProfile: user, page: req.active, pendingTasks: res.locals.pendingTasks });
    });

});

router.get("/complete/:userID/:taskID", checkSignIn, setCookie, updateBalance, pendingTasks, function(req, res) {
    var taskID = sanitizer(req.params.taskID);
    Task.findById(taskID).populate({ path: 'creator' }).populate({ path: 'acceptor' }).exec(function(err, taskFound) {
        if (err)
            console.log(err);

        res.render("completeTask", { completedTask: taskFound, page: req.active, pendingTasks: res.locals.pendingTasks });
    });
});

router.put("/complete/:userID/:taskID", checkSignIn, setCookie, pendingTasks, function(req, res) {
    var taskID = sanitizer(req.params.taskID);
    Task.findById(taskID).populate({ path: 'creator' }).populate({ path: 'acceptor' }).exec(function(err, taskFound) {
        if (err)
            console.log(err);


        if (req.session.user._id == taskFound.acceptor._id) {

            ///////////
            // Load the SDK for JavaScript
            

            // Set the region 
            AWS.config.update({ region: ""+process.env.AWS_REGION });

            // Create sendEmail params 
            var params = {
                Destination: { /* required */
                    ToAddresses: [
                        taskFound.creator.email
                        /* more items */
                    ]
                },
                Message: { /* required */
                    Body: { /* required */
                        Html: {
                            Charset: "UTF-8",
                            Data: "<h1>Approve payout for task</h1>" +
                                "<h3>" + taskFound.title + "</h3>" +
                                "<h5>Completed By: " + taskFound.acceptor.firstName + " " + taskFound.acceptor.lastName + "</h5>" +
                                "<a href='http://" + req.hostname + "/task/complete/" + taskFound.creator._id + "/" + taskFound._id + "'><p>Click here for payout actions!</p></a>"
                        },
                    },
                    Subject: {
                        Charset: 'UTF-8',
                        Data: 'PinUp Task Payout Approval'
                    }
                },
                Source: ""+process.env.EMAIL_CLIENT,
                /* required */
                ReplyToAddresses: [
                    ""+process.env.EMAIL_CLIENT
                    /* more items */
                ],
            };

            // Create the promise and SES service object
            var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

            // Handle promise's fulfilled/rejected states
            sendPromise.then(
                function(data) {
                    console.log(data.MessageId);
                    console.log('Email sent: ' + data.response);
                    res.redirect("/profile/" + req.session.user._id);
                }).catch(
                function(err) {
                    console.error(err, err.stack);
                });

        }
        Task.update(taskFound, { 'payout.status': true }, function(err, updatedStatus) {
            if (err)
                console.log(err);
        });
        console.log(taskFound);
    });

});

router.post("/complete/:userID/:taskID", checkSignIn, setCookie, pendingTasks, function(req, res) {
    var taskID = sanitizer(req.params.taskID);
    var userID = sanitizer(req.params.userID);
    Task.findById(taskID).populate({ path: 'creator' }).populate({ path: 'acceptor' }).exec(function(err, taskFound) {
        if (err)
            console.log(err);

        if (req.session.user._id == taskFound.creator._id) {

            var sendPayment = require("../middleware/submitPayment");
            sendPayment(taskFound.creator.privateKey, taskFound.acceptor.wallet, '' + taskFound.payout.amount);
            Task.findByIdAndRemove(taskFound._id, function(err, removed) {
                if (err)
                    console.log(err);
                res.redirect("/profile/" + req.session.user._id);

            });
        }

    });
});



router.delete("/complete/:userID/:taskID", checkSignIn, function(req, res) {
    var taskID = sanitizer(req.params.taskID);

    Task.findByIdAndRemove(taskID, function(err, taskFound) {
        if (err)
            console.log(err);

        res.redirect("/profile/" + req.session.user._id);


    });

});

router.all("*", function(req, res) {
    res.redirect('/');
});

module.exports = router;
