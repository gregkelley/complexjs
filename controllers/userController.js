// Controller portion of the MVC structure
const User = require('../models/User')


exports.login = function(req, res) {
  // User object is created here, when User clicks login on login screen to login. 
  let user = new User(req.body);
  
  user.login() // .login() is going to return a promise
    .then(function(result) {
      // session setup. Add new properties to req
      req.session.user = {username: user.data.username, avatar: user.avatar}
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
      req.session.user = {username: user.data.username, avatar: user.avatar}
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
  //
  if(req.session.user) {
    //
    res.render('home-dashboard', {username: req.session.user.username, 
                                  avatar: req.session.user.avatar});
  } else {
    // res.render('home-guest', {errors: req.errors.flash.data})
    // the above line works but using the flash pkg deletes the errors obj after we see it once.
    res.render('home-guest', {errors: req.flash('errors'), regErrors: req.flash('regErrors')});
  }
}