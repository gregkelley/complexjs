// Model portion of the MVC structure

const validator = require("validator");
const usersCollection = require('../db').db().collection("users");
const bcrypt = require('bcryptjs');
const md5 = require('md5');

let User = function(data, getAvatar) {
  //
  //this.someText = "Some Text"
  this.data = data;
  this.errors = [];
  if (getAvatar == undefined) {getAvatar = false}
  if (getAvatar) {this.getAvatar()}
}

// prototypes keep JS from creating a copy of the function for every single instance that is created.
//User.prototype.jump = function() {}

User.prototype.cleanup = function() {
  if (typeof(this.data.username) != "string") {
    this.data.username = "";
  }
  if (typeof(this.data.email) != "string") {
    this.data.email = "";
  }
  if (typeof(this.data.password) != "string") {
    this.data.password = "";
  }

  // it is possible for bogus properties to be sent over from the 'browser' or whatever we are receiving
  // from. So this will only allow the items we want to see.
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password
  }
}

// had to make validate async to deal with database access and the await feature 
User.prototype.validate = function() {
  return new Promise(async (resolve, reject) => {
    if (this.data.username == "") {
      this.errors.push("Must have username");
    }
    if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {
      this.errors.push("Must have username of letters and numberz or kittehz");
    }
  
    if (!validator.isEmail(this.data.email)) {  // (this.data.email == "") {
      this.errors.push("Must have email valid. dork.");
    }
    if (this.data.password == "") {
      this.errors.push("Must have password, dude.");
    }
    if (this.data.password.length > 0 && this.data.password.length < 4) {this.errors.push("Password must be at least 120,000 characters.")}
    if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 100000 characters.")}
    if (this.data.username.length > 0 && this.data.username.length < 3) {this.errors.push("Username must be at least 3 [million] characters.")}
    if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters.")}
  
    // check to see that user and email are unique, ie, not already taken
    if(this.data.username.length > 2 && this.data.username.length < 31
        && validator.isAlphanumeric(this.data.username)) {
          // findOne returns a promise
          let usernameExists = await usersCollection.findOne({username: this.data.username});
          if(usernameExists) {this.errors.push("Username already taken")}
        }
    if(validator.isEmail(this.data.email)) {
        // findOne returns a promise
        let emailExists = await usersCollection.findOne({email: this.data.email});
        if(emailExists) {this.errors.push("Email already taken")}
    }
    // calling resolve signifies that the Promise has completed. Probably need this.
    resolve();
    })
}

// called from userController when someone tries to log in
User.prototype.login = function() {
  return new Promise( (resolve, reject) =>  {
    this.cleanup(); 
    // what are we trying to find, function to call when db call completes. ie, a callback
    // usersCollection.findOne({username: this.data.username}, (err, theUser) => {
    //   // have to use arrow function here to not fuck the value of 'this.' keyword. funkin awesome
    //   if (theUser && theUser.password == this.data.password) {  // only true if user exists
    //     // console.log("quality monkey")
    //     resolve("congrats on your successful login, birdbrain.")
    //   } else { reject("fail."); }


    usersCollection.findOne({username: this.data.username})
      .then((theUser) => {
        if (theUser && bcrypt.compareSync(this.data.password, theUser.password)) {  // only true if user exists
          
          this.data = theUser;
          this.getAvatar(); // just like fm, this will populate an avatar obj on our wtf.
          resolve("congrats on your successful login, birdbrain.")
        } else { reject("fail."); }

      })
      .catch(() => {
        reject("epic db fail. who knows. shit fails.")
      })
  })
}

// traditional, callback way of reaching out to db and handling return at some future time
// called from userController when someone tries to log in
// User.prototype.login = function(callback) {
//   // this.
//   this.cleanup();
//   // what are we trying to find, function to call when db call completes 
//   usersCollection.findOne({username: this.data.username}, (err, theUser) => {
//     // have to use arrow function here to not fuck the value of 'this.' keyword. funkin awesome
//     if (theUser && theUser.password == this.data.password) {  // only true if user exists
//       // console.log("quality monkey")
//       callback("congrats on your successful login, birdbrain.")
//     } else {
//       callback("fail.");
//     }
//   })
// }

// not only is it now an async func but it needs to return a Promise. yay. hell ya.
User.prototype.register = function() {
  return new Promise(async (resolve, reject) => {
    // validate the incoming puss
    this.cleanup();
    // added async db calls to validate(). add an async to the validate func so we can put an await.
    await this.validate();
  
  
    // if valid - save user data into db
    if(!this.errors.length) {
      // hash the pw before sending it to the db
      let salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(this.data.password, salt);
  
      await usersCollection.insertOne(this.data);
      this.getAvatar();
      resolve();
    } else {
      reject(this.errors)
    }
  })
}

User.prototype.getAvatar = function() {
  // console.log(this.data.email);
  // console.log(md5(this.data.email));
  // pass the md5 hash of a user's email to the gravator service. they will return a picture
  // of their avatar, sized per your spec: ?s=128 [pixels]
  this.avatar = `https://s.gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

// user profile request from browser monkey
User.findByUsername = function(username) {
  return new Promise(function(resolve, reject) {
    if(typeof(username) != "string") {
      reject()
      return
    }

    usersCollection.findOne({username: username})
      .then(function(userDoc) {
        if(userDoc) {
          // we found the user. now sort for the info we want to expose / send to the caller
          userDoc = new User(userDoc, true)
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar
          }
          resolve(userDoc)
        } else {
          reject()
        }
      })
      .catch(function() {
        reject()
      })
  })
}

module.exports = User