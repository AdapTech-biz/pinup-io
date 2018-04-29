var Profile = require("../models/profile");

//middleware to check if user activated account yet
function isAccountActivated(req, res, next) {
    Profile.find({ email: req.body.username, 'status.active': { $eq: true } }, function(err, match) { //looks for true value in status active field
        if (err) {
            next(err);
        }
        // console.log(match);
        next();

    });
}

module.exports = isAccountActivated;