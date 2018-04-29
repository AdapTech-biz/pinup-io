var currentPage = function (req, res, next) {

    req.active = req.baseUrl.split("/")[1] // [0] will be empty since routes start with '/'
    next();
};
module.exports = currentPage;