const prisma = require('../db');

const {
  readableWhere,
  publicDocument
} = require('../utils/documentAccess');

const fail = (status, message) => Object.assign(new Error(message), {
  status
});

const idOf = value => {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw fail(400, 'ID không hợp lệ.');

  return Number(value);
};

const wrap = fn => async (req, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    await fn(req, res);
  } catch (e) {
    res.status(e.status || 503).json({
      message: e.status ? e.message : 'Chưa thể xử lý bộ sưu tập. Vui lòng thử lại.'
    });
  }
};

function fields(body) {
  if (typeof body?.name !== 'string' || !body.name.trim() || body.name.trim().length > 120 || (body.description != null && (typeof body.description !== 'string' || body.description.length > 2000)) || !['PRIVATE', 'PUBLIC'].includes(body.visibility)) throw fail(
    400,
    'Tên tối đa 120 ký tự, mô tả tối đa 2000 ký tự và quyền hiển thị hợp lệ.'
  );

  return {
    name: body.name.trim(),
    description: body.description?.trim() || '',
    visibility: body.visibility
  };
}

async function owned(tx, req) {
  const id = idOf(req.params.id);

  // Serialize all item mutations, including concurrent add and reorder.
  await tx.$queryRaw`SELECT id FROM "Collection" WHERE id = ${id} FOR UPDATE`;

  const collection = await tx.collection.findUnique({
    where: {
      id
    }
  });

  if (!collection || collection.user_id !== req.user.userId)
    throw fail(404, 'Không tìm thấy bộ sưu tập.');

  return collection;
}

exports.list = wrap(async (req, res) => {
  const data = await prisma.collection.findMany({
    where: {
      user_id: req.user.userId
    },

    orderBy: [{
      updated_at: 'desc'
    }, {
      id: 'desc'
    }],

    include: {
      _count: {
        select: {
          items: {
            where: {
              document: readableWhere(req.user)
            }
          }
        }
      }
    }
  });

  res.json(data);
});

exports.create = wrap(async (req, res) => {
  res.status(201).json(await prisma.collection.create({
    data: {
      ...fields(req.body),
      user_id: req.user.userId
    }
  }));
});

exports.read = wrap(async (req, res) => {
  const collection = await prisma.collection.findUnique({
    where: {
      id: idOf(req.params.id)
    }
  });

  if (!collection || (collection.visibility !== 'PUBLIC' && collection.user_id !== req.user?.userId))
    throw fail(404, 'Không tìm thấy bộ sưu tập.');

  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 200) : '';

  const items = await prisma.collectionItem.findMany({
    where: {
      collection_id: collection.id,

      document: {
        AND: [readableWhere(req.user), ...(q ? [{
          OR: [{
            title: {
              contains: q,
              mode: 'insensitive'
            }
          }, {
            description: {
              contains: q,
              mode: 'insensitive'
            }
          }]
        }] : [])]
      }
    },

    orderBy: [{
      position: 'asc'
    }, {
      document_id: 'asc'
    }],

    include: {
      document: {
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          },

          category: true
        }
      }
    }
  });

  res.json({
    ...collection,
    is_owner: collection.user_id === req.user?.userId,

    items: items.map(item => ({
      position: item.position,
      document: publicDocument(item.document)
    }))
  });
});

exports.update = wrap(async (req, res) => {
  const data = fields(req.body);

  res.json(await prisma.$transaction(async tx => {
    const c = await owned(tx, req);

    return tx.collection.update({
      where: {
        id: c.id
      },

      data
    });
  }));
});

exports.remove = wrap(async (req, res) => {
  await prisma.$transaction(async tx => {
    const c = await owned(tx, req);

    await tx.collection.delete({
      where: {
        id: c.id
      }
    });
  });

  res.json({
    message: 'Đã xóa bộ sưu tập. Tài liệu gốc được giữ lại.'
  });
});

exports.addItem = wrap(async (req, res) => {
  const documentId = idOf(req.body?.document_id);

  await prisma.$transaction(async tx => {
    const c = await owned(tx, req);

    const document = await tx.document.findFirst({
      where: {
        id: documentId,
        ...readableWhere(req.user)
      }
    });

    if (!document)
      throw fail(404, 'Tài liệu không tồn tại hoặc không có quyền truy cập.');

    const last = await tx.collectionItem.aggregate({
      where: {
        collection_id: c.id
      },

      _max: {
        position: true
      }
    });

    await tx.collectionItem.upsert({
      where: {
        collection_id_document_id: {
          collection_id: c.id,
          document_id: documentId
        }
      },

      create: {
        collection_id: c.id,
        document_id: documentId,
        position: (last._max.position ?? -1) + 1
      },

      update: {}
    });

    await tx.collection.update({
      where: {
        id: c.id
      },

      data: {
        updated_at: new Date()
      }
    });
  });

  res.json({
    message: 'Đã thêm vào bộ sưu tập.'
  });
});

exports.removeItem = wrap(async (req, res) => {
  const documentId = idOf(req.params.documentId);

  await prisma.$transaction(async tx => {
    const c = await owned(tx, req);

    await tx.collectionItem.deleteMany({
      where: {
        collection_id: c.id,
        document_id: documentId
      }
    });

    await tx.collection.update({
      where: {
        id: c.id
      },

      data: {
        updated_at: new Date()
      }
    });
  });

  res.json({
    message: 'Đã bỏ tài liệu khỏi bộ sưu tập.'
  });
});

exports.moveItem = wrap(async (req, res) => {
  const documentId = idOf(req.params.documentId);

  if (!['up', 'down'].includes(req.body?.direction))
    throw fail(400, 'Hướng sắp xếp không hợp lệ.');

  await prisma.$transaction(async tx => {
    const c = await owned(tx, req);

    const items = await tx.collectionItem.findMany({
      where: {
        collection_id: c.id,
        document: readableWhere(req.user)
      },

      orderBy: [{
        position: 'asc'
      }, {
        document_id: 'asc'
      }]
    });

    const i = items.findIndex(x => x.document_id === documentId);

    if (i < 0)
      throw fail(404, 'Không tìm thấy tài liệu.');

    const other = items[i + (req.body.direction === 'up' ? -1 : 1)];

    if (!other)
      return;

    for (const [item, position] of [[items[i], other.position], [other, items[i].position]]) await tx.collectionItem.update({
      where: {
        collection_id_document_id: {
          collection_id: c.id,
          document_id: item.document_id
        }
      },

      data: {
        position
      }
    });

    await tx.collection.update({
      where: {
        id: c.id
      },

      data: {
        updated_at: new Date()
      }
    });
  });

  res.json({
    message: 'Đã sắp xếp tài liệu.'
  });
});
