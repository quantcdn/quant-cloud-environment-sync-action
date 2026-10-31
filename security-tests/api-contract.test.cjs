const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {spawn} = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const kind = 'sync';
const prefix='/api/v3/organizations/fixture-org/applications/security-fixture/environments/';
for (const suffix of ['', '/api/v3/']) {
 for (const mode of (kind==='sync' ? ['success','skip','strict-skip'] : ['success'])) {
  test(`bundled ${kind}: ${mode}, base URL ${suffix || '/'}`, async () => {
    const temp=await fs.mkdtemp(path.join(os.tmpdir(),'quant-action-contract-'));
    const requests=[];
    const server=http.createServer(async(req,res)=>{
      let body='';for await(const chunk of req)body+=chunk;
      requests.push({method:req.method,url:req.url,authorization:req.headers.authorization,body});
      res.setHeader('Content-Type','application/json');
      if(req.url.endsWith('/sync/database') && req.method==='POST' && mode!=='success'){
        res.statusCode=400;res.end(JSON.stringify({message:'Fixture refuses sync'}));return;
      }
      res.end(JSON.stringify(req.url.endsWith('/sync/database') ? (req.method==='GET' ? [{syncId:'fixture-sync',status:'completed'}] : {syncId:'fixture-sync'}) : {name:'fixture'}));
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{
      await fs.copyFile(path.join(__dirname,'../dist/index.js'),path.join(temp,'action.cjs'));
      const output=path.join(temp,'output');await fs.writeFile(output,'');
      const env={...process.env,GITHUB_OUTPUT:output,INPUT_API_KEY:'fake-api-key',INPUT_ORGANIZATION:'fixture-org',INPUT_BASE_URL:`http://127.0.0.1:${server.address().port}${suffix}`,INPUT_APP_NAME:'security-fixture',INPUT_APPLICATION:'security-fixture',INPUT_ENVIRONMENT:'target',INPUT_ENVIRONMENT_NAME:'target',INPUT_SOURCE:'source',INPUT_TYPE:'database',INPUT_WAIT:'true',INPUT_FAIL_ON_SKIP:mode==='strict-skip'?'true':'false',INPUT_ACTION:'redeploy'};
      const result=await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,[path.join(temp,'action.cjs')],{cwd:temp,env});let stdout='',stderr='';
        child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.on('error',reject);
        const timer=setTimeout(()=>{child.kill();reject(new Error('Action timed out'));},20000);
        child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
      });
      assert.equal(result.code,mode==='strict-skip'?1:0,result.stderr+'\n'+result.stdout);
      assert.ok(requests.every(r=>r.authorization==='Bearer fake-api-key'));
      if(kind==='state'){
        assert.equal(requests.length,1);assert.equal(requests[0].method,'PATCH');assert.equal(requests[0].url,prefix+'target/state');assert.deepEqual(JSON.parse(requests[0].body),{action:'redeploy'});
        assert.match(result.stdout,/Environment state updated successfully/);
      }else{
        assert.deepEqual(requests.map(r=>[r.method,r.url]),[['GET',prefix+'target'],['GET',prefix+'source'],['POST',prefix+'target/sync/database'],...(mode==='success'?[['GET',prefix+'target/sync/database']]:[])]);
        assert.deepEqual(JSON.parse(requests[2].body),{sourceEnvironment:'source'});
        const data=await fs.readFile(output,'utf8');assert.match(data,new RegExp('success<<[^\\n]+\\n'+(mode==='success'?'true':'false')+'\\n'));
        if(mode==='success')assert.match(data,/sync_id<<[^\n]+\nfixture-sync\n/);else assert.match(data,/skipped<<[^\n]+\ntrue\n/);
      }
    }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(temp,{recursive:true,force:true});}
  });
 }
}
