/*
 *  Generic require login routing middleware
 */
exports.requiresLogin = function (req, res, next) {
  if (req.cookies['connect.sid'] !== null) return next();
  res.redirect('/login');
};
