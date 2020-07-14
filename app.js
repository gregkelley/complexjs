// npm run watch

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const app = express();

// configuration of a session
let sessionOptions = session({
  secret: "TheSecretPhrase",  // should be an un-guessable pw type string
  store: new MongoStore({client: require('./db')}), 
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true} // timeout - one day
})
app.use(sessionOptions);
app.use(flash());

const router = require('./router');

// set up the app receive data in the two most common methods
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// make the public folder great again.
app.use(express.static('public'));

// set the views option (1st param) to be /views (the folder, 2nd param)
app.set('views', 'views')
app.set('view engine', 'ejs') // use ejs engine for html templates

// app.get('/', function(req, res) {
//   res.render('home-guest')   // pulls in the ejs file
// })
app.use('/', router);

// app.listen(3000);
// we have to export ourself cuz another file is going to start listening after we
// actually connect to the db. 
module.exports = app;