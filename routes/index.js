var express = require('express');
var router = express.Router();


/* GET home page. */
router.get("/",  function(req, res) {
     if(req.session.user){
        res.locals.user = req.session.user;
    }
    if(typeof req.session.messages !== 'undefined'){
        res.locals.message = req.session.messages.message;
        req.session.messages = null;
        try{
        return res.render('home', {message: res.locals.message});
        }catch (e) {
            return res.redirect('/');
        }
    }
    try{
    res.render('home');
    }catch (e) {
        return res.redirect('/');
    }
});


module.exports = router;
