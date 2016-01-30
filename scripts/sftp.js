var
    exec = require('exec'),
    SPEEDA_HOST = process.env.SPEEDA_HOST,
    SPEEDA_USER = process.env.SPEEDA_USER,
    SPEEDA_PASS = process.env.SPEEDA_PASS,
    SPEEDA_PORT = process.env.SPEEDA_PORT,
    SPEEDA_PATH = process.env.SPEEDA_PATH
;

exec('sshpass -p '+SPEEDA_PASS+' scp -P '+SPEEDA_PORT+'  -o stricthostkeychecking=no -rq app package.json '+SPEEDA_USER+'@'+SPEEDA_HOST+':'+SPEEDA_PATH, function(err, out, code) {
  if (err instanceof Error)
    throw err;
  process.stderr.write(err);
  process.stdout.write(out);
  process.exit(code);
});
