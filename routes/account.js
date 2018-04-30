var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var Profile = require("../models/profile");
var User = require("../models/user");
var StellarSdk = require('stellar-sdk');
var passport = require("passport");
var LocalStrategy = require("passport-local");
var methodOverride = require("method-override");
var isAccountActivated = require('../middleware/accountActivated');
var sanitizer = require("../middleware/sanitizer");
var currentPage = require("../middleware/getCurrentPage");

router.use(currentPage);
router.use(methodOverride("_method"));



function logErrors (err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function clientErrorHandler (err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' });
  } else {
    next(err);
  }
}

function errorHandler (err, req, res, next) {
  res.status(500);
  res.render('error', { error: err, message: "Something went wrong" });
}



passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

router.use(logErrors);
router.use(clientErrorHandler);
router.use(errorHandler);

router.get('/login', function(req, res) {
    var message = sanitizer(req.session.messages.message);
    try{
    res.render('login', { message: message, lockout: req.session.messages.lockout, page: req.active });
    }catch (e) {
        return res.redirect('/');
    }
});

//below log in check is made to see if user has activated account
router.post("/login", isAccountActivated, function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            var username = sanitizer(req.body.username);
            User.findByUsername(username, function(err, foundUser) {
                if (err)
                    console.log(err);
                if (foundUser) { //user name exist but failed login
                    User.update(foundUser, { $inc: { 'failedLogIns.attempts': 1 } }).exec();
                    foundUser.save();
                    var message;

                    if (foundUser.failedLogIns.attempts > 3) {
                       foundUser.failedLogIns.isLocked=true;
                        foundUser.save();
                        if (foundUser.failedLogIns.isLocked) {
                            message = "User account locked out excessive failed log in attempts!";

                        }
                        else {
                            message = "Incorrect login information provided!";

                        }
                        req.session.messages = { message: message, lockout: foundUser.failedLogIns.isLocked };
                        return res.redirect('/account/login'); //redirect to login page
                    }
                    else {
                        message = "Incorrect login information provided!";
                        req.session.messages = { message: message, lockout: foundUser.failedLogIns.isLocked };
                        return res.redirect('/account/login'); //redirect to login page

                    }
                    // console.log("failed login", foundUser.failedLogIns.attempts + " " + foundUser.firstName);

                }

                else {var message = 'Incorrect Log In';
                    req.session.messages = message;
                    return res.redirect('/');
                }

            });
        }
        else {
            req.logIn(user, function(err) {
                if (err) { return next(err); }
                if (!user.failedLogIns.isLocked) {
                    Profile.findById(user._id).populate({ path: 'pendingTasks' }).exec(function(err, profile) {
                        if (err) {
                            console.log(err);
                        }
                        req.session.user = profile;
                        return res.redirect('/profile/' + profile._id); //loads user profile

                    });
                }
                else {
                    var message = "Account is currrently locked, sorry!";
                    req.session.messages = { message: message, lockout: user.failedLogIns.isLocked };
                    return res.redirect('/account/login'); //redirect to login pag
                }
            });
        }
    })(req, res, next);
});


router.get('/logout', function(req, res) {
    req.session.destroy(function() {
        console.log("user logged out.");
    });
    res.redirect('/');
});

router.get('/:id/recover/:token', function(req, res) {
    var id = sanitizer(req.params.id);
    var token = sanitizer(req.params.token);
    User.findById(id, function(err, user) {
       if(err)
        console.log(err);
    if(user.recovery.recoveryToken === token && user.recovery.tokenExpire > Date.now()){
        try{
        res.render('passwordRecovery', {recoveryID: user._id, page: req.active} );
        }catch (e) {
            return res.redirect('/');
        }
    }else{
        var message = "Recovery Token Invaild -- Retry Reset";
        req.session.messages = message;
        res.redirect('/');
    }
        
    });
});

router.put('/:id/recover', function(req, res){
   var id = sanitizer(req.params.id);
   var newPasswordString = sanitizer(req.body.newPassword);
   User.findById(id, function(err, user) {
      if(err)
        console.log(err);
        user.setPassword(newPasswordString, function(){
            user.save();
            res.send('/');
   });

});
});

router.post('/:id/recover', function(req, res) {
       var id = sanitizer(req.params.id);
    User.findById(id, function(err, user) {
        if (err)
            console.log(err);
       
            var crypto = require('crypto');
            var text = user.username;
            var hashSecret = '' + new Date();
            var algorithm = 'sha256';
            var hash, hmac;


            hmac = crypto.createHmac(algorithm, hashSecret);
            hmac.write(text); // write in to the stream
            hmac.end(); // can't read from the stream until you call end()
            hash = hmac.read().toString('hex'); // read out hmac digest
            var recoveryToken = hash.substring(0, 12);
            var expires = Date.now() + 900000; //15 mins
            
            User.update(user, {$set: {'recovery.recoveryToken': recoveryToken, 'recovery.tokenExpire': expires}}, function(err, updateStatus) {
                if(err)
                    console.log(err);
                    user.save();
            })
            

            // Set the region 
            AWS.config.update({ region: 'us-east-1' });

            // Create sendEmail params 
            var params = {
                Destination: { /* required */
                    ToAddresses: [
                        user.username
                        /* more items */
                    ]
                },
                Message: { /* required */
                    Body: { /* required */
                        Html: {
                            Charset: "UTF-8",
                            Data: "<h1>Reset PinUp Account Password</h1>" +
                                "<a href='http://" + req.hostname + "/account/" + user._id + "/recover/" +recoveryToken+"'><p>Click Here To Reset Password!</p></a>"
                        },
                    },
                    Subject: {
                        Charset: 'UTF-8',
                        Data: 'PinUp Account Reset'
                    }
                },
                Source: 'customer-support@pinup.awsapps.com',
                /* required */
                ReplyToAddresses: [
                    'customer-support@pinup.awsapps.com'
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

                }).catch(
                function(err) {
                    console.error(err, err.stack);
                });
        

    });
        req.session.messages = {message: "Password Reset Email Sent!"};
    res.send('/'); 
});

router.post('/:id/helpUnlock', function(req, res) {
    var id = sanitizer(req.params.id);
    User.findById(id, function(err, user) {
        if (err)
            console.log(err);
        if (user.failedLogIns.isLocked) {
            var crypto = require('crypto');
            var text = user.username;
            var hashSecret = '' + new Date();
            var algorithm = 'sha256';
            var hash, hmac;


            hmac = crypto.createHmac(algorithm, hashSecret);
            hmac.write(text); // write in to the stream
            hmac.end(); // can't read from the stream until you call end()
            hash = hmac.read().toString('hex'); // read out hmac digest
            var temp = hash.substring(0, 8);
            var expires = Date.now() + 3600000; //1 hour
            User.update(user, { 'failedLogIns.tempPassword': temp, 'failedLogIns.tempPasswordExpires':expires }).exec();
            user.failedLogIns.isLocked=true;
            user.save();
            // Set the region 
            AWS.config.update({ region: 'us-east-1' });

            // Create sendEmail params 
            var params = {
                Destination: { /* required */
                    ToAddresses: [
                        user.username
                        /* more items */
                    ]
                },
                Message: { /* required */
                    Body: { /* required */
                        Html: {
                            Charset: "UTF-8",
                            Data: "<h1>Unlock PinUp Account</h1>" +
                                "<p> Use temporary Password on next login: <strong>" + temp + "</strong></p>" +
                                "<a href='http://" + req.hostname + "/account/" + user._id + "/emailUnlocker'><p>Click here to Unlock!</p></a>"
                        },
                    },
                    Subject: {
                        Charset: 'UTF-8',
                        Data: 'PinUp Account Unlock'
                    }
                },
                Source: 'customer-support@pinup.awsapps.com',
                /* required */
                ReplyToAddresses: [
                    'customer-support@pinup.awsapps.com'
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

                }).catch(
                function(err) {
                    console.error(err, err.stack);
                });
        }

    });
    req.session.messages = {message: "Email Sent!"};
    res.send('/');

});

router.get('/:id/emailUnlocker', function(req, res) {
    var id = sanitizer(req.params.id);
    User.findById(id, function(err, user) {
        if (err) {
            console.log(err);
        }
        if(user.failedLogIns.isLocked){
            try {
                res.render('unlockAccount', {user: user, page: req.active});
            }catch (e) {
                res.redirect('/');
            }
        }else res.redirect('/');
    });
});

router.post('/:id/emailUnlocker', function(req, res) {
    var tempPassword = sanitizer(req.body.tempPass);
    var id = sanitizer(req.params.id);
    User.findById(id, function(err, user) {
        if (err)
            console.log(err);
        if(user.failedLogIns.isLocked){
        var time = Date.now();
        if (user.failedLogIns.tempPassword == tempPassword && user.failedLogIns.tempPasswordExpires > time) {

                user.failedLogIns.attempts = 0;
                user.failedLogIns.isLocked=false;
                user.failedLogIns.tempPassword="";
                user.failedLogIns.tempPasswordExpires="";
                user.save();
                
            return res.redirect('/');
        } else{
            try {
                return res.render('unlockAccount', {
                    user: user,
                    page: req.active,
                    message: "Invaild temporary password provided!"
                });
            }catch (e) {
                res.redirect('/');
            }
        }
    }else return res.redirect('/');
    });
});

//Route for new user registration
router.post('/signup', function(req, res) {
    /************Data Sanitize**********************/
    var passwordChecker = require("../middleware/passwordChecker");
    
    var email = sanitizer(req.body.email);
    var password = sanitizer(req.body.password);
    var fName = sanitizer(req.body.fName);
    var lName = sanitizer(req.body.lName);
    var DOB = sanitizer(req.body.DOB);
    
    if(!passwordChecker(password)){
        req.session.messages = {message: "Sorry, the password Provide is too weak!"};
        res.redirect('/');
    }else{

    //uses passport.js to hash login information and stored info into MongoDB table for later log in use
    User.register(new User({ username: email, 'failedLogIns.attempts': 0, 'failedLogIns.isLocked': false }), password, function(err, user) {
        if (err) {
            console.log(err);
            return res.render('home');
        }


        var pair = StellarSdk.Keypair.random();
        var publicKey = pair.publicKey(); //generates public and private key pair for lumen wallet
        var secret = pair.secret();

        // generates a wallet balance from Stellar test network
        var request = require('request');
        request.get({
            url: 'https://friendbot.stellar.org',
            qs: { addr: publicKey },
            json: true
        }, function(error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error('ERROR!', error || body);
            }
            else {
                console.log('SUCCESS! You have a new account :)\n', body);
                /******Creates random hash value for account verification********/
                var crypto = require('crypto');
                var text = 'Activating new User!!!';
                var hashSecret = email;
                var algorithm = 'sha256';
                var hash, hmac;


                hmac = crypto.createHmac(algorithm, hashSecret);
                hmac.write(text); // write in to the stream
                hmac.end(); // can't read from the stream until you call end()
                hash = hmac.read().toString('hex'); // read out hmac digest
                // console.log("Method 1: ", hash);
                /************EOF hash creation*******************/

                //create profile document for MongoDB
                Profile.create({
                    _id: user._id,
                    firstName: fName,
                    lastName: lName,
                    DOB: DOB,
                    email: email,
                    wallet: publicKey, //wallet address used for transactions and balance updates
                    balance: 0,
                    privateKey: secret,
                    status: { active: false, tempHash: hash }
                }, function(err, profile) {
                    if (err) {
                        console.log(err);
                    }
                    /************Email notification--Account Activation Email*************/

                    // Set the region 
                    AWS.config.update({ region: 'us-east-1' });

                    // Create sendEmail params 
                    var params = {
                        Destination: { /* required */
                            ToAddresses: [
                                email
                                /* more items */
                            ]
                        },
                        Message: { /* required */
                            Body: { /* required */
                                Html: {
                                    Charset: "UTF-8",
                                    Data: "<h1>Activate Your New Account</h1>" +
                                        "<a href='http://" + req.hostname + "/account/activation/" + profile._id + "/" + hash + "'><p>Click here to activate!</p></a>"
                                },
                            },
                            Subject: {
                                Charset: 'UTF-8',
                                Data: 'PinUp Account Activation'
                            }
                        },
                        Source: 'customer-support@pinup.awsapps.com',
                        /* required */
                        ReplyToAddresses: [
                            'customer-support@pinup.awsapps.com'
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

                        }).catch(
                        function(err) {
                            console.error(err, err.stack);
                        });

                });
            }
        });
    });
    req.session.messages = {message: "Email Verification Sent!"};
    res.redirect("/");
}
});

router.get("/activation/:id/:key", function(req, res) {
    var id = sanitizer(req.params.id);
    var key = sanitizer(req.params.key);
    Profile.findById(id, function(err, profile) {
        if (err) {
            throw err;
        }
        if (profile.status.tempHash === key) {
            Profile.update(profile, { 'status.active': true }, function(err, updateStatus) { //updates account activation status to true
                if (err) {
                    throw err;
                }
                Profile.update(profile, { $unset: { 'status.tempHash': "" } }, function(err, updateStatus) { //removes temp hash from table ---activation complete
                    if (err) {
                        console.log(err);
                    }
                    res.render('activated');
                });
            });
        }
        else {
            res.render('error');
        }
    });

});

router.get("/lookup/:email", function(req, res) {
    var email = sanitizer(req.params.email);
    Profile.find({ email: email }, function(err, results) {
        if (err)
            console.log(err);
        console.log(results);
        res.send(results);

    });
});

router.post("/invite", function(req, res) {
    var sponsor = sanitizer(req.body.sponsor);
    var inviteEmail = sanitizer(req.body.inviteEmail);
    Profile.findById(sponsor, function(err, profile) {
        if (err)
            console.log(err);

        // Set the region 
        AWS.config.update({ region: 'us-east-1'});

        // Create sendEmail params 
        var params = {
            Destination: { /* required */
                ToAddresses: [
                    inviteEmail
                    /* more items */
                ]
            },
            Message: { /* required */
                Body: { /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: "<h1>Invite to Join PinUp </h1>" +
                            "<h3>Invited By:" + profile.firstName + " " + profile.lastName + "</h3>" +
                            "<a href='http://" + req.hostname + "/account/register/" + sponsor + "'><p>Click here to register your new account!</p></a>"
                    },
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'PinUp Account Invite'
                }
            },
            Source: 'customer-support@pinup.awsapps.com',
            /* required */
            ReplyToAddresses: [
                'customer-support@pinup.awsapps.com'
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
            req.session.messages = {message: "Email Invite Sent!"};
            }).catch(
            function(err) {
                console.error(err, err.stack);
            });
    });
    res.send('/profile/' + req.session.user._id);

});

router.get("/register/:sponsorID", function(req, res) {
    var sponsorID = sanitizer(req.params.sponsorID);

    try {
        res.render("register", {sponsorID: sponsorID});
    }catch (e) {
        res.redirect('/');
    }

});

router.post("/register/:sponsorID", function(req, res) {
    var email = sanitizer(req.body.email);
    var password = sanitizer(req.body.password);
    var fName = sanitizer(req.body.fName);
    var lName = sanitizer(req.body.lName);
    var DOB = sanitizer(req.body.DOB);
    var sponsorID = sanitizer(req.params.sponsorID);
    //uses passport.js to hash login information and stored info into MongoDB table for later log in use
    User.register(new User({ username: email }), password, function(err, user) {
        if (err) {
            console.log(err);
            return res.render('home');
        }

        var pair = StellarSdk.Keypair.random();
        var publicKey = pair.publicKey(); //generates public and private key pair for lumen wallet
        var secret = pair.secret();

        // generates a wallet balance from Stellar test network
        var request = require('request');
        request.get({
            url: 'https://friendbot.stellar.org',
            qs: { addr: publicKey },
            json: true
        }, function(error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error('ERROR!', error || body);
            }
            else {
                console.log('SUCCESS! You have a new account :)\n', body);
                /******Creates random hash value for account verification********/
                var crypto = require('crypto');
                var text = 'Activating new User!!!';
                var hashSecret = email;
                var algorithm = 'sha256';
                var hash, hmac;


                hmac = crypto.createHmac(algorithm, hashSecret);
                hmac.write(text); // write in to the stream
                hmac.end(); // can't read from the stream until you call end()
                hash = hmac.read().toString('hex'); // read out hmac digest
                // console.log("Method 1: ", hash);
                /************EOF hash creation*******************/

                //create profile document for MongoDB
                Profile.create({
                    _id: user._id,
                    firstName: fName,
                    lastName: lName,
                    DOB: DOB,
                    email: email,
                    wallet: publicKey, //wallet address used for transactions and balance updates
                    balance: 0,
                    privateKey: secret,
                    status: { active: false, tempHash: hash }
                }, function(err, profile) {
                    if (err) {
                        console.log(err);
                    }

                    Profile.findById(sponsorID, function(err, sponsor) {
                        if (err) {
                            console.log(err);
                        }
                        sponsor.subAccounts.push(profile);
                        sponsor.save();
                        profile.subAccounts.push(sponsor);
                        profile.save();

                    });

                    /************Email notification--Account Activation Email*************/


                    // Set the region 
                    AWS.config.update({ region: 'us-east-1' });

                    // Create sendEmail params 
                    var params = {
                        Destination: { /* required */
                            ToAddresses: [
                                email
                                /* more items */
                            ]
                        },
                        Message: { /* required */
                            Body: { /* required */
                                Html: {
                                    Charset: "UTF-8",
                                    Data: "<h1>Activate Your New Account</h1>" +
                                        "<a href='http://" + req.hostname + "/account/activation/" + profile._id + "/" + hash + "'><p>Click here to activate!</p></a>"
                                },
                            },
                            Subject: {
                                Charset: 'UTF-8',
                                Data: 'PinUp Account Activation'
                            }
                        },
                        Source: 'customer-support@pinup.awsapps.com',
                        /* required */
                        ReplyToAddresses: [
                            'customer-support@pinup.awsapps.com'
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

                        }).catch(
                        function(err) {
                            console.error(err, err.stack);
                        });

                });
            }
        });
    });
    res.redirect("/");
});

router.all("*", function(req, res) {
    res.redirect('/');
});

module.exports = router;
