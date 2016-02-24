var
    dbstore = require('nedb'),
    Promise = require('bluebird'),
    moment = require('moment'),
    fs = require('fs'),
    graph = require('fbgraph'),
    path = require('path'),
    db_path = path.join(__dirname,'..','db');
    db_names = ['users','posts','likes'],
    db = {},
    gut = module.exports = {}
;

gut.initDb = function(){
  return new Promise(function(resolve,reject){
      var dp_path_buff = '';
      fs.mkdir(db_path, 0777, function(err){});
      db_names.forEach(function(db_name,idx){
        db_path_buff = path.join(db_path,db_name+'.db');
        db[db_name] = new dbstore({filename:db_path_buff,autoload:true});
      })
      resolve();
  });
}

gut.saveFbInfo = function(opts){
  return new Promise(function(resolve,reject){
    db['users'].find({ "fb.profile.id": opts.profile.id }, function (err, docs) {
      if(docs.length === 0){
        var user = {
          "fb":{
            "accessToken":opts.accessToken,
            "refreshToken":opts.refreshToken,
            "profile":{
              "id":opts.profile.id,
              "displayName":opts.profile.displayName
            }
          }
        };
        db['users'].insert(user,function(err,newUser){
          resolve(newUser);
        })
      }else{
        db['users']
          .update(
                  {_id:docs[0]._id},
                  {$set:{'fb.accessToken':opts.accessToken,'fb.refreshToken':opts.refreshToken}},
                  {},
                  function(err,numReplaced){
                    resolve(docs[0]);
                  })
      }
    });

  });
}

gut.getUser = function(userid){
  return new Promise(function(resolve,reject){
    db['users'].find({_id:userid},function(err,docs){
        resolve(docs[0])
    })
  })
}

gut.AddPost = function(post){

  return new Promise(function(resolve,reject){
    post["_sys_timestamp_"] = moment().toISOString();
    db['posts'].insert(post,function(err,newPost){
      resolve(newPost);
    })
  })
};

gut.addLike = function(like){
    return new Promise(function(resolve,reject){
        like["_sys_timestamp_"] = moment().toISOString();
        db['likes'].insert(like,function(err,newLike){
            resolve(newLike);
        })
    })
};


gut.initDb();
return gut;
