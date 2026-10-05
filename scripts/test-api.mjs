import { writeFile, rm, realpath } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
// The test-only provider key is never a real credential and this file is emulator-only.
const file=new URL('../functions/.env.local',import.meta.url);
const secretFile=new URL('../functions/.secret.local',import.meta.url);
let created=false;
let secretCreated=false;
try {
  await writeFile(file,'PAYSTACK_API_URL=http://127.0.0.1:9876\n',{flag:'wx'});
  created=true;
  await writeFile(secretFile,'PAYSTACK_SECRET_KEY=sk_test_emulator\n',{flag:'wx'});
  secretCreated=true;
  const cli=process.platform==='win32' ? path.join(process.env.APPDATA,'npm','node_modules','firebase-tools','lib','bin','firebase.js') : await realpath(execFileSync('which',['firebase'],{encoding:'utf8'}).trim());
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[cli,'emulators:exec','--only','auth,firestore,functions','--project','demo-marketplace','node --test tests/api.integration.test.mjs'],{
      stdio:'inherit', env:{...process.env,FUNCTIONS_DISCOVERY_TIMEOUT:process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '60'},
    });
    child.on('error',reject);child.on('exit',resolve);
  });
  process.exitCode=typeof code==='number'?code:1;
} finally { if(created) await rm(file,{force:true}); if(secretCreated) await rm(secretFile,{force:true}); }
