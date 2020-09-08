// npm run watch

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const markdown = require('marked');
const app = express();
const sanitizeHTML = require('sanitize-html');


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

// middleware thing. 
// app.use is run by express for every request. 
// note that it is *before* the router line.
app.use(function(req, res, next) {
  // make markdown function available from within ejs templates
  res.locals.filterUserHTML = function(content) {
    // use sanitize to remove everything except the items we specify
    return sanitizeHTML (markdown(content), 
      {allowedTags: ['p','br','ul','li','ol','strong','bold','i','h1','h2','h3','h4','em'], allowedAttributes: []});
  }

  // make all error and success flash msgs available to all templates
  res.locals.errors = req.flash("errors");
  res.locals.success = req.flash("success");

  // make current user id available on the req object
  if(req.session.user) {req.visitorId = req.session.user._id} 
  else {req.visitorId = 0}

  // make user session data available from within view templates
  // use this instead of passing session data to an ejs template
  // locals obj is available in ejs templates. can add properties
  res.locals.user = req.session.user;
  next();
})

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