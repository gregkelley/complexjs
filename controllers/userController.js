// Controller portion of the MVC structure
const User = require('../models/User')
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const jwt = require('jsonwebtoken');

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

// API version of bitch logged In yes. Think we need to look at the incoming token for verification. Do 
// you think Brad will essplane this? doubt it.
exports.apiLoggedIn = function(req, res, next) {
  try {
    // verify returns the data that was stored in the token. how ... interesting.
    req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
    next()
  } catch {
    res.json("Sorry, must provide a valid token.")
  }
}


// display info that is the same on several screens. ie, Follow links and shit.
// will be called from the route.js sequences
exports.sharedProfileData = async function(req, res, next) {
  let isFollowing = false
  // req.iAmMe = req.profileUser._id == req.visitorId
  req.iAmMe = false
  if(req.session.user) {
    // set a boolean to note if you are looking at your own profile. Thus not display the Follow button.
    req.iAmMe = req.profileUser._id.equals( req.session.user._id)
    isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
  }

  req.isFollowing = isFollowing

  // retrieve counts: posts, followers, following
  // this method is inefficient, these calls are independent so they all need to be launched and then wait.
  // let postCount = await Post.countPostsByAuthor(req.profileUser._id)
  // let followerCount = await Follow.countFollowersById(req.profileUser._id)
  // let followingCount = await Follow.countFollowingById(req.profileUser._id)

  let postCountP = Post.countPostsByAuthor(req.profileUser._id)
  let followerCountP = Follow.countFollowersById(req.profileUser._id)
  let followingCountP =  Follow.countFollowingById(req.profileUser._id)

  let [postCount, followerCount, followingCount] =
      await Promise.all([postCountP, followerCountP, followingCountP])
  req.postCount = postCount
  req.followerCount = followerCount
  req.followingCount = followingCount

  next()   // profilePostsScreen
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
exports.home = async function(req, res) {
  // if user is logged in
  if(req.session.user) {
    // fetch feed of posts for current user
    let posts = await Post.getFeed(req.session.user._id)

    // the app.use that sets a local user obj makes passing params unnecessary.
    // res.render('home-dashboard', {username: req.session.user.username, 
    //                               avatar: req.session.user.avatar});
    res.render('home-dashboard', {posts: posts});
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

// display posts from some particular user profile. or sumptin
exports.profilePostsScreen = function(req, res) {
  // get posts from author. will get this from Post Model blah blah.
  Post.findByAuthorId(req.profileUser._id)
      .then(function(posts) {
        res.render('profile', {
          currentPage: "posts",
          posts: posts,
          profileUsername: req.profileUser.username,
          profileAvatar: req.profileUser.avatar,
          isFollowing: req.isFollowing,
          iAmMe: req.iAmMe,
          counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
        })
      })
      .catch(function() {
        res.render('404')
      })

}

// when clicky on Followers button thing
exports.profileFollowersScreen = async function(req, res) {
  try {
      // get an array of users who are followed by the current user
      let followers = await Follow.getFollowersById(req.profileUser._id)
      res.render('profile-followers', {
        currentPage: "followers",
        followers: followers,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        iAmMe: req.iAmMe,   // isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
      })
  } catch {
    res.render('404')
  }
}

// when clicky on Following button thing
exports.profileFollowingScreen = async function(req, res) {
  try {
      // get an array of users who are followed by the current user
      let following = await Follow.getFollowingById(req.profileUser._id)
      res.render('profile-following', {
        currentPage: "following",
        followers: following,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        iAmMe: req.iAmMe,   // isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
      })
  } catch {
    res.render('404')
  }
}

// API functions

exports.apiLogin = function(req, res) {
  let user = new User(req.body);
  user.login() // .login() is going to return a promise
    .then(function(result) {
      // send a JSON web token back
      // id: whatever data we need to return, secret phrase, expiration time frame. default
      // is to never expire. ex: 7d, 30d, 120s, etc.
      res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '30m'}))
    })
    .catch(function(err){
      console.log('The API login error: ', err);
      res.json("your login failed all up in that booty")
    });
}

exports.apiGetPostsByUsername = async function(req, res) {
  try {
    let authorDoc = await User.findByUsername(req.params.username)
    let posts = await Post.findByAuthorId(authorDoc._id)
    res.json(posts)
  } catch {
    res.json("Sorry padwan. That user is not of exist.")
  }
}