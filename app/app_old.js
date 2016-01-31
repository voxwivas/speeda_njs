var
  express = require('express'),
  db =  require('./db'),
  session = require('express-session'),
  app = express(),
  graph = require('fbgraph'),
  uuid = require('node-uuid'),
  passport = require('passport'),
  FacebookStrategy = require('passport-facebook').Strategy,
  FACEBOOK_APP_ID = process.env.SPEEDA_FB_APP_ID,
  FACEBOOK_APP_SEC = process.env.SPEEDA_FB_APP_SEC
;

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SEC,
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    profileURL: 'https://graph.facebook.com/v2.5/me',
  },
  function(accessToken, refreshToken, profile, done) {
    db.saveFbInfo({'accessToken':accessToken,'refreshToken':refreshToken,'profile':profile}).then(function(user){
        return done(null,user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(session({  genid: function(req) { return uuid.v4() }, secret: 'my_precious', resave:true,saveUninitialized:true }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function (req, res) {
  res.send("Hello World!.. It's Done and now secure!");
});

app.get('/fb/pass', function (req, res) {
  res.send("Authenticated ? : " + req.session.passport.user._id);

});

app.get('/fb/feed/:userid', function (req, res) {
    db.getUser(req.params.userid).then(function(user){
      graph.setAccessToken(user.fb.accessToken);
      graph.setVersion("2.5");
      graph.get('/me/friendlists',function(err,fbres){
        res.send(fbres);
      })
    })
});


app.get('/fb/fail', function (req, res) {
  res.send("Facebook login failed");
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/fb/fail', scope:['user_posts','user_friends','user_about_me']}),
  function(req, res) {
    res.redirect('/fb/pass');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
  db.initDb();
});
