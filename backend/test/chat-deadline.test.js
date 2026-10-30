const {test} = require('node:test');
const assert = require('node:assert/strict');
const {withChatDeadline} = require('../utils/chatDeadline');
const {response} = require('./helpers');
test('deadline aborts upstream and ignores late handler output', async()=>{
 let upstream, finish; const barrier=new Promise(resolve=>{finish=resolve;});
 const handler=withChatDeadline(async(req,res)=>{upstream=req.signal;await barrier;res.json({reply:'late'});},10);
 const res=response();await handler({},res);assert.equal(res.statusCode,504);assert.equal(res.data.code,'CHAT_TIMEOUT');assert.equal(upstream.aborted,true);
 finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(res.statusCode,504);assert.equal(res.data.code,'CHAT_TIMEOUT');
});
test('deadline preserves successful or failed provider output',async()=>{
 for(const status of [200,400,500]) {const res=response();await withChatDeadline(async(req,buffer)=>buffer.status(status).json({reply:'test'}),100)({},res);assert.equal(res.statusCode,status);assert.equal(res.data.reply,'test');}
});
test('unexpected errors are sanitized',async()=>{
 const res=response();await withChatDeadline(async()=>{throw new Error('secret');},100)({},res);assert.equal(res.statusCode,503);assert.ok(!JSON.stringify(res.data).includes('secret'));
});
test('Gemini chat receives a cancellation signal and per-attempt timeout',async()=>{
 const {loader}=require('./helpers');let options;
 const controller=loader({'../db':{},'@google/generative-ai':{GoogleGenerativeAI:class {
  getGenerativeModel(){return {startChat(){return {async sendMessage(message,requestOptions){options=requestOptions;return {response:{text:()=> 'test reply'}};}};}};}
 }}},{GEMINI_API_KEY:'test-only'})('controllers/chatController.js');
 const res=response();await controller.chatGeneral({body:{message:'Xin chào',history:[]}},res);
 assert.equal(res.statusCode,200);assert.equal(res.data.reply,'test reply');assert.equal(options.timeout,20000);assert.equal(options.signal.aborted,false);
});
