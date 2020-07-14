// Controller portion of the MVC structure
// saved before clean up

const User = require('../models/User')


exports.login = function(req, res) {
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
      // req.flash('errors', err); // going to display the actual err returned
      console.log('The login error: ', err);

      // error returned is "fail" which is not useful.
      req.flash('errors', "login and/or pw are bogus, man.");
      // need to wait for db update to complete: then redirect to homer page
      req.session.save(()=>{
        res.redirect('/');
      })
    });
}

// traditional callback version of the login procedure
// exports.login = function(req, res) {
//   let user = new User(req.body);
//   user.login(function(loginresult) { // pass the work on to the Model file
//     // func will not be called until the db finishes and returns some shit.
//     res.send(loginresult);
//   });
// }


exports.logout = function(req, res) {
  // 
  req.session.destroy(() => {
    res.redirect('/');
  });  // nuke the cookie in the db
  
}

// user.register is an async function so 
exports.register = function(req, res) {
  // called when a person attempts to register ... something
  // console.log(req.body); // prints our form submit content
  let user = new User(req.body);
  user.register() // this now returns a promise... ho lee fuck. cascading fukin shit storm.
    .then(() => {
      req.session.user = {username: user.data.username}
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
  // if (user.errors.length) {
  //   user.errors.forEach((error)=>{
  //     req.flash('regErrors', error);
  //   })
  //   req.session.save(()=>{
  //     res.redirect('/');
  //   })
  // } else {
  //   res.render('home-dashboard', {username: req.session.user.username})
  //   // res.send("monkeys frew outer my arse.")
  // }
}

// when url is /, ie, home page
exports.home = function(req, res) {
  //
  if(req.session.user) {
    //
    res.render('home-dashboard', {username: req.session.user.username});
  } else {
    // res.render('home-guest', {errors: req.errors.flash.data})
    // the above line works but using the flash pkg deletes the errors obj after we see it once.
    res.render('home-guest', {errors: req.flash('errors'), regErrors: req.flash('regErrors')});
  }
}