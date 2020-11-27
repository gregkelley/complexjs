// this router is specific to api requests. really. just like it is named and stuff.

const apiRouter = require('express').Router()
const userController = require('./controllers/userController');
const postController = require('./controllers/postController');
// const followController = require('./controllers/followController');
const cors = require('cors')

// configure all the routes below this to configure the cross origin resource sharing policy to allow 
// access from any domain
apiRouter.use(cors())

// apiRouter.post('/login', function(req, res) {
//   res.json("Thank you for trying to login from our stupid API")
// })
apiRouter.post('/login', userController.apiLogin)
apiRouter.post('/create-post', userController.apiLoggedIn, postController.apiCreatePost)
apiRouter.delete('/post/:id', userController.apiLoggedIn, postController.apiDeletePost)
apiRouter.get('/postsByAuthor/:username', userController.apiGetPostsByUsername)

module.exports = apiRouter