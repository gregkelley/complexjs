const Follow = require('../models/Follow')

exports.addFollow = function(req, res) {
  //params: the username to follow, the person who wants to do the following
  let follow = new Follow(req.params.username, req.visitorId)

  // access the data model to create a follow relationship
  follow.create()
    .then(() => {
      req.flash("success", `Successfully following ${req.params.username}`);
      req.session.save(() => res.redirect(`/profile/${req.params.username}`))
    })
    .catch((errors) => {
      errors.forEach((error) => {
        req.flash("errors", error)
      })
      req.session.save(() => res.redirect('/'))
    })
}

exports.removeFollow = function(req, res) {
  //params: the username to NOT follow, the person who wants to do the NOT following
  let follow = new Follow(req.params.username, req.visitorId)

  // access the data model to create a follow relationship
  follow.delete()
    .then(() => {
      req.flash("success", `Successfully Unfriended ${req.params.username}`);
      req.session.save(() => res.redirect(`/profile/${req.params.username}`))
    })
    .catch((errors) => {
      errors.forEach((error) => {
        req.flash("errors", error)
      })
      req.session.save(() => res.redirect('/'))
    })
}