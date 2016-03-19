/* Generic middleware: authentication routing */
 (function() {
   'use strict';
  exports.requiresLogin = function (req, res, next) {
    if (req.cookies['connect.sid'] !== undefined) return next();
    res.redirect('/login');
  };

}());
