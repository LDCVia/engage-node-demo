(function() {
  'use strict';

  var config = require('./config/config');
  var express = require('express');
  var path = require('path');
  var app = express();
  var favicon = require('serve-favicon');
  var logger = require('morgan');
  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');

  var routes = require('./routes/index');

  // View engine
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  console.log("LDC VIA API host: " + config.apihost);

  app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser(config.secret));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/bower_components', express.static(path.join(__dirname, '/bower_components')));

  app.locals._      = require('underscore');
  app.locals._.str  = require('underscore.string');
  app.locals.moment = require('moment');

  app.use('/', routes);

  // Catch 404s and forward to our normal err handler
  app.use(function(req, res, next) {
    var err = new Error('Resource / page not found');
    err.status = 404;
    next(err);
  });

  // Dev errors: show stack traces
  if (app.get('env') === 'development') {
    app.listen(5000);
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  // Production errors: don't show stack traces
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });


  module.exports = app;
}());
