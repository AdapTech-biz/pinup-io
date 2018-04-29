var validUser = function(req, res, next) {

    if (req.session.user._id === req.params.id) {
        next(); //If session exists, proceed to page
    }
    else {
        var err = "Not your profile to change!";
        console.log(req.session.user);
        return next(err); //Error, trying to access unauthorized page!
    }
};

module.exports = validUser;