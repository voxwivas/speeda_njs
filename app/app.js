/**
 * Module dependencies.
 */

var
    express   = require('express'),
    graph     = require('fbgraph'),
    db =  require('./db'),
    multer = require('multer'),
    upload = multer(),
    bodyParser = require('body-parser'),
    serverIP = require('ip').address(),
    SPEEDA_HOST = process.env.SPEEDA_HOST,
    FACEBOOK_APP_ID = process.env.SPEEDA_FB_APP_ID,
    FACEBOOK_APP_SEC = process.env.SPEEDA_FB_APP_SEC,
    app = express()
;

// this should really be in a config file!
var conf = {
    client_id:      FACEBOOK_APP_ID,
    client_secret:  FACEBOOK_APP_SEC,
    scope:          'user_posts,user_photos,publish_actions',
    redirect_uri:   'http://'+(serverIP===SPEEDA_HOST?serverIP:"localhost")+':3000/auth/facebook'
};

app.use(bodyParser.json({limit: '50mb'})); // for parsing application/json
app.use(bodyParser.urlencoded({ limit: '50mb',extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static('public'));

// Routes
app.get('/', function(req, res){
  res.send("0 downtime achieved!");
});

app.get('/auth/facebook', function(req, res) {
  graph.setVersion('2.5');
  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":     conf.client_id
      , "redirect_uri":  conf.redirect_uri
      , "scope":         conf.scope
    });

    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
    } else {  //req.query.error == 'access_denied'
      res.send('access denied');
    }
    return;
  }

  // code is set
  // we'll send that and get the access token
  graph.authorize({
      "client_id":      conf.client_id
    , "redirect_uri":   conf.redirect_uri
    , "client_secret":  conf.client_secret
    , "code":           req.query.code
  }, function (err, facebookRes) {
    console.log("facebookRes.accessToken : " + JSON.stringify(facebookRes));
    graph.get('/me',function(err,fbres){
      var fb = {
          "accessToken":facebookRes.access_token,
          "profile":{
            "id":fbres.id,
            "displayName":fbres.name
          }
        }
      if(facebookRes.access_token){
        db.saveFbInfo(fb).then(function(newUser){
          res.send(newUser)
        })
      }
    })

    // res.send(facebookRes);
  });


});

app.post('/api/v1/like', function(req, res) {
    db.addLike(JSON.parse(req.body.like)).then(function(newLike){
        res.send({"success":"true"});
    });
});

app.post('/api/v2/like', function(req, res) {
    db.addLike(JSON.parse(req.body)).then(function(newLike){
        res.send({"success":"true"});
    });
});


app.get('/api/v1/like/:postID', function(req, res) {
    var post_id = req.params.postID;
    var length = req.query.length || 'd';
    db.getLikes({post_id:post_id,length:length}).then(function(likes){
        res.send(likes)
    });
});

app.get('/api/v2/like/total/:userID', function(req, res) {
    var user_id = req.params.userID;
    db.getTotalLikes(user_id).then(function(likes){
        res.send(likes)
    });
});

app.get('/api/v2/dashboard', function(req, res) {

    var responseSettings = {
        "AccessControlAllowOrigin": req.headers.origin,
        "AccessControlAllowHeaders": "Content-Type,X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5,  Date, X-Api-Version, X-File-Name",
        "AccessControlAllowMethods": "POST, GET, PUT, DELETE, OPTIONS",
        "AccessControlAllowCredentials": true
    };

    res.header("Access-Control-Allow-Credentials", responseSettings.AccessControlAllowCredentials);
    res.header("Access-Control-Allow-Origin",  responseSettings.AccessControlAllowOrigin);
    res.header("Access-Control-Allow-Headers", (req.headers['access-control-request-headers']) ? req.headers['access-control-request-headers'] : "x-requested-with");
    res.header("Access-Control-Allow-Methods", (req.headers['access-control-request-method']) ? req.headers['access-control-request-method'] : responseSettings.AccessControlAllowMethods);


    db.getDashboard({}).then(function(opts){
        res.send({"slashboard":opts["dashboard"]})
    });
});

/**
 * @api {get} /fb/feed/:speedaid Get User's Feed
 * @apiGroup Facebook
 * @apiParam {String} speedaid The User's Speeda ID
 */
 app.get('/fb/feed/:userid', function(req, res) {
  db.getUser(req.params.userid).then(function(user){
    graph.setAccessToken(user.fb.accessToken);
    graph.setVersion("2.5");
    var fields = [ 'full_picture','message','created_time','name','place',
                  'story','status_type','application','object_id','type',
                  'caption','description','from','link','picture']
    graph.get('/me/feed?filter="nf"&fields='+fields.join(','),function(err,fbres){
      res.send(fbres);
    })
  })
});
/**
 * @api {get} /fb/:speedaid/:fbid/picture Get Profile Picture
 * @apiGroup Facebook
 * @apiParam {String} speedaid The User's Speeda ID
 * @apiParam {String} fbid The Facebook ID of the User whose profile picture you want
 */
app.get('/fb/:speedaid/:fbid/picture', function(req, res) {
  db.getUser(req.params.speedaid).then(function(user){
    graph.setAccessToken(user.fb.accessToken);
    graph.setVersion("2.5");
    var fields = [ 'full_picture','message','created_time','name','place',
                  'story','status_type','application','object_id','type',
                  'caption','description','from','link','picture']
    graph.get('/'+req.params.fbid+'/picture?type=large',function(err,fbres){
      res.send(fbres);
    })
  })
});


var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Server up");
});
