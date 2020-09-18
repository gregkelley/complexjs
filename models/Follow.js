// Model sections are for the database portion of the program. The data "model" so to speak

const { ObjectID } = require('mongodb').ObjectID;
const User = require('./User')
const usersCollection = require('../db').db().collection('users')
const followsCollection = require('../db').db().collection('follows')

let Follow = function(followedUsername, authorId) {
  this.followedUsername = followedUsername;
  this.authorId = authorId;
  this.errors = []
}

// any time crap shows up from the front end must strip and sanitize it.Never know where that hooker has been.
Follow.prototype.cleanUp = function() {
  if (typeof(this.followedUsername) != "string") {this.followedUsername = ""}
}

Follow.prototype.validate = async function(action) {
  // the followee must exit in db. really. dude. so we have to go look it up.
  let followedAccount = await usersCollection.findOne({username: this.followedUsername})
  if (followedAccount) {
    this.followedId = followedAccount._id;
  } else {
    this.errors.push("dude. that person so totally does not exist")
  }

  // see if we are already following... not sure why we are doing this.
  let doesFollowAlreadyExist = await followsCollection.findOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
  if(action == "create") {
    if(doesFollowAlreadyExist) {this.errors.push("already following")}
  }
  if(action == "delete") {
    if(!doesFollowAlreadyExist) {this.errors.push("you are double unfollowing that dude")}
  }
  // should not try to follow yourself. The code is not needed as the button is not displayed such that you could attempt to follow
  // yourself. So this code is unnecessary and redundant and unnecessary. you get the idea.
  if(this.followedId.equals(this.authorId)) {this.errors.push("this should never happen")}
}

// start following some luser
Follow.prototype.create = function() {
  return new Promise( async(resolve, reject) => {
    this.cleanUp();
    await this.validate("create");

    if (!this.errors.length) {
      // store follow data in db
      await followsCollection.insertOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
      resolve()
    } else {
      reject(this.errors)
    }
  })
}

// stop following some luser
Follow.prototype.delete = function() {
  return new Promise( async(resolve, reject) => {
    this.cleanUp();
    await this.validate("delete");

    if (!this.errors.length) {
      // store !follow data in db
      await followsCollection.deleteOne({followedId: this.followedId, authorId: new ObjectID(this.authorId)})
      resolve()
    } else {
      reject(this.errors)
    }
  })
}

Follow.isVisitorFollowing = async function(followedId, visitorId) {
  let followDoc = await followsCollection.findOne({followedId: followedId, authorId: new ObjectID(visitorId)})
  if(followDoc) {
    return true
  } else {
    return false
  }
}

// find all the people who are following this user
Follow.getFollowersById = function(id) {
  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection.aggregate([
        {$match: {followedId: id}},
        // select from users where users._id == 
        {$lookup: {from: 'users', localField: 'followedId', foreignField: '_id', as: 'userDoc'}},
        // new specify what we want from this join
        {$project: {
          username: {$arrayElemAt: ["$userDoc.username", 0]},
          email: {$arrayElemAt: ["$userDoc.email", 0]}
        }}
      ]).toArray()

      console.log('followers: ' + followers.length)

      followers = followers.map(function(follower) {
        //create a user
        let user = new User(follower, true)
        return{username: follower.username, avatar: user.avatar}
      })
      resolve(followers)

    } catch {
      reject()
    }
  })
}

Follow.getFollowingById = function(id) {
  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection.aggregate([
        {$match: {authorId: id}},
        {$lookup: {from: 'users', localField: 'followedId', foreignField: '_id', as: 'userDoc'}},
        // now specify what we want from this join
        {$project: {
          username: {$arrayElemAt: ["$userDoc.username", 0]},
          email: {$arrayElemAt: ["$userDoc.email", 0]}
        }}
      ]).toArray()

      console.log('followings: ' + followers.length)

      followers = followers.map(function(follower) {
        //create a user
        let user = new User(follower, true)
        return{username: follower.username, avatar: user.avatar}
      })
      resolve(followers)

    } catch {
      reject()
    }
  })
}

Follow.countFollowersById = function(id) {
  return new Promise(async(resolve, reject) => {
    // let count = await followsCollection.countDocuments({followedId: id})
    // resolve(count)
    try {
      resolve( await followsCollection.countDocuments({followedId: id}))
    } catch {
      reject()
    }
  })
}
Follow.countFollowingById = function(id) {
  return new Promise(async(resolve, reject) => {
    let count = await followsCollection.countDocuments({authorId: id})
    resolve(count)
  })
}

module.exports = Follow