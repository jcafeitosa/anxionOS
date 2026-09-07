import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Runs original snapshot function bodies; dependencies are explicit synthetic fixtures.
// No network, real credentials, provider calls or upstream suite execution.
const root = resolve(process.argv[2] || '/tmp/anxionos-9router-review');
const results = [];
let serial = 0;
async function source(p) { return readFile(resolve(root, p), 'utf8'); }
async function moduleOf(p, prelude = '', replacements = []) {
  let s = await source(p);
  for (const [find, replace] of replacements) { assert(s.includes(find)); s = s.replace(find, replace); }
  s = s.replace(/^import\s[\s\S]*?;\s*$/gm, '');
  return import('data:text/javascript;base64,' + Buffer.from(prelude + '\n' + s + '\n//' + serial++).toString('base64'));
}
async function probe(id, fn) {
  try { results.push({ id, reproduced: true, ...(await fn()) }); }
  catch (e) { results.push({ id, reproduced: false, error: e.message }); process.exitCode = 1; }
}
const config = await import(pathToFileURL(resolve(root, 'open-sse/config/errorConfig.js')));
globalThis.__config = config;
const fallback = await moduleOf('open-sse/services/accountFallback.js', 'const {ERROR_RULES, BACKOFF_CONFIG, TRANSIENT_COOLDOWN_MS}=globalThis.__config;');
await probe('P01-global-lock-masked', async () => {
  const c = { modelLock_M: new Date(Date.now()-60000).toISOString(), modelLock___all: new Date(Date.now()+60000).toISOString() };
  assert.equal(fallback.isModelLockActive(c,'M'),false);
  assert.equal(fallback.isModelLockActive({modelLock___all:c.modelLock___all},'M'),true);
  return {observed:'Expired model lock masks active account-wide lock', expected:'Account remains blocked'};
});
await probe('P02-terminal-error-fallback', async () => {
  const r=fallback.checkFallbackError(422,'unsupported schema');assert.equal(r.shouldFallback,true);
  return {observed:r, expected:'Connections treats invalid contract as terminal'};
});
const rows = new Map();
const db = {
  transaction(fn){fn();},
  all(sql,args){return [...rows.values()].filter(r=>r.provider===args[0]);},
  run(sql,args){
    if(sql.startsWith('INSERT')){
      const [id,provider,authType,name,email,priority,isActive,data,createdAt,updatedAt]=args;
      rows.set(id,{id,provider,authType,name,email,priority,isActive,data,createdAt,updatedAt});
    } else if(sql.startsWith('UPDATE')) {rows.get(args[1]).priority=args[0];}
    else throw Error('Unmodeled SQL: '+sql);
  }
};
globalThis.__repo={getAdapter:async()=>db,uuidv4:()=>`fake-${serial++}`,parseJson:JSON.parse,stringifyJson:JSON.stringify};
const repo=await moduleOf('src/lib/db/repos/connectionsRepo.js','const {getAdapter,uuidv4,parseJson,stringifyJson}=globalThis.__repo;');
await probe('P03-api-display-name-merge',async()=>{
 const a=await repo.createProviderConnection({provider:'fake',authType:'apikey',name:'Production',apiKey:'synthetic-A'});
 const b=await repo.createProviderConnection({provider:'fake',authType:'apikey',name:'Production',apiKey:'synthetic-B'});
 assert.equal(a.id,b.id); assert.equal(rows.size,1); assert.equal(b.apiKey,'synthetic-B');
 return {observed:'Second same-name API account merges into first ID',expected:'Names are labels, not identity'};
});
globalThis.__thinking={getCapabilitiesForModel:()=>({reasoning:true,thinkingFormat:'gemini-level',maxOutput:65536}),getThinkingLevels:()=>['low','medium','high'],PROVIDERS:{}};
const maps=await moduleOf('open-sse/translator/concerns/thinking.js');globalThis.__maps=maps;
const thinking=await moduleOf('open-sse/translator/concerns/thinkingUnified.js','const {getCapabilitiesForModel,getThinkingLevels,PROVIDERS}=globalThis.__thinking; const {LEVEL_TO_BUDGET,budgetToLevel,effortToBudget,effortToThinkingLevel}=globalThis.__maps;');
await probe('P04-output-limit-raised',async()=>{
 const b={generationConfig:{maxOutputTokens:512}};
 thinking.applyThinking('gemini','synthetic-model',b,null,{mode:'level',level:'high'});
 assert(b.generationConfig.maxOutputTokens>512);
 return {observed:b.generationConfig.maxOutputTokens,requested:512,expected:'Reject incompatibility or explicit authorized adaptation, never raise hard limit'};
});
await probe('P05-unrelated-output-config-dropped',async()=>{
 const b={output_config:{effort:'high',format:{type:'synthetic-structured-format'}}};
 thinking.applyThinking('gemini','synthetic-model',b);
 assert.equal(b.output_config,undefined);
 return {observed:'Entire output_config removed',expected:'Validate/translate independent output fields; fixture does not certify a provider format'};
});
const models=await moduleOf('open-sse/services/model.js','const REGISTRY=[];');
await probe('P06-unknown-model-infers-provider',async()=>{
 const r=await models.getModelInfoCore('unregistered-synthetic-model',{});assert.equal(r.provider,'openai');
 return {observed:r,expected:'Connections rejects unregistered binding before dispatch'};
});
let conns=[{id:'A',priority:1},{id:'B',priority:2}];
globalThis.__auth={
 getProviderConnections:async()=>conns,validateApiKey:()=>true,
 updateProviderConnection:async(id,p)=>Object.assign(conns.find(c=>c.id===id),p),
 getSettings:async()=>({fallbackStrategy:'round-robin'}),getProxyPools:async()=>[],
 resolveConnectionProxyConfig:async()=>({}),pickProxyPoolId:()=>null,
 ...fallback,MAX_RATE_LIMIT_COOLDOWN_MS:1800000,resolveProviderId:x=>x,FREE_PROVIDERS:{},getAntigravityQuotaCache:()=>new Map(),
 log:{debug(){},warn(){},info(){},error(){}}
};
const auth=await moduleOf('src/sse/services/auth.js','const {getProviderConnections,validateApiKey,updateProviderConnection,getSettings,getProxyPools,resolveConnectionProxyConfig,pickProxyPoolId,formatRetryAfter,checkFallbackError,isModelLockActive,buildModelLockUpdate,getEarliestModelLockUntil,MAX_RATE_LIMIT_COOLDOWN_MS,resolveProviderId,FREE_PROVIDERS,getAntigravityQuotaCache,log}=globalThis.__auth;');
await probe('P07-sticky-round-robin',async()=>{
 const RealDate=Date;let tick=RealDate.now();
 globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[++tick]));} static now(){return tick;}};
 const sequence=[];
 try {for(let i=0;i<6;i++)sequence.push((await auth.getProviderCredentials('fake',null,'M')).connectionId);}
 finally {globalThis.Date=RealDate;}
 assert.deepEqual(sequence,['A','A','A','B','B','B']);
 return {observed:sequence,expected:'Connections PLATFORM alternation A B A B A B'};
});
await probe('P08-success-clears-active-global-lock',async()=>{
 const c={id:'A',testStatus:'unavailable',modelLock___all:new Date(Date.now()+60000).toISOString()};
 conns=[c];await auth.clearAccountError('A',c,'M');assert.equal(c.modelLock___all,null);
 return {observed:'Success clears active account-wide lock without checking its cause/version',expected:'An older success must not revoke a later independent quota block'};
});
const output={commit:'eb712ca821f0ba6bc41043fbd14494c5af5daba5',runtime:process.version,scope:'Original function bodies with mocked dependencies; no upstream suite or live provider tests',results};
console.log(JSON.stringify(output,null,2));
await writeFile('/tmp/anxionos-9router-probes-results.json',JSON.stringify(output,null,2)+'\n');
