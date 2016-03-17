var express = require('express');
var config = require('../config');
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

/* Application home page */
router.get('/', auth.requiresLogin,  function(req, res, next) {
  var url = config.apihost + "/1.0/collections/" + config.db + "/Person?count=10";
  // TOD debug code
  console.log('DEBUG URL is ' + url);

  try{
    restler.get(
      url,
      { headers: { 'cookie': getCookies(req) } }
    ).on('complete', function(data, response){
      if(response.statusCode == 200){
        if (!data){
          data = {data: []};
        }
        data.start=1;
        data.pages = Math.ceil(data.count / 10);
        data.currentpage = data.start / 10;
        if (data.currentpage < 1) data.currentpage = 1;
        res.render('index', {"tab":"home", "email": req.cookies.email, "entries": data, "title": config.title});
      }else{
        res.render("login", { "error": data });
      }
    });
  }catch(e){
    if (e.indexOf("valid api key") > -1){
      res.render("login", { "error": "Your session has expired. Please log in again." });
    } else {
      res.render("login", {"error": e});
    }
  }
});

router.get('/Person/:pageno', auth.requiresLogin,  function(req, res, next) {
  try{
    var start = ((req.params.pageno - 1) * 10);
    restler.get(
      config.apihost + "/1.0/collections/" + config.db + "/Person?count=10&start=" + start,
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

router.get('/newentry', auth.requiresLogin, function(req, res, next){
    res.render("entry-new", {
      "tab": "newentry",
      "email": req.cookies.email,
      "title": "New Person | " + config.title
    });
});

router.post('/newentry', auth.requiresLogin, function(req, res, next){
  var data = {};
  data.first_name = req.body.first_name;
  data.last_name = req.body.last_name;
  data.full_name = req.body.first_name + req.body.last_name;
  data.datecreated = new Date();
  data.__unid = Date.now();
  data.__form = "Person";

  restler.putJson(
    config.apihost + "/1.0/document/" + config.db + "/Person/" + data.__unid, data, { headers: {'cookie': getCookies(req) } }
    ).on('complete', function(data, response){
    res.redirect("/");
  });
});

router.get('/entry/:unid', auth.requiresLogin, function(req, res, next){
  try{
      restler.get(
        config.apihost + "/1.0/document/" + config.db + "/Person/" + req.params.unid + "?all",
        { headers: { 'cookie': getCookies(req) } }
      ).on('complete', function(data, response){
        res.render('entry-read', {"tab":"entry", "email": req.cookies.email, "entry": data, "title": data.title + " | "+ config.title});
      });
  }catch(e){
    res.render("login", {"error": e});
  }
});

router.delete('/entry/:unid', auth.requiresLogin, function(req, res, next){
  try{
    restler.del(
      config.apihost + "/1.0/document/" + config.db + "/Person/" + req.params.unid + "?all",
      { headers: { 'cookie': getCookies(req) } }
    ).on('complete', function(data, response){
      res.status(200).send(data);
    });
  }catch(e){
    res.render("login", { "error": e });
  }
});

router.post('/Person/:unid', auth.requiresLogin, function(req, res, next){
  var data = {};
  data.first_name = req.body.first_name;
  data.last_name = req.body.last_name;
  data.full_name = req.body.first_name + req.body.last_name;
  data.__form = "Person";
  data.__unid = Date.now();

  restler.postJson(
    config.apihost + "/1.0/document/" + config.db + "/Person/" + data.__unid,
    data,
    { headers: { 'cookie': getCookies(req) } }
  ).on('complete', function(data, response){
    res.redirect("/");
  });
});

router.get('/search', auth.requiresLogin, function(req, res, next){
  restler.postJson(
    config.apihost + "/1.0/search/" + config.db + "/Person?count=10",
    {"fulltext": req.query.query},
    { headers: { 'cookie': getCookies(req) } }
  ).on('complete', function(data, response){
    res.render('search', { "entries": data, search: req.query.query });
  });
});

router.get('/about', function(req, res, next) {
  try{
    res.render('static-about', {"tab":"about", "email": req.cookies.email, "title": "About | " + config.title});
  }catch(e){
    res.render("login", { "error": e });
  }
});

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

router.post('/login', function(req, res, next){
  try{
    restler.postJson(
      config.apihost + "/login",
      {'username': req.body.email, 'password': req.body.password}
    ).on('complete', function (data, response){
      var setcookie = response.headers["set-cookie"];
      var cookieobj = {};
      for (var i=0; i<setcookie.length; i++){
        if (setcookie[i].indexOf("connect.sid=") > -1){
          cookieobj = cookie.parse(setcookie[i]);
        }
      }
      if (cookieobj['connect.sid'] && data.success){
        res.cookie('connect.sid', cookieobj);
        res.cookie('email', req.body.email);
        res.redirect("/");
      }else{
        res.render("login", {"error": data.errors[0]});
      }
    });
  }catch(e){
    console.log(e);
    res.render("/login");
  }
});

router.get('/logout', auth.requiresLogin, function(req, res, next){
  res.clearCookie('connect.sid');
  res.clearCookie('email');
  res.redirect('/');
});

module.exports = router;
