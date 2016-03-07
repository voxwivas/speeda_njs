var
    dbstore = require('nedb'),
    Promise = require('bluebird'),
    moment = require('moment'),
    fs = require('fs'),
    graph = require('fbgraph'),
    path = require('path'),
    db_path = path.join(__dirname,'..','db');
    db_names = ['users','posts','likes','ranks'],
    days = ["Sunday","Monday","Tuesday","Wednesday","Thusrday","Friday","Saturday"],
    months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    db = {},
    addUser = function(_opts){
        return new Promise(function(resolve,reject){
            var opts = _opts || {};
            if(opts["userID"]){
                db['users'].find({userID:opts["userID"]},function(err,docs){
                    if(docs.length===0){
                         var user = { "userID":opts["userID"] };
                        db['users'].insert(user,function(err,doc){
                            resolve(opts);
                        })
                    }
                })
            }
        });
    },
    rank = function (_opts) {
        return new Promise(function (resolve, reject) {
            var opts = _opts || {};
            db["likes"].loadDatabase(function (err) {    // Callback is optional
                db['likes'].find({userID:opts["userID"]},function(err,docs){
                    var post_like_map = {};
                    for (var i = 0; i < docs.length; i++) {
                        var doc = docs[i];
                        if(doc["likes"]===0) continue;
                        post_like_map[doc["postID"]] = post_like_map[doc["postID"]] || 0;
                        post_like_map[doc["postID"]] += doc["likes"];
                    }
                    opts["rank"] = {};
                    var keys = Object.keys(post_like_map);
                    var values = 0;
                    keys.forEach(function(key){
                        values += post_like_map[key];
                    });
                    opts["rank"]["posts"]=keys.length;
                    opts["rank"]["likes"]=values;
                    db["likes"].loadDatabase(function (err) {
                        db['likes'].find({"rank.likes":{$gt:opts["rank"]["likes"]}}).sort({"rank.likes":1}).exec(function(err,docs){
                        console.log("No docs : " + docs.length);
                        var next_rank = 0;
                        if(docs.length > 0){
                            var doc = docs[docs.length-1];
                            next_rank = doc["rank"]["level"];
                            if(docs["userId"] === opts["userId"]){
                                opts["rank"]["level"] = next_rank+1;
                            }else{
                                opts["rank"]["level"] = next_rank
                            }
                        }else{
                            opts["rank"]["level"] = next_rank+1;
                        }
                        db["ranks"].loadDatabase(function (err) {
                            db['ranks'].update({userID:opts["userID"]},{$set:{rank:opts["rank"]}},{multi:true},function(err,numReplaced){
                            console.log("No docs replaced : " + numReplaced);
                            opts["_sys_timestamp_"] = moment().toISOString();
                            if(numReplaced===0){
                                db['ranks'].insert(opts,function(err,doc){
                                    resolve(opts);
                                });
                            }else{
                                resolve(opts);
                            }

                        })
                        });
                    })
                    });
                });
            });

        });
    },
    Dashboard = function(_opts){
        var opts = _opts || {};
        this.version="0.0";
        this.charts = opts["charts"] || [];
    },
    countUsers = function(_opts){
        return new Promise(function(resolve,reject){
            var opts = _opts || {};
            db["users"].loadDatabase(function (err) {    // Callback is optional
                db["users"].count({}, function (err, count) {
                    console.log("User count : " + count);
                    opts["num_users"]=count;
                    resolve(opts);
                });
            });
        });
    },
    countLikes = function(_opts){
        return new Promise(function(resolve,reject){
            var opts = _opts || {};
            db["ranks"].loadDatabase(function (err) {
                db['ranks'].find({},function(err,docs){
                    var total = 0;
                    for (var i = 0; i < docs.length; i++) {
                        var doc = docs[i];
                        total += doc["rank"]["likes"];
                    }
                    opts["num_likes"]=total;
                    resolve(opts);
                })
            });
        });
    },
    gut = module.exports = {}
;

gut.initDb = function(){
  return new Promise(function(resolve,reject){
      var dp_path_buff = '';
      fs.mkdir(db_path, 0777, function(err){});
      db_names.forEach(function(db_name,idx){
        db_path_buff = path.join(db_path,db_name+'.db');
        db[db_name] = new dbstore({filename:db_path_buff,autoload:true});
      });
      db["users"].ensureIndex({ fieldName: 'userID', unique: true },function(err){
      });
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

gut.addUser = addUser;

gut.rank = rank;

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
        addUser({"userID":user_id});
        like.response.values.forEach(function(val,idx){
            //get the number of likes
            var likes = val.nameValuePairs.likes.nameValuePairs.summary.nameValuePairs.total_count;
            var comments = val.nameValuePairs.comments.nameValuePairs.summary.nameValuePairs.total_count;
            var post_id = val.nameValuePairs.id;
            // get the last time it was checked and subtract the likes from it.
            db['likes'].find({userID:user_id,postID:post_id}).sort({ _sys_timestamp_: -1 }).exec(function(err,docs){
                var prev_likes = 0;
                var prev_comments = 0;
                if(docs.length > 0){
                    for(var i =0; i < docs.length; i++){
                        prev_likes += docs[i].likes;
                        prev_comments += docs[i].comments;
                    }
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
                    rank({userID:user_id});
                    resolve(docs);
                })
            });
        });
    })
};

gut.getLikes = function(opts){
    return new Promise(function(resolve,reject){
        var post_id = opts["post_id"];
        var length = opts["length"];
        var timeFilter;

        switch(length){
            case 'd':
            case 'M':
            case 'w':
                timeFilter = moment().subtract(1,length);
            break;
            default:
                timeFilter = moment().subtract(1,'d');
            break;

        }

        db['likes'].find({postID:post_id}).sort({ _sys_timestamp_: 1 }).exec(function(err,docs){
            var result = [];
            var likes_so_far = 0;
            if(docs.length > 0){
                for(var i =0; i < docs.length; i++){
                    if( moment(docs[i]['_sys_timestamp_']).isBefore(timeFilter) )
                    {continue;}
                    console.log("lsfb : " + likes_so_far);
                    console.log("l : " + docs[i].likes);
                    likes_so_far += docs[i].likes;
                    console.log("lsfa : " + likes_so_far);
                    result.push({"likes":docs[i].likes,"post_time":docs[i].post_time,"total_likes":likes_so_far});
                }
            }

            result = result.reverse()

            switch(length){
                case 'w':
                    var result_w = {};
                    //days.forEach(function(day){
                    //    result_w[day] = [];
                    //});
                    result.forEach(function(like){
                        var day = days[moment(like["post_time"]).day()];
                        result_w[day] = result_w[day] || [];
                        result_w[day].push(like);
                    });
                    resolve(result_w);
                break;
                case 'M':
                    var result_m = {};
                    result.forEach(function(like){

                        var mom = moment(like["post_time"]), week_no = Math.ceil(mom.date() / 7), month = months[mom.month()];
                        result_m[month+"_Week_"+week_no] = result_m[month+"_Week_"+week_no] || [];
                        result_m[month+"_Week_"+week_no].push(like);
                    });
                    resolve(result_m);
                break;
                default:
                    resolve(result);
                break;
            }
        });
    })
};

gut.getTotalLikes = function(user_id){
    return new Promise(function(resolve,reject){
        db['likes'].find({userID:user_id}).sort({ _sys_timestamp_: -1 }).exec(function(err,docs){
            var likes = 0;
            if(docs.length > 0){
                for(var i =0; i < docs.length; i++){
                    likes += docs[i].likes;
                }
            }
            resolve({"likes":likes});
        });
    });
};

gut.getDashboard = function(_opts){
    return new Promise(function(resolve,reject){
        var res = _opts || {};
        res["dashboard"] = new Dashboard();

        countUsers().then(countLikes).then(function(opts){
            console.log("Num likes : " + opts["num_likes"]);
            var users = require('./templates/user_dash.json'),
                likes = require('./templates/likes_dash.json');
            users["data"]["title"]["text"]="Users";
            users["data"]["subtitle"]["text"]=opts["num_users"];
            likes["data"]["title"]["text"]="Likes";
            likes["data"]["subtitle"]["text"]=opts["num_likes"];
            res["dashboard"]["charts"].push(users);
            res["dashboard"]["charts"].push(likes);
            resolve(res);
        })

    });
};

gut.engine = db;

gut.initDb();
return gut;
