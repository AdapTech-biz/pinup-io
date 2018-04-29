var isLoggedIn = function(req, res, next) {

    if (req.session.user) {
        next(); //If session exists, proceed to page
    }
    else {
        res.redirect('/');
    }
};

module.exports = isLoggedIn;