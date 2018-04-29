var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var session = require('express-session');
var cookieParser = require('cookie-parser');
var passport = require("passport");
var mongoose = require("mongoose");
var createError = require('http-errors');
var logger = require('morgan');
var debug = require('debug')('uml:server');
var http = require('http');
var helmet = require("helmet");
var methodOverride = require("method-override");


var indexRouter = require('./routes/index');
var profileRouter = require('./routes/profile');
var accountRouter = require('./routes/account');
var taskRouter = require('./routes/task');

mongoose.connect('mongodb+srv://group:cmsc495_Group2@cmcs495-a596k.mongodb.net/', { dbName: 'users' });

app.set("view engine", 'ejs');
app.use(cookieParser());
app.use(session({ secret: "Group project CMSC495!" }));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(helmet());
app.use(methodOverride("_method"));


// view engine setup

app.use(logger('dev'));


app.use('/', indexRouter);
app.use('/profile', profileRouter);
app.use('/account', accountRouter);
app.use('/task', taskRouter);
app.disable('x-powered-by');

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

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
  res.render('error', { error: err });
}


/************Clears data from DB********************/
// var Profile = require("./models/profile");
// var User = require("./models/user")
// var Task = require("./models/task");
//  Profile.remove({}, function(err){
//       if(err){
//           console.log(err);
//       }
//       console.log("Profile db cleared");
//  });


//  User.remove({}, function(err){
//       if(err){
//           console.log(err);
//       }
//       console.log("User db cleared");
//  });

//  Task.remove({}, function(err){
//       if(err){
//           console.log(err);
//       }
//       console.log("Task db cleared");
//  });
/****************End of Clearing DB****************/



/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}

app.all("*", function(req, res){
    res.redirect('/');
});

app.all("/profile", function(req, res){
   if(res.session.user){
       res.redirect('/profile/' + res.session.user._id);
   }else{
       res.redirect('/');
   }
});

app.all("/task", function(req, res){
   if(res.session.user){
       res.redirect('/profile/' + res.session.user._id);
   }else{
       res.redirect('/');
   }
});

app.all("/account", function(req, res){
   if(res.session.user){
       res.redirect('/profile/' + res.session.user._id);
   }else{
       res.redirect('/');
   }
});

app.all('/*', function(req, res) {
   res.redirect('/'); 
});