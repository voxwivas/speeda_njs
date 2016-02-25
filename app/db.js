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
        var post_time = like.timeDate;
        var user_id = like.userID;
        like.response.values.forEach(function(val,idx){
            //get the number of likes
            var likes = val.nameValuePairs.likes.nameValuePairs.summary.nameValuePairs.total_count;
            var comments = val.nameValuePairs.comments.nameValuePairs.summary.nameValuePairs.total_count;
            var post_id = val.nameValuePairs.id;
            // get the last time it was checked and subtract the likes from it.
            db['likes'].findOne({userID: '1032829753444318',postID:post_id}).sort({ _sys_timestamp_: -1 }).exec(function(err,doc){
                console.log("Doc :" + doc );
                var prev_likes = 0;
                var prev_comments = 0;
                if(doc){
                    prev_likes = doc.likes;
                    prev_comments = doc.comments;
                }

                likes = likes-prev_likes;
                comments = comments-prev_comments;
                var obj = {};
                obj["userID"]=user_id;
                obj["post_time"]=post_time;
                obj["postID"]=post_id;
                obj["_sys_timestamp_"]=moment().toISOString();
                obj["likes"]=likes;
                obj["comments"]=comments;

                db['likes'].insert(obj,function(err,docs){

                })
            });
        });



        //like["_sys_timestamp_"] = moment().toISOString();
        //db['likes'].insert(like,function(err,newLike){
        //    resolve(newLike);
        //})
    })
};

gut.engine = db;

gut.initDb();
return gut;
