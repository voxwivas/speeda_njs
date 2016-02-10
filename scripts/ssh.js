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
.exec('echo "Installing Npm Deps" && cd speeda_njs && npm install', {
    out: console.log.bind(console)
})
.exec('echo "Installing Bower components" && cd speeda_njs/public && bower install --allow-root', {
    out: console.log.bind(console)
})
.exec('echo "Running new instance" && cd speeda_njs && pm2 reload app/app.js', {
    out: function(_console){
      console.log(_console);
      if(_console.trim() === "Server up"){
        setTimeout(function(){ ssh.end(); }, 2000)
      }
    }
})
.start();
