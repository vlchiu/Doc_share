const prisma = require('../db');

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { documents: true } } },
      orderBy: { id: 'asc' }
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền" });
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Tên danh mục không được để trống" });

    const existing = await prisma.category.findFirst({ where: { name: { equals: name.trim(), mode: 'insensitive' } } });
    if (existing) return res.status(400).json({ message: "Danh mục này đã tồn tại" });

    const cat = await prisma.category.create({ data: { name: name.trim(), description: description?.trim() || null } });
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền" });
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Tên danh mục không được để trống" });

    const existing = await prisma.category.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy danh mục" });

    const cat = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name: name.trim(), description: description?.trim() || null }
    });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền" });
    const { id } = req.params;
    const count = await prisma.document.count({ where: { category_id: parseInt(id), deleted_at: null } });
    if (count > 0) return res.status(400).json({ message: `Không thể xóa — danh mục đang có ${count} tài liệu` });

    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Đã xóa danh mục" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
