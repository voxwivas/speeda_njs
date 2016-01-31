var
    SSH = require('simple-ssh'),
    SPEEDA_HOST = process.env.SPEEDA_HOST,
    SPEEDA_USER = process.env.SPEEDA_USER,
    SPEEDA_PASS = process.env.SPEEDA_PASS,
    SPEEDA_PORT = process.env.SPEEDA_PORT,
    ssh = new SSH({
        host: SPEEDA_HOST,
        user: SPEEDA_USER,
        pass: SPEEDA_PASS,
        port: SPEEDA_PORT
    })
;

ssh
.exec('echo "Killing existing instance" && pid=$(lsof -i:3000 -t); kill -TERM $pid || kill -KILL $pid', {
    out: console.log.bind(console)
})
.exec('echo "Installing Deps" && cd speeda_njs && npm install', {
    out: console.log.bind(console)
})
.exec('echo "Running new instance" && cd speeda_njs && NODE_ENV=production node app/app.js', {
    out: function(_console){
      console.log(_console);
      if(_console.trim() === "Express server listening on port 3000"){
        setTimeout(function(){ ssh.end(); }, 2000)
      }
    }
})
.start();
