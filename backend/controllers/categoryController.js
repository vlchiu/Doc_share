const prisma = require('../db');

const getCategories = async (req, res) => {
  try {
    let categories = await prisma.category.findMany();
    const existingNames = categories.map(c => c.name);

    // Danh sách 4 danh mục chuẩn
    const defaultCategories = [
      { name: "Toán học", description: "Tài liệu môn Toán" },
      { name: "Lập trình", description: "Tài liệu Công nghệ thông tin" },
      { name: "Ngoại ngữ", description: "Tài liệu Tiếng Anh, Nhật, Hàn..." },
      { name: "Tổng hợp", description: "Các tài liệu khác" }
    ];

    let isAddedNew = false;

    // Quét xem cái nào chưa có thì thêm vào
    for (let cat of defaultCategories) {
      if (!existingNames.includes(cat.name)) {
        await prisma.category.create({ data: cat });
        isAddedNew = true;
      }
    }

    // Nếu vừa thêm mới, gọi database lấy lại danh sách đầy đủ
    if (isAddedNew) {
      categories = await prisma.category.findMany();
    }

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { getCategories };