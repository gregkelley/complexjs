const express = require('express');
const router = express.Router();
const userController = require('./controllers/userController');
const postController = require('./controllers/postController');
const followController = require('./controllers/followController');

// router.get('/', function(req, res) {
//   res.render('home-guest');
// });

// user related routes
router.get('/', userController.home);
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);

// profile routes
router.get('/profile/:username', userController.ifUserExists, 
        userController.sharedProfileData, userController.profilePostsScreen);
router.get('/profile/:username/followers', userController.ifUserExists, 
        userController.sharedProfileData, userController.profileFollowersScreen);
router.get('/profile/:username/following', userController.ifUserExists, 
        userController.sharedProfileData, userController.profileFollowingScreen);

// post related routes
router.get('/create-post', userController.loggedIn, postController.viewCreateScreen);
router.post('/create-post', userController.loggedIn, postController.createPost);

router.get('/post/:id', postController.viewPost);
router.get('/post/:id/edit', userController.loggedIn, postController.viewEditScreen);
router.post('/post/:id/edit', userController.loggedIn, postController.edit);
router.post('/post/:id/delete', userController.loggedIn, postController.delete);

// request coming from the frontend search function (javascript)
router.post('/search', postController.search)

// follow related routes
router.post('/addFollow/:username', userController.loggedIn, followController.addFollow)
router.post('/removeFollow/:username', userController.loggedIn, followController.removeFollow)

module.exports = router;