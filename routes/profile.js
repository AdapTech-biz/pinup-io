var express = require('express');
var router = express.Router();
var Profile = require("../models/profile");
var formidable = require('formidable');
var fs = require('fs');
var StellarSdk = require('stellar-sdk');
var isLoggedIn = require('../middleware/loggedIn');
var updateBalance = require('../middleware/updateBalance');
var checkSignIn = require('../middleware/signedIn');
var validUser = require('../middleware/validUser');
var setCookie = require('../middleware/setCookie');
var currentPage = require('../middleware/getCurrentPage');
var methodOverride = require("method-override");
var pendingTasks = require("../middleware/pendingTask");
var sanitizer = require("../middleware/sanitizer");


router.use(currentPage);

router.use(methodOverride("_method"));


/* GET users listing. */
router.get('/:id', isLoggedIn, setCookie, updateBalance, pendingTasks, function(req, res) {
    var id = sanitizer(req.params.id);
    Profile.findById(id).populate({ path: 'subAccounts' }).populate({ path: 'createdTasks', populate: { path: 'acceptor' } }).populate({ path: 'acceptedTasks', populate: { path: 'creator' } }).populate({ path: 'pendingTasks' }).exec(function(err, user) {
        if (err) {
            console.log(err);
            return res.redirect('/'); //invaild profile number used -- redirect to home page
        }
        if (req.session.user) {
            res.locals.user = req.session.user;
            res.locals.id = req.session.user._id;
        }

        if (typeof req.session.messages != 'undefined' && !req.session.messages.get("message").equals(null) ) {

            res.locals.message = req.session.messages.message;
            req.session.messages = null;
            return res.render('profile', { userProfile: user, page: req.active, pendingTasks: res.locals.pendingTasks, message: res.locals.message });
        }
        res.render('profile', { userProfile: user, page: req.active, pendingTasks: res.locals.pendingTasks });
    });

});

router.get('/:id/list/partners',isLoggedIn, checkSignIn, updateBalance, pendingTasks, function(req, res){
    var id = sanitizer(req.params.id);
    Profile.findById(id).populate({ path: 'subAccounts' }).populate({ path: 'createdTasks', populate: { path: 'acceptor' } }).populate({ path: 'acceptedTasks', populate: { path: 'creator' } }).populate({ path: 'pendingTasks' }).exec(function(err, user) {
       if(err)
       console.log(err);
       if (typeof req.session.messages != 'undefined' && !req.session.messages.get("message").equals(null) ) {

            res.locals.message = req.session.messages.message;
            req.session.messages = null;
            return res.render('displayPartnerShips', { userProfile: user, page: req.active, pendingTasks: res.locals.pendingTasks, message: res.locals.message });
        }
       res.render('displayPartnerShips', { userProfile: user, page: req.active, pendingTasks: res.locals.pendingTasks });
    });
    
});

router.get('/:id/upload', checkSignIn, setCookie, validUser, updateBalance, pendingTasks, function(req, res) {
    var id = sanitizer(req.params.id);

    Profile.findById(id, function(err, user) {
        if (err) {
            return res.redirect('/');
        }
        res.render("upload", { userProfile: user, page: req.active, pendingTasks: res.locals.pendingTasks, currentBalance: res.locals.currentBalance });
    });
});

router.post('/:id/upload', checkSignIn, validUser, function(req, res) {
    var id = sanitizer(req.params.id);

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if (err) {
            console.log(err);
        }
        console.log(files);
        var oldpath = files.pic.path;

        fs.readFile(oldpath, function(err, data) {
            if (err) {
                console.log(err);
            }
            var base64data = new Buffer(data).toString('base64');
            Profile.update({ _id: id }, { $set: { picture: { data: base64data, contentType: "image/png" } } }, function(err, updateStatus) {
                if (err) {
                    console.log(err);
                }
                res.redirect('/profile/' + req.user._id); //loads user profile
            });

        });
    });
});

router.post('/:id/subaccounts/minor', checkSignIn, function(req, res, next) { // under 13 years old sub account
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
            var firstName = sanitizer(req.body.childAccount.firstName);
            var lastName = sanitizer(req.body.childAccount.lastName);
            Profile.create({
                firstName: firstName,
                lastName: lastName,
                wallet: publicKey, //wallet address used for transactions and balance updates
                balance: 0,
                privateKey: secret,
            }, function(err, profile) {
                if (err) {
                    console.log(err);
                }
                // console.log(profile);
                var id = sanitizer(req.params.id);
                Profile.findById(id, function(err, sponsor) {
                    if (err) {
                        console.log(err);
                    }
                    sponsor.subAccounts.push(profile);
                    sponsor.save();
                    profile.subAccounts.push(sponsor);
                    profile.save();
                    req.session.messages = {message: "Partnership Created!"};
                    res.redirect('/profile/' + sponsor._id); //loads user profile
                });
            });
        }

    });
});

router.post('/:id/subaccounts/linkaccounts', function(req, res) {
    var existentUser = sanitizer(req.body.existentUser);

    Profile.find({ email: existentUser }, function(err, foundUser) {

        if (err) {
            console.log(err);
            res.redirect(req.get('referer'));
        }

        var id = sanitizer(req.params.id);
        Profile.findById(id, function(err, sponsor) {
            if (err)
                console.log(err);
            sponsor.subAccounts.push(foundUser[0]);
            sponsor.save();
            foundUser[0].subAccounts.push(sponsor);
            foundUser[0].save();
            res.send('/profile/' + sponsor._id); //loads user profile
        });
    });

});

router.all("*", function(req, res) {
    res.redirect('/');
});

module.exports = router;
