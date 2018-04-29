function checkSignIn(req, res, next) { //checks cookie to see if set and user has already logged in
    if (req.session.user) {
        res.locals.user = req.session.user;
        res.locals.id = req.session.user._id;
        next(); //If session exists, proceed to page
    }
    else {
        var err = "Not logged in!";
        console.log(req.session.user);
        // return next(err); //Error, trying to access unauthorized page!
        res.redirect('/');
    }
}

module.exports = checkSignIn;