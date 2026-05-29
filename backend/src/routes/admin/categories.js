const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// GET /api/admin/categories — arbre complet (visibles + masquées)
router.get('/', async (req, res) => {
  try {
    const all = await prisma.category.findMany({
      include: {
        _count: { select: { products: true, children: true } },
      },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
    const parents  = all.filter(c => !c.parentId);
    const children = all.filter(c => !!c.parentId);
    const tree = parents.map(p => ({
      ...p,
      children: children.filter(c => c.parentId === p.id),
    }));
    res.json(tree);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/categories — créer une catégorie ou sous-catégorie
router.post('/', requireRole('SUPER_ADMIN', 'MODERATEUR'), async (req, res) => {
  try {
    const { name, icon, slug, parentId, sortOrder } = req.body;
    if (!name || !icon) return res.status(400).json({ error: 'Nom et icône requis' });

    const baseSlug = slug || name.toLowerCase()
      .replace(/[àáâãäå]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
      .replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

    // Garantir l'unicité du slug
    let finalSlug = baseSlug;
    let i = 1;
    while (await prisma.category.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${i++}`;
    }

    const cat = await prisma.category.create({
      data: {
        name, icon, slug: finalSlug,
        parentId: parentId ? parseInt(parentId) : null,
        sortOrder: sortOrder || 0,
        isVisible: true,
      },
    });
    res.json(cat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/categories/:id — modifier
router.put('/:id', requireRole('SUPER_ADMIN', 'MODERATEUR'), async (req, res) => {
  try {
    const { name, icon, parentId, sortOrder } = req.body;
    const id = parseInt(req.params.id);

    // Empêcher de se mettre en tant que parent de soi-même
    if (parentId && parseInt(parentId) === id) {
      return res.status(400).json({ error: 'Une catégorie ne peut pas être son propre parent' });
    }

    const cat = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(parentId !== undefined && { parentId: parentId ? parseInt(parentId) : null }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) || 0 }),
      },
    });
    res.json(cat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/categories/:id/visibility — masquer/afficher
router.patch('/:id/visibility', requireRole('SUPER_ADMIN', 'MODERATEUR'), async (req, res) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
    const updated = await prisma.category.update({
      where: { id: cat.id },
      data: { isVisible: !cat.isVisible },
    });
    // Si on masque une catégorie parente, masquer aussi les enfants
    if (!updated.isVisible && !cat.parentId) {
      await prisma.category.updateMany({
        where: { parentId: cat.id },
        data: { isVisible: false },
      });
    }
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cat = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
    if (cat._count.products > 0) {
      return res.status(400).json({ error: `Impossible : ${cat._count.products} produit(s) dans cette catégorie. Déplacez-les d'abord.` });
    }
    if (cat._count.children > 0) {
      return res.status(400).json({ error: `Impossible : cette catégorie a ${cat._count.children} sous-catégorie(s). Supprimez-les d'abord.` });
    }
    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
