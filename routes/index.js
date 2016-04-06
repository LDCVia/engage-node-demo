var express = require('express');
var config = require('../config/config');
var router = express.Router();
var auth = require('../controllers/authorisation');
var restler = require('restler');
var cookie = require('cookie');
var _ = require("underscore");

function getCookies(req){
  var cookies = _.map(req.cookies, function(val, key) {
    if(key == "connect.sid"){
      return key + "=" + val['connect.sid'];
    }
  }).join("; ");

  return cookies;
}

/* Home page: redirect to /login if required */
router.get('/', auth.requiresLogin,  function(req, res, next) {
  var url = config.apihost + "/collections/" + config.db + "/Person?count=10";

  try{
    restler.get(
      url,
      { headers: { 'cookie': getCookies(req) } }
    ).on('complete', function(data, response){
      if(response.statusCode == 200){
        if (!data) data = { data: [] };
        data.start=1;
        data.pages = Math.ceil(data.count / 10);
        data.currentpage = data.start / 10;
        if (data.currentpage < 1) data.currentpage = 1;
        res.render('index', {"tab":"home", "email": req.cookies.email, "entries": data, "title": config.title});
      } else {
        res.render("login", { "error": data });
      }
    });
  }catch(e){
    console.log('Some kind of error...');
    console.dir(e);
    if (e.indexOf("valid api key") > -1){
      res.render("login", { "error": "Your session has expired. Please log in again." });
    } else {
      res.render("login", {"error": e});
    }
  }
});

/* Pagination */
router.get('/entries/:pageno', auth.requiresLogin,  function(req, res, next) {
  try{
    var start = ((req.params.pageno - 1) * 10);
    restler.get(
      config.apihost + "/collections/" + config.db + "/Person?count=10&start=" + start,
      { headers: { 'cookie': getCookies(req) } }
    ).on('complete', function(data, response){
      if(response.statusCode == 200){
        if (!data) data = { data: [] };
        data.start = 1;
        data.pages = Math.ceil(data.count / 10);

        data.currentpage = req.params.pageno;
        res.render('index', {"tab":"home", "email": req.cookies.email, "entries": data, "title": config.title});
      }else{
        res.render("login", { "error": data });
      }
    });
  }catch(e){
    if (e.indexOf("valid api key") > -1){
      res.render("login", { "error": "Your session has expired. Please log in again." });
    } else {
      res.render("login", { "error": e });
    }
  }
});

/* Set the screen for submitting a new Person entry */
router.get('/newentry', auth.requiresLogin, function(req, res, next){
    res.render("entry-new", {
      "tab": "newentry",
      "email": req.cookies.email,
      "title": "New Person | " + config.title
    });
});

/* POST a new person in to the collection */
router.post('/newentry', auth.requiresLogin, function(req, res, next){
  var data = {};
  data.first_name = req.body.first_name;
  data.last_name = req.body.last_name;
  data.FullName = req.body.first_name + req.body.last_name;
  data.datecreated = new Date();
  data.__unid = Date.now();
  data.__form = "Person";

  restler.putJson(
    config.apihost + "/document/" + config.db + "/Person/" + data.__unid, data, { headers: {'cookie': getCookies(req) } }
    ).on('complete', function(data, response){
    res.redirect("/");
  });
});

/* GET a defined Person entry */
router.get('/entry/:unid', auth.requiresLogin, function(req, res, next){
  try{
      restler.get(
        config.apihost + "/document/" + config.db + "/Person/" + req.params.unid + "?all",
        { headers: { 'cookie': getCookies(req) } }
      ).on('complete', function(data, response){
        res.render('entry-read', {"tab":"entry", "email": req.cookies.email, "entry": data, "title": data.title + " | "+ config.title});
      });
  }catch(e){
    res.render("login", {"error": e});
  }
});

/* Delete a defined Person entry */
router.delete('/entry/:unid', auth.requiresLogin, function(req, res, next){
  try{
    restler.del(
      config.apihost + "/document/" + config.db + "/Person/" + req.params.unid + "?all",
      { headers: { 'cookie': getCookies(req) } }
    ).on('complete', function(data, response){
      res.status(200).send(data);
    });
  }catch(e){
    res.render("login", { "error": e });
  }
});

/* POST an update to existing Person entry */
router.post('/Person/:unid', auth.requiresLogin, function(req, res, next){
  var unid = req.params.unid;
  var data = {};
  data.first_name = req.body.first_name;
  data.last_name = req.body.last_name;
  data.FullName = req.body.first_name + req.body.last_name;

  restler.postJson(
    config.apihost + "/document/" + config.db + "/Person/" + unid,
    data,
    { headers: { 'cookie': getCookies(req) } }
  ).on('complete', function(data, response){
    res.redirect("/");
  });
});

/* Search request */
router.get('/search', auth.requiresLogin, function(req, res, next){
  var url = config.apihost + "/search/" + config.db + "/Person?count=10";
  restler.postJson(
    url,
    {"fulltext": req.query.query},
    { headers: { 'cookie': getCookies(req) } }
  ).on('complete', function(data, response){
    res.render('search', { "entries": data, search: req.query.query });
  });
});

/* Static about page */
router.get('/about', function(req, res, next) {
  try{
    res.render('static-about', {"tab":"about", "email": req.cookies.email, "title": "About | " + config.title});
  }catch(e){
    res.render("login", { "error": e });
  }
});

/* Static contact page */
router.get('/contact', function(req, res, next) {
  try{
    res.render('static-contact', {"tab":"contact", "email": req.cookies.email, "title": "Contact | " + config.title});
  }catch(e){
    res.render("login", { "error": e });
  }
});

/* GET login page */
router.get('/login',  function(req, res, next) {
  res.render('login', { "tab": "home", "title": "Login | " + config.title });
});

/* Submit login request to API */
router.post('/login', function(req, res, next){
  try{
    restler.postJson(
      config.apihost + "/login",
      {'username': req.body.email, 'password': req.body.password}
    ).on('complete', function (data, response){
      var setcookie = response.headers["set-cookie"];
      var cookieobj = {};
      for (var i=0; i<setcookie.length; i++){
        if (setcookie[i].indexOf("connect.sid=") > -1) cookieobj = cookie.parse(setcookie[i]);
      }

      if (cookieobj['connect.sid']){
        res.cookie('connect.sid', cookieobj);
        res.cookie('email', req.body.email);
        res.redirect("/");
      } else {
        var errMsg = "Unknown authentication error";
        if(data.errors) errMsg = data.errors[0];
        res.render("login", {"error": errMsg});
      }
    });
  } catch(e){
    console.log(e);
    res.render("/login");
  }
});

/* Logout page */
router.get('/logout', auth.requiresLogin, function(req, res, next){
  res.clearCookie('connect.sid');
  res.clearCookie('email');
  res.redirect('/');
});

module.exports = router;
