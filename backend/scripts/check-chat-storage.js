// Integration smoke check: all temporary data is rolled back; no AI/provider calls.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const prisma = require('../db');
const rollback = new Error('EXPECTED_TEST_ROLLBACK');
(async () => {
  try {
    await prisma.$transaction(async tx => {
      const user = await tx.user.create({data:{name:'Chat storage test',email:`chat-check-${randomUUID()}@example.test`}});
      const conversation = await tx.conversation.create({data:{user_id:user.id,title:'Temporary test'}});
      const requestId = randomUUID();
      const question = await tx.chatMessage.create({data:{conversation_id:conversation.id,request_id:requestId,role:'user',content:'Question'}});
      const answer = await tx.chatMessage.create({data:{conversation_id:conversation.id,request_id:requestId,role:'assistant',content:'Answer'}});
      assert.ok(answer.id>question.id);
      const rows = await tx.chatMessage.findMany({where:{conversation_id:conversation.id},orderBy:{id:'desc'},take:10});
      assert.equal(rows.length,2);assert.equal(rows[0].content,'Answer');
      const lock = await tx.conversation.updateMany({where:{id:conversation.id,busy_until:null},data:{busy_token:requestId,busy_until:new Date(Date.now()+60000)}});
      assert.equal(lock.count,1);
      const duplicateLock = await tx.conversation.updateMany({where:{id:conversation.id,OR:[{busy_until:null},{busy_until:{lt:new Date()}}]},data:{busy_token:'other'}});
      assert.equal(duplicateLock.count,0);
      await tx.conversation.delete({where:{id:conversation.id}});
      assert.equal(await tx.chatMessage.count({where:{conversation_id:conversation.id}}),0);
      throw rollback;
    }, {timeout:30000});
  } catch(error) {if(error!==rollback) throw error;}
  console.log('PASS PostgreSQL create/read, ordered messages, conditional lock, cascading deletion; all test data rolled back.');
})().catch(error=>{console.error('Storage check failed:',error.code || error.name);process.exitCode=1;}).finally(()=>prisma.$disconnect());
