import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const path=process.argv[2];
let source=await readFile(path,'utf8');
source=source.replace(/^import\s[\s\S]*?;\s*$/gm,'');
const {isModelLockActive}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const past=new Date(Date.now()-60000).toISOString();
const future=new Date(Date.now()+60000).toISOString();
const cases=[
 ['no locks',{},'M',false],
 ['expired specific, active global',{modelLock_M:past,modelLock___all:future},'M',true],
 ['active specific, expired global',{modelLock_M:future,modelLock___all:past},'M',true],
 ['both expired',{modelLock_M:past,modelLock___all:past},'M',false],
 ['global only',{modelLock___all:future},'M',true],
 ['null model',{modelLock___all:future},null,true],
 ['invalid specific, active global',{modelLock_M:'invalid',modelLock___all:future},'M',true],
 ['different model',{modelLock_N:future},'M',false]
];
let failures=0;
for(const [name,c,m,expected] of cases){try{assert.equal(isModelLockActive(c,m),expected);console.log('PASS '+name);}catch{failures++;console.log('FAIL '+name);}}
console.log(JSON.stringify({cases:cases.length,failures}));process.exitCode=failures?1:0;
