const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List attributes for a category
router.get('/:categoryId', async (req, res) => {
  try {
    const attrs = await prisma.categoryAttribute.findMany({
      where: { categoryId: parseInt(req.params.categoryId) },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(attrs.map(a => ({ ...a, options: JSON.parse(a.options) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create attribute
router.post('/', async (req, res) => {
  try {
    const { categoryId, name, slug, type, options, isRequired, sortOrder } = req.body;
    const attr = await prisma.categoryAttribute.create({
      data: {
        categoryId: parseInt(categoryId),
        name, slug: slug || name.toLowerCase().replace(/\s+/g, '_'),
        type: type || 'TEXT',
        options: JSON.stringify(options || []),
        isRequired: !!isRequired,
        sortOrder: sortOrder || 0,
      },
    });
    res.json({ ...attr, options: JSON.parse(attr.options) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update attribute
router.put('/:id', async (req, res) => {
  try {
    const { name, type, options, isRequired, sortOrder } = req.body;
    const attr = await prisma.categoryAttribute.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type, options: JSON.stringify(options || []), isRequired: !!isRequired, sortOrder: sortOrder || 0 },
    });
    res.json({ ...attr, options: JSON.parse(attr.options) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete attribute
router.delete('/:id', async (req, res) => {
  try {
    await prisma.categoryAttribute.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
