import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSequentialPoller} from '../src/utils/sequentialPoller.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('manual and timed checks share one in-flight operation; stop suppresses stale success',async()=>{
 let calls=0,results=0,finish,signal;
 const poller=createSequentialPoller({intervalMs:5,task:s=>{calls++;signal=s;return new Promise(resolve=>{finish=resolve;});},onResult:()=>results++,onError:()=>{}});
 const first=poller.check();const second=poller.check();assert.equal(first,second);await sleep(25);assert.equal(calls,1);
 poller.stop();assert.equal(signal.aborted,true);finish('old');await first;await sleep(15);assert.equal(results,0);assert.equal(calls,1);
});
test('terminal result stops polling and ignores later manual checks',async()=>{
 let calls=0;const poller=createSequentialPoller({intervalMs:5,task:async()=>++calls,onResult:()=>false,onError:()=>{}});
 await poller.check();await sleep(20);await poller.check();assert.equal(calls,1);
});
test('temporary errors schedule another attempt without overlap',async()=>{
 let calls=0,errors=0;let finish;
 const done=new Promise(resolve=>{finish=resolve;});
 const poller=createSequentialPoller({intervalMs:5,task:async()=>{if(++calls===1)throw new Error('offline');return 'ok';},onResult:()=>{finish();return false;},onError:()=>errors++});
 try{await poller.check();await done;assert.equal(calls,2);assert.equal(errors,1);}finally{poller.stop();}
});
