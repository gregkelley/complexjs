
// pulled from Post before the code was re-factored to eliminate duplication.
// 

Post.findSingleById = function(id) {
  return new Promise(async function(resolve, reject) {
    // first, validate incoming ID
    if (typeof(id) != "string" || !ObjectID.isValid(id)) {
      reject();
      return;
    }

    // if id is valid, look up the post
    // let post = await postsCollection.findOne({_id: new ObjectID(id)});
    // if (post) {
    //   resolve(post)
    // } else { reject() }

    // one aggregate obj from the db:
    // {
    //   _id: 5f4953457ff9352d306be743,
    //   title: 'whacka mole',
    //   body: 'wongo girl',
    //   createdDate: 2020-08-28T18:56:05.416Z,
    //   author: 5f0748d6d536c620682dc3e3,
    //   authorDocument: [
    //     {
    //       _id: 5f0748d6d536c620682dc3e3,
    //       username: 'greg',
    //       email: 'gregkelley@yahoo.com',
    //       password: '$2a$10$A5BUTOZzA538nG1Y7vDADe6qoT3fOGzEYg1IqnqTh4taQo4MBuKQG'
    //     }
    //   ]
    // }
    // look up a particular post in the db and retrieve
    // aggregate takes an array of db operations
    // project: spell out the fields we want the object to have. Without this, we just get the whole object
    // title: 1,  // 1 means true or yes or some shit
    let posts = await postsCollection.aggregate([
      {$match: {_id: new ObjectID(id)}},
      {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
      {$project: {
        title: 1,
        body: 1,
        createdDate: 1,
        author: {$arrayElemAt: ["$authorDocument", 0]}
      }}
    ]).toArray()
    // pick out the author items that we need.
    posts = posts.map(function(post) {
      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar // .avatar at the end digs into the avatar obj and pulls out the actual avatar string that is also name avatar. fuck me! yay!
      }
      return post;
    })
    // if more than zero items then:
    if (posts.length) {
      console.log(posts[0]);
      resolve(posts[0]);
    } else { reject() }

  })
}
