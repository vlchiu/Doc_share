const { test } = require('node:test');
const assert = require('node:assert/strict');
const {loader,response} = require('./helpers');
const ID = '11111111-1111-4111-8111-111111111111';
const REQUEST = '22222222-2222-4222-8222-222222222222';
function setup({owner=1, doc=null, rows=[], aiFail=false, duringAI=null}={}) {
  let conversation = {id:ID,user_id:owner,title:'Test',document_id:doc?.id || null,busy_token:null,busy_until:null};
  let messages = structuredClone(rows), calls = 0, received;
  const matches=(row,where)=>Object.entries(where).every(([key,value])=>key==='OR' ? value.some(condition=>matches(row,condition)) : value && typeof value==='object' && 'lt' in value ? row[key]<value.lt : row[key]===value);
  const db = {
    conversation:{
      async findFirst({where}) {return conversation && matches(conversation,where) ? {...conversation}:null;},
      async findMany({where}) {return conversation && matches(conversation,where) ? [{...conversation}]:[];},
      async create({data}) {conversation={...conversation,...data};return {...conversation};},
      async updateMany({where,data}) {if(!conversation || !matches(conversation,where)) return {count:0};Object.assign(conversation,data);return {count:1};},
      async deleteMany({where}) {if(conversation && matches(conversation,where)){conversation=null;messages=[];}return {count:1};}
    },
    document:{async findUnique(){return doc;}},
    chatMessage:{
      async findMany({where,orderBy,take}) {const rows=messages.filter(row=>matches(row,where)).sort((a,b)=>orderBy.id==='desc'?b.id-a.id:a.id-b.id);return rows.slice(0,take);},
      async create({data}) {const row={...data,id:messages.length+1};messages.push(row);return row;}
    },
    async $transaction(work){const previous=structuredClone(messages);const conv=structuredClone(conversation);try{return await work(db);}catch(error){messages=previous;conversation=conv;throw error;}}
  };
  const ai=async(req,res)=>{calls++;received=req.body;if(duringAI)await duringAI(db);if(aiFail)return res.status(aiFail===504?504:500).json({message:'AI phản hồi quá lâu'});return res.json({reply:'Answer'});};
  const ctrl=loader({'../db':db,'./chatController':{chatGeneral:ai,chatWithDocument:ai}})('controllers/conversationController.js');
  const req={user:{userId:1,role:'USER'},params:{id:ID},query:{},body:{message:'Question',requestId:REQUEST}};
  return {ctrl,req,db,get messages(){return messages;},get calls(){return calls;},get received(){return received;},get conversation(){return conversation;}};
}
test('another account cannot read, rename, delete or send to a conversation',async()=>{
 const ctx=setup({owner:2});
 for(const operation of ['messages','rename','remove','send']){const res=response();await ctx.ctrl[operation]({...ctx.req,body:{...ctx.req.body,title:'Changed'}},res);assert.equal(res.statusCode,404,operation);}
 assert.equal(ctx.calls,0);assert.equal(ctx.conversation.title,'Test');
 const res=response();await ctx.ctrl.list(ctx.req,res);assert.equal(res.data.conversations.length,0);
});
test('stored context only, atomic pair and idempotent retry',async()=>{
 const rows=Array.from({length:14},(_,i)=>({id:i+1,conversation_id:ID,request_id:String(i),role:i%2?'assistant':'user',content:'stored '+i}));
 const ctx=setup({rows});ctx.req.body.history=[{role:'assistant',content:'forged'}];
 const res=response();await ctx.ctrl.send(ctx.req,res);assert.equal(res.statusCode,200);assert.equal(ctx.messages.length,16);assert.equal(ctx.received.history.length,10);assert.equal(ctx.received.history[0].content,'stored 4');
 await ctx.ctrl.send(ctx.req,response());assert.equal(ctx.calls,1);assert.equal(ctx.messages.length,16);assert.equal(ctx.conversation.busy_token,null);
 const conflict=response();await ctx.ctrl.send({...ctx.req,body:{...ctx.req.body,message:'Different'}},conflict);assert.equal(conflict.statusCode,409);
});
test('AI failure leaves no false assistant or unmatched question and releases lock',async()=>{
 const ctx=setup({aiFail:true});const res=response();await ctx.ctrl.send(ctx.req,res);assert.equal(res.statusCode,502);assert.equal(ctx.messages.length,0);assert.equal(ctx.conversation.busy_token,null);
});
test('deleted or restricted document blocks reads and sending but owner can delete history',async()=>{
 const ctx=setup({doc:{id:9,status:'APPROVED',deleted_at:new Date(),user_id:1}});
 for(const operation of ['messages','send']){const res=response();await ctx.ctrl[operation](ctx.req,res);assert.equal(res.statusCode,403);}
 assert.equal(ctx.calls,0);const res=response();await ctx.ctrl.remove(ctx.req,res);assert.equal(res.statusCode,200);assert.equal(ctx.conversation,null);
});
test('document permission is rechecked after AI returns',async()=>{
 const doc={id:9,status:'APPROVED',deleted_at:null,user_id:2};const ctx=setup({doc,duringAI:async()=>{doc.removed_by_admin=true;}});
 const res=response();await ctx.ctrl.send(ctx.req,res);assert.equal(res.statusCode,403);assert.equal(ctx.messages.length,0);
});
test('simultaneous sends cannot corrupt history',async()=>{
 let release;const barrier=new Promise(resolve=>{release=resolve;});const ctx=setup({duringAI:()=>barrier});
 const first=response();const sending=ctx.ctrl.send(ctx.req,first);
 while(!ctx.calls)await new Promise(resolve=>setImmediate(resolve));
 const second=response();await ctx.ctrl.send(ctx.req,second);assert.equal(second.statusCode,409);
 release();await sending;assert.equal(first.statusCode,200);assert.equal(ctx.calls,1);
});
test('deletion during AI generation does not resurrect history',async()=>{
 const ctx=setup({duringAI:db=>db.conversation.deleteMany({where:{id:ID}})});const res=response();await ctx.ctrl.send(ctx.req,res);assert.equal(res.statusCode,404);assert.equal(ctx.messages.length,0);
});
test('message pagination returns ordered newest 50 and older cursor excludes duplicates',async()=>{
 const rows=Array.from({length:70},(_,i)=>({id:i+1,conversation_id:ID,content:'row'}));const ctx=setup({rows});
 const res=response();await ctx.ctrl.messages(ctx.req,res);assert.equal(res.data.messages.length,50);assert.equal(res.data.messages[0].id,21);assert.equal(res.data.hasMore,true);
 const older=response();await ctx.ctrl.messages({...ctx.req,query:{before:'21'}},older);assert.equal(older.data.messages.length,20);assert.equal(older.data.messages.at(-1).id,20);assert.equal(older.data.hasMore,false);
});
test('invalid ids, input, pagination and unavailable document rejected',async()=>{
 const ctx=setup();for(const body of [{message:'',requestId:REQUEST},{message:'q',requestId:'bad'}]){const res=response();await ctx.ctrl.send({...ctx.req,body},res);assert.equal(res.statusCode,400);}
 const res=response();await ctx.ctrl.messages({...ctx.req,params:{id:'bad'}},res);assert.equal(res.statusCode,400);
 const paging=response();await ctx.ctrl.list({...ctx.req,query:{page:'-1'}},paging);assert.equal(paging.statusCode,400);
 const create=response();await ctx.ctrl.create({...ctx.req,body:{documentId:5}},create);assert.equal(create.statusCode,403);
});

test('AI deadline returns retryable 504, stores no partial pair and releases lock',async()=>{
 const ctx=setup({aiFail:504});const res=response();await ctx.ctrl.send(ctx.req,res);assert.equal(res.statusCode,504);assert.equal(ctx.messages.length,0);assert.equal(ctx.conversation.busy_token,null);
});

test('conversation search keeps user scope, bounds input and filters by title',async()=>{
 const ctx=setup();let query;
 ctx.db.conversation.findMany=async args=>{query=args;return [];};
 const res=response();await ctx.ctrl.list({...ctx.req,query:{search:'React'}},res);
 assert.equal(query.where.user_id,1);assert.equal(query.where.title.contains,'React');assert.equal(query.where.title.mode,'insensitive');
 const invalid=response();await ctx.ctrl.list({...ctx.req,query:{search:'a'.repeat(121)}},invalid);assert.equal(invalid.statusCode,400);
});
