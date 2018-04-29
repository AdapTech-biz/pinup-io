var Profile = require("../models/profile");
var StellarSdk = require('stellar-sdk');

var updateBalance = function(req, res, next) {
  
 Profile.findById(res.locals.user, function(err, user) {
        if (err) {
            return res.redirect("/");
        }
        //retrives the lumens balance using the public key from user profile information
        var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
        server.loadAccount(user.wallet).then(function(account) {
            Profile.update({ _id: user._id }, { $set: { balance: parseFloat(account.balances[0].balance) } }, function(err, updatedUser) {
                if (err) {
                    console.log(err);
                }
                res.locals.currentBalance = parseFloat(account.balances[0].balance);
                next();

            });

        });
    });

};

module.exports = updateBalance;