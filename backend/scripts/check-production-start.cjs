// Use an isolated npm ci --omit=dev installation, fake env and no live DB.
const {spawn} = require('node:child_process');
const {readFileSync} = require('node:fs');
const net = require('node:net');
const assert = require('node:assert/strict');
(async()=>{
 const cwd=process.argv[2];if(!cwd)throw new Error('Pass the isolated production installation directory');
 assert.equal(JSON.parse(readFileSync(cwd+'/package.json','utf8')).scripts.start,'node index.js');
 const listener=net.createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
 const child=spawn('npm',['start'],{cwd,detached:true,env:{PATH:process.env.PATH,NODE_ENV:'production',PORT:String(port),DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',JWT_SECRET:'production-smoke-test-only',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',GOOGLE_CALLBACK_URL:'http://127.0.0.1/auth/test',CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'test',CLOUDINARY_API_SECRET:'test'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
 try {
  let ready=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw new Error('Production startup exited: '+output.slice(-1000));
   try{const result=await fetch(`http://127.0.0.1:${port}/api/test`);if(result.ok && (await result.json()).message){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,'Production startup did not become ready');
  console.log('PASS npm start with production-only dependencies, generated Prisma Client, fake credentials and HTTP health response.');
 } finally {try{process.kill(-child.pid,'SIGTERM');}catch{}}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
