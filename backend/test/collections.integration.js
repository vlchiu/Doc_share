const assert = require('node:assert/strict');

const {
  PrismaClient
} = require('@prisma/client');

const {
  PrismaPg
} = require('@prisma/adapter-pg');

const {
  loader
} = require('./helpers');

if (!process.env.TEST_DATABASE_URL)
  throw new Error('Temporary test database required');

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.TEST_DATABASE_URL
  })
});

const controller = loader({
  '../db': db
})('controllers/collectionController.js');

async function call(name, user, params = {}, body = {}, query = {}) {
  const res = {
    statusCode: 200,
    set() {},

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.data = data;
    }
  };

  await controller[name]({
    user,
    params,
    body,
    query
  }, res);

  return res;
}

(async () => {
  const owner = await db.user.create({
    data: {
      name: 'Collections owner',
      email: 'collections-owner@example.test'
    }
  });

  const stranger = await db.user.create({
    data: {
      name: 'Collections other',
      email: 'collections-other@example.test'
    }
  });

  const u = {
          userId: owner.id,
          role: 'USER'
        },
        other = {
          userId: stranger.id,
          role: 'USER'
        };

  const category = await db.category.create({
    data: {
      name: 'Collections tests'
    }
  });

  const docs = [];

  for (const status of ['APPROVED', 'PENDING', 'APPROVED']) docs.push(await db.document.create({
    data: {
      title: `Collection ${status} ${docs.length}`,
      file_url: 'https://secret.invalid/file',
      file_type: 'pdf',
      user_id: owner.id,
      category_id: category.id,
      status
    }
  }));

  assert.equal((await call('create', u, {}, {
    name: ' ',
    visibility: 'PUBLIC'
  })).statusCode, 400);

  const created = await call('create', u, {}, {
    name: 'Bộ sưu tập',
    description: 'Tiếng Việt',
    visibility: 'PRIVATE'
  });

  assert.equal(created.statusCode, 201);
  const id = created.data.id;

  assert.equal((await call('read', other, {
    id
  })).statusCode, 404);

  assert.equal((await call('read', undefined, {
    id
  })).statusCode, 404);

  for (const name of ['update', 'remove', 'addItem', 'removeItem', 'moveItem']) {
    const result = await call(name, other, {
      id,
      documentId: docs[0].id
    }, {
      name: 'Stolen',
      visibility: 'PUBLIC',
      document_id: docs[0].id,
      direction: 'up'
    });

    assert.equal(result.statusCode, 404, name);
  }

  const added = await Promise.all([...docs, docs[0]].map(d => call('addItem', u, {
    id
  }, {
    document_id: d.id
  })));

  assert.ok(added.every(r => r.statusCode === 200));

  assert.equal(await db.collectionItem.count({
    where: {
      collection_id: id
    }
  }), 3);

  const positions = await db.collectionItem.findMany({
    where: {
      collection_id: id
    }
  });

  assert.equal(new Set(positions.map(i => i.position)).size, 3);

  assert.equal((await call('read', u, {
    id
  })).data.items.length, 3);

  await call('update', u, {
    id
  }, {
    name: 'Public',
    visibility: 'PUBLIC'
  });

  const publicView = await call('read', undefined, {
    id
  });

  assert.equal(publicView.data.items.length, 2);
  assert.ok(publicView.data.items.every(i => !('file_url' in i.document)));

  const ownView = await call('read', u, {
    id
  });

  const lastId = ownView.data.items.at(-1).document.id;

  await call('moveItem', u, {
    id,
    documentId: lastId
  }, {
    direction: 'up'
  });

  const moved = await call('read', u, {
    id
  });

  assert.equal(moved.data.items[1].document.id, lastId);

  assert.equal((await call('read', undefined, {
    id
  }, {}, {
    q: 'PENDING'
  })).data.items.length, 0);

  await db.document.update({
    where: {
      id: docs[0].id
    },

    data: {
      deleted_at: new Date()
    }
  });

  assert.equal((await call('read', undefined, {
    id
  })).data.items.length, 1);

  assert.equal((await call('addItem', u, {
    id
  }, {
    document_id: docs[0].id
  })).statusCode, 404);

  await db.document.update({
    where: {
      id: docs[2].id
    },

    data: {
      removed_by_admin: true
    }
  });

  assert.equal((await call('read', undefined, {
    id
  })).data.items.length, 0);

  assert.equal((await call('list', u)).data.find(c => c.id === id)._count.items, 1);

  await call('removeItem', u, {
    id,
    documentId: docs[1].id
  });

  assert.ok(await db.document.findUnique({
    where: {
      id: docs[1].id
    }
  }));

  await call('remove', u, {
    id
  });

  assert.equal(await db.collectionItem.count({
    where: {
      collection_id: id
    }
  }), 0);

  assert.equal(await db.document.count({
    where: {
      user_id: owner.id
    }
  }), 3);

  console.log(
    'PASS collections: ownership, public/private filtering, concurrent/idempotent add, reorder, search, revoked documents, safe deletion.'
  );
})().finally(() => db.$disconnect()).catch(e => {
  console.error(e);
  process.exitCode = 1;
});
