
const Post = require('../models/Post');

exports.viewCreateScreen = function(req, res) {
    res.render('create-post');
}

exports.createPost = function(req, res) {
  // store the new post in a database or sumptin
  let newPost = new Post(req.body, req.session.user._id);

  // create() returns a Promise
  newPost.create()
      // newId comes from the Post create function. Is pulled from the resolved data from mongodb insert.
      .then(function(newId) {
        // res.send("nude post cremated.")
        req.flash("success", "new post created.")
        req.session.save(() => res.redirect(`/post/${newId}`))
      })
      .catch(function(errors) {
        // res.send(errors);
        errors.forEach(error => req.flash("errors", error))
        req.session.save(() => res.redirect('/create-post'))
      })
}

// API call to create a new post. The data payload includes the title, body and _id of the person who owns the post
exports.apiCreatePost = function(req, res) {
  // store the new post in a database or sumptin
  let newPost = new Post(req.body, req.apiUser._id);

  // create() returns a Promise
  newPost.create()
      // newId comes from the Post create function. Is pulled from the resolved data from mongodb insert.
      .then(function(newId) {
        res.json("nude API post cremated.") // will that work?
      })
      .catch(function(errors) {
        console.log("apiCreatePost has failed.")
        res.json(errors);
      })
}

exports.apiDeletePost = function(req, res) {
  Post.delete(req.params.id, req.apiUser._id)
    .then(() => {
      res.json("Success in the Delete yo mon")
    })
    .catch(() => {
      res.json("not you are permission having butt munch")
    })
}


// big Brad called this viewSingle
exports.viewPost = async function(req, res) {
  try {
    // pass in the userId so we can decide if the edit icon should be enabled
    let post = await Post.findSingleById(req.params.id, req.visitorId);
    res.render('single-post', {post: post});
  } catch {
    res.render('404');
  } 
}

exports.viewEditScreen = async function(req, res) {
  try { 
    // ask Post Model for data in the post
    let post = await Post.findSingleById(req.params.id, req.visitorId);
    // render edit template
    // if (post.authorId == req.visitorId) {
    if (post.isVisitorOwner) {
      res.render("edit-post", {post: post});
    } else {
      req.flash("errors", "Permission you have not.");
      req.session.save(() => res.redirect('/'));
    }
  } catch {
    res.render('404')
  }
}

exports.edit = function(req, res) {
  let post = new Post(req.body, req.visitorId, req.params.id)
  // update() will return a promise
  post.update()
    .then((status) => {
      // post success update
      // or permission but validation error
      if (status == "success") {
        // yay
        req.flash("success", "Successfully Updated.")
        req.session.save(function() {
          res.redirect(`/post/${req.params.id}/edit`)
        })
      } else {
        // user screwed the pooch somehow.
        post.errors.forEach((error) => {
          req.flash("errors", error)
        })
        req.session.save(function() {
          res.redirect(`/post/${req.params.id}/edit`)
        })
      }
    })
    .catch(() => {
      // requested post id not exist or bitch not have ownership.
      req.flash("errors", "Not have permission to hack that, bitch.")
      req.session.save(() => {
        res.redirect("/")
      })
    })
}

exports.delete = function(req, res) {
  Post.delete(req.params.id, req.visitorId)
    .then(() => {
      req.flash("success", 'Post deleted')
      req.session.save(() => res.redirect(`/profile/${req.session.user.username}`))
    })
    .catch(() => {
      req.flash('errors', 'Permission to delete are you not having.');
      // when you use an arrow function all on one line, can leave the curly brakets off:
      req.session.save(() => res.redirect('/'));   // yay
    })
}

exports.search = function(req, res) {
  Post.search(req.body.searchTerm)
    .then((posts)=>{
      res.json(posts)
    })
    .catch(()=>{
      res.json([])
    })
}