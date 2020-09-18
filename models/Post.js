// create posts as submitted by users and stuff.
const postsCollection = require('../db').db().collection("posts");
const followsCollection = require('../db').db().collection('follows')

// in mongo user ids are stored as a special data type so:
const ObjectID = require('mongodb').ObjectID
const User = require('./User');
const sanitizeHTML = require('sanitize-html');

let Post = function(data, userID, requestedPostId) {
  this.data = data
  this.errors = []
  this.userid = userID
  this.requestedPostId = requestedPostId
}

Post.prototype.validate = function() {
  if(this.data.title == "") {this.errors.push("title required")}
  if(this.data.body == "") {this.errors.push("content required")}
}

Post.prototype.cleanUp = function() {
  if(typeof(this.data.title) != "string") {this.data.title = ""}
  if(typeof(this.data.body) != "string") {this.data.body = ""}

  // remove bad properties by picking out the only things we want.
  this.data = {
    title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes: []}),
    body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes: []}),
    createdDate: new Date(),
    author: ObjectID(this.userid)
  }
}

// lesson 80. modify to resolve with the id of the newly created post
Post.prototype.create = function() {
  // need to return a Promise
  return new Promise((resolve, reject) => {
    this.cleanUp();
    this.validate();

    if(this.errors.length < 1) {
      // super green
      // insertOne returns a promise. we could do asynch await which makes sense if we are doing
      // many things. For simple operations, .then().catch() is sufficient
      postsCollection.insertOne(this.data)
          // lesson 80. when MongoDB resoves, it does so with a bunch of information. thus (info) =>
          .then((info) =>{
            console.log("post created");
            // use the mongodb info here to find the new post id. The _id that we find will be returned to the caller
            //  which is postController.create
            resolve(info.ops[0]._id);
          })
          .catch(() => {
            this.errors.push("Mongo failed, sent error, server puke. epic fail. pffftth.")
          })
    } else {
      reject(this.errors);
    }
  })
}

Post.prototype.update = function() {
  return new Promise(async(resolve, reject) => {
    try {
      let post = await Post.findSingleById(this.requestedPostId, this.userid)
      if (post.isVisitorOwner) {
        // actually update the db
        let status = await this.actuallyUpdate()
        resolve(status)
      } else {
        reject()
      } 
    } catch {
      reject()
    }
  })
}

Post.prototype.actuallyUpdate = function() {
  return new Promise(async (resolve, reject) => {
    this.cleanUp()
    this.validate()
    if(!this.errors.length) {
      await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)},
                                  {$set: {title: this.data.title, body: this.data.body}})
      resolve("success")
    } else {
      resolve("failure")
    }
  })
}

// factored out some code to eliminate duplication. 
// big Brad name this: reusablePostQuery
Post.postQuery = function(uniqueOperations, visitorId) {
  // console.log('postQuery ' + visitorId)
  return new Promise(async function(resolve, reject) {
    let aggOperations = uniqueOperations.concat([
      // select from users where posts.author == users._id
      // local as in posts table since this is postController. Foreign being the other table, users.
      // as: "authorDoc" -- 
      // Brad says: it is a virtual field added to the current post object... well fuck me.
      {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
      // spell out which fields we want to return
      {$project: {
        title: 1,  // 1=== yes, do include this field.
        body: 1,
        createdDate: 1,
        authorId: "$author", // $ indicates the actual field in mongodb, not a text string.
        author: {$arrayElemAt: ["$authorDocument", 0]} // the obj returned from $lookup. Gets overwritten below
      }}
    ])

    // look up a particular post in the db and retrieve
    // .aggregate takes an array of db operations
    // project: spell out the fields we want the object to have. Without this, we just get the whole object
    // title: 1,  // 1 means true or yes or some shit
    let posts = await postsCollection.aggregate(aggOperations).toArray()

    // pick out the author items that we need.
    posts = posts.map(function(post) {
      // create a property of isVisitorOwner that can be leveraged to check if the user has permission for stuff.
      post.isVisitorOwner = post.authorId.equals(visitorId);

      // hlf. Don't want to leak unnecessary info so we need to get rid of authorId at this juncture. L87, end.
      post.authorId = undefined   // just overwrite it so the info is not available on the front end

      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar
      }
      return post;
    })
    resolve(posts);
  })
}

// 
Post.findSingleById = function(id, visitorId) {
  return new Promise(async function(resolve, reject) {
    // first, validate incoming ID
    if (typeof(id) != "string" || !ObjectID.isValid(id)) {
      reject();
      return;
    }

    let posts = await Post.postQuery([
      {$match: {_id: new ObjectID(id)}}
    ], visitorId)

    // if more than zero items then:
    if (posts.length) {
      console.log(posts[0]);
      resolve(posts[0]);
    } else { reject() }

  })
}

Post.findByAuthorId = function(authorId) {
  return Post.postQuery([
    {$match: {author: authorId}},
    {$sort: {createdDate: -1}}  // sort descending order
  ])
}

// a luser has asked to delete one of their posts. yay!
Post.delete = function(postId, currentUserId) {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(postId, currentUserId)
      if(post.isVisitorOwner) {
        // actually delete the post obj
        await postsCollection.deleteOne({_id: new ObjectID(postId)})
        resolve()
      } else {
        // someone is trying to delete a post they do not own
        reject()
      }
    } catch {
      // db error of some kind.
      reject()
    }
  })
}

Post.search = function(searchTerm) {
  return new Promise(async (resolve, reject) => {
    console.log('Post.search')
    if(typeof(searchTerm) == "string") {
      let posts = await Post.postQuery([
        // looking for the searchTerm anywhere in the string
        {$match: {$text: {$search: searchTerm}}},
        {$sort: {score: {$meta: "textScore"}}}
      ])
      resolve(posts)
    } else {
      reject()
    }
  })
}

Post.countPostsByAuthor = function(id) {
  return new Promise(async(resolve, reject) => {
    let postCount = await postsCollection.countDocuments({author: id})
    resolve(postCount)
  })
}

Post.getFeed = async function(id) {
  // get an array of users we follow with posts
  let followedUsers = await followsCollection.find({authorId: new ObjectID(id)}).toArray()
  // sort out just the followedUsers ids from the list of objects returned
  followedUsers = followedUsers.map(function(followDoc) {
    return followDoc.followedId
  })
  // look for posts where author is in the array
  return Post.postQuery([
    {$match: {author: {$in: followedUsers}}},
    {$sort: {createdDate: -1}} // sort w/ newest at top
  ])
}
module.exports = Post;
