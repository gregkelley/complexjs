// Controller portion of the MVC structure
const User = require('../models/User')
const Post = require('../models/Post')

// verify the user is logged in. Going to use this in many places to prevent page access if not logged in.
// the .next() will then move on to the next thing in the router list.
// big Brad called this: mustBeLoggedIn which is totally dumb.
exports.loggedIn = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.flash("errors", "not much logged in spanky.");
    req.session.save(function() {
      res.redirect('/');
    })
  }
}

exports.login = function(req, res) {
  // User object is created here, when User clicks login on login screen to login. 
  let user = new User(req.body);
  
  user.login() // .login() is going to return a promise
    .then(function(result) {
      // session setup. Add new properties to req
      req.session.user = {username: user.data.username, avatar: user.avatar, _id: user.data._id}
      // do not need the save() here because it happens automatically. However, we need to redirect 
      // *after* the save completes. thus:
      req.session.save(() => {
        res.redirect('/');
      })
    })
    .catch(function(err){
      // login failed so redirect to home. Since we don't have a user object, the home() function below
      // can spew an error onto the screen. hlf. yay.
      console.log('The login error: ', err);

      req.flash('errors', "login and/or pw are bogus, man.");
      // need to wait for db update to complete: then redirect to homer page
      req.session.save(()=>{
        res.redirect('/');
      })
    });
}

exports.logout = function(req, res) {
  // 
  req.session.destroy(() => {
    res.redirect('/');
  });  // nuke the cookie in the db
  
}

// user.register is an async function so 
exports.register = function(req, res) {
  // called when a person attempts to register ... something
  let user = new User(req.body);
  user.register() // this now returns a promise... ho lee fuck. cascading fukin shit storm.
    .then(() => {
      req.session.user = {username: user.data.username, avatar: user.avatar, _id: user.data._id}
      req.session.save(()=>{
        res.redirect('/');
      })
    })
    .catch((regErrors)=>{
      regErrors.forEach((error)=>{
        req.flash('regErrors', error);
      })
      req.session.save(()=>{
        res.redirect('/');
      })
    })
}

// when url is /, ie, home page
exports.home = function(req, res) {
  // if user is logged in
  if(req.session.user) {
    // the app.use that sets a local user obj makes passing params unnecessary.
    // res.render('home-dashboard', {username: req.session.user.username, 
    //                               avatar: req.session.user.avatar});
    res.render('home-dashboard');
  } else {
    // res.render('home-guest', {errors: req.errors.flash.data})
    // the above line works but using the flash pkg deletes the errors obj after we see it once.
    // next line, errors removed for streamlining. moved function to app.js
    // res.render('home-guest', {errors: req.flash('errors'), regErrors: req.flash('regErrors')});
    res.render('home-guest', {regErrors: req.flash('regErrors')});
  }
}

// when a user profile is requested. URL looks like: /profile/:username
// so we can get the username from the :params
exports.ifUserExists = function(req, res, next) {
  User.findByUsername(req.params.username)
    .then(function(userDocument) {
      // create a new element on the req object to store what we just magically got
      req.profileUser = userDocument
      next()
    })
    .catch(function() {
      res.render('404')
    })
  
}

exports.profilePostsScreen = function(req, res) {
  // get posts from author. will get this from Post Model blah blah.
  Post.findByAuthorId(req.profileUser._id)
      .then(function(posts) {
        res.render('profile', {
          posts: posts,
          profileUsername: req.profileUser.username,
          profileAvatar: req.profileUser.avatar,
        });
      })
      .catch(function() {
        res.render('404')
      })

}