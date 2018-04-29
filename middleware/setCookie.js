var setCookie = function (req, res, next) {

    if (req.session.user) {
        res.locals.user = req.session.user;
        res.locals.id = req.session.user._id;
    }
    next();
};
module.exports = setCookie;