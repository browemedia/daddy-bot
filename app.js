if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const fs = require("fs");
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

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
const twitchchan = ['optiquest21'];

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
    channels: twitchchan,
};

const botclient = new tmi.client(options);

// Connect the client to the server..
botclient.connect();

//Bot says hello on connect
botclient.on('connected', (address, port) => {
  botclient.say(twitchchan[0], `Hi chat! It is currently ` + Date())
});


// Daddy bets
const daddyBetStatus = require('./models/betStatus')
botclient.on('chat', (channel, userstate, message, self) => {
  if(message === '!createbetstatus' && userstate.username === 'optiquest21') {
    var newBetStatus = new daddyBetStatus({name: 'Current Status', status:false});
    newBetStatus.save()
    .then(doc => {
      botclient.say(twitchchan[0], 'New Bet document has been created')
      console.log('New Bet document has been created')
    })
    .catch(err => console.error(err));
  }; 
  if(message === '!deletebetstatus' && userstate.username === 'optiquest21') {
    try {
      daddyBetStatus.deleteMany({}, function (err) {
        if(err){
          console.error(err);
        };
      });
      botclient.say(twitchchan[0], 'Bet document has been deleted')
      console.log("Bet document has been deleted")
    } catch (err) {
      console.error(err)      
    };
  };

  // Open Bets
  if(message === '!openbets' && userstate.username === 'optiquest21') {
    daddyBetStatus.findOne({})
      .exec()
      .then(doc => {
        if(doc.status != true) {
          daddyBetStatus.updateOne({ _id: doc._id }, { $set: {status: true}})
          .exec()
          .then(result => {
            console.log(result);
            console.log(doc.status);
            botclient.say(twitchchan[0], 'Bets are now open!');
          })
          .catch(err => console.error(err));
        } else {
          botclient.say(twitchchan[0], 'Bets are already Open');
        };
        console.log(doc.status);
      })
      .catch(err => console.error(err));
  };

  // Close Bets
  if(message === '!closebets' && userstate.username === 'optiquest21') {
    daddyBetStatus.findOne({})
      .exec()
      .then(doc => {
        if(doc.status != false) {
          daddyBetStatus.updateOne({ _id: doc._id }, { $set: {status: false}})
          .exec()
          .then(result => {
            console.log(result);
            console.log(doc.status);
            botclient.say(twitchchan[0], 'Bets are now closed!');
          })
          .catch(err => console.error(err))
        } else {
          botclient.say(twitchchan[0], 'Bets are already Closed');
        };
      })
      .catch(err => console.error(err));
    };

  // Bet Status
  if(message === '!betstatus') {
    daddyBetStatus.findOne({})
    .then(doc => {
      if(doc.status === true) {
        botclient.say(twitchchan[0], 'Bets are open!')
      } else {
        botclient.say(twitchchan[0], 'Bets are closed!')
      }
    })
    .catch(err => console.error(err));
  };  
});


// Daddy Bets
const daddyBet = require('./models/bets')
botclient.on('chat', (channel, userstate, message, self) => {
  var message = message.trim().split(" ");
  if (message[0] === '!daddy') {
    // WITH COUNT CHECK
    daddyBet.countDocuments({"user":userstate.username})
    .then(count => {
      if(count === 0) {
        console.log(count);
        daddyBetStatus.findOne({})
        .then(doc => {
          if(doc.status != false) {
            try {
              let bet = new daddyBet ({ user: userstate.username, bet: message[1] });
              bet.save();
              botclient.say(twitchchan[0], '@' + userstate.username + ' You have bet for ' + message[1] + ' daddies!');
              console.log('Added ' + userstate.username + `'s bet`);
            } catch (err) {
              console.error(err)
            };
          } else {
            botclient.say(twitchchan[0], '@' + userstate.username + ' Betting has not started')
          };
        })
        .catch(err => console.error(err));
      } else {
        botclient.say(twitchchan[0], '@' + userstate.username + ' You have already placed a bet')
      }
    })
    .catch(err => console.error(err));
    // WITHOUT COUNT CHECK
    // daddyBetStatus.findOne({})
    // .then(doc => {
    //   if(doc.status != false) {
    //     try {
    //       let bet = new daddyBet ({ user: userstate.username, bet: message[1] });
    //       bet.save();
    //       botclient.say(twitchchan[0], '@' + userstate.username + ' You have bet for ' + message[1] + ' daddies!');
    //       console.log('Added ' + userstate.username + `'s bet`);
    //     } catch (err) {
    //       console.error(err)
    //     };
    //   } else {
    //     botclient.say(twitchchan[0], userstate.username + ' Betting has not started')
    //   };
    // })
    // .catch(err => console.error(error));
  };

  //Announce Winners
  if(message[0] === '!winners'){
    daddyBetStatus.findOne({})
    .then(doc => {
      if(doc.status === false) {
        daddyBet.find({"bet":message[1]}, 'user')
        .distinct('user')
        .then(winners => {
          // let bets = JSON.parse(bets)
          var winners = winners.join(' @');
          botclient.say(twitchchan[0], 'The winners are: @' + winners)
          console.log('@' + winners)
        })
        .catch(err => console.error(err));
      } else {
        botclient.say(twitchchan[0], 'Bets have not been closed!')
      }
    })
    .catch(err => console.error(err));
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
      botclient.say(twitchchan[0], 'Bets have been reset')
      console.log("Bets have been reset")
    } catch (err) {
      console.error(err)      
    };
  }
});

// botclient.on('chat', (channel, userstate, message, self) => {
//   if (message === '!test') {
//     daddyBet.countDocuments({"user":userstate.username})
//     .then(count => {
//       if (count != 0) {
//         console.log(`There are`)
//       } else {
//         console.log(`I'm not running`)
//       }
//       console.log(count)
//     })
//     .catch(err => console.error(err));
//   };
// });

module.exports = app;