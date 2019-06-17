if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database
const mongoose = require('mongoose')
mongoose.connect(process.env.DATABASE_URL, {useNewUrlParser: true})
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to Mongoose ' + Date()))

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Twitch Bot
var tmi = require("tmi.js");
var twitchclientid = process.env.TWITCH_CLIENTID;
var twitchuser = process.env.TWITCH_USER;
var twitchpass = process.env.TWITCH_PASS;
const twitchchan = process.env.TWITCH_CHANNEL;

var options = {
    options: {
        debug: true,
        clientId: twitchclientid
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: twitchuser,
        password: twitchpass
    },
    channels: [twitchchan]
};

const botclient = new tmi.client(options);

// Connect the client to the server..
botclient.connect();

//Bot says hello on connect
botclient.on('connected', (address, port) => {
  botclient.say(twitchchan, `I'm ready to collect Daddy bets!`)
});


// Collect Daddy Bets
const daddyBet = require('./models/bets')
botclient.on('chat', (channel, userstate, message, self) => {
  var message = message.trim().split(" ");
  if (message[0] === '!daddy') {
    try {var bet = new daddyBet ({ user: userstate.username, bet: message[1] });
    bet.save();
    } catch (err) {
      console.error(err)
    };
    botclient.say(twitchchan, '@' + userstate.username + ' You have bet for ' + message[1] + ' daddies!');
    console.log('Added ' + userstate.username + `'s bet`);
  }
});

// Reset bets
botclient.on('chat', (channel, userstate, message, self) => {
  if (message === '!resetbets' && userstate.username === 'optiquest21') {
    try {
      daddyBet.deleteMany({}, function (err) {
        if(err){
          console.error(err);
        };
      });
      botclient.say(twitchchan, 'Bets have been reset')
      console.log("Bets have been reset")
    } catch (err) {
      console.error(err)      
    };
  }
});

module.exports = app;