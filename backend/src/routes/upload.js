const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

// Créer un storage fixe par type (évite req.params.type undefined)
const makeStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.jpeg', '.jpg');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const imgFilter = (req, file, cb) => {
  if (['image/jpeg','image/png','image/webp','image/jpg'].includes(file.mimetype)) cb(null, true);
  else cb(new Error('Format non supporté. Utilisez JPEG, PNG ou WebP.'));
};

const docFilter = (req, file, cb) => {
  if (['image/jpeg','image/png','image/webp','image/jpg','application/pdf'].includes(file.mimetype)) cb(null, true);
  else cb(new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou PDF.'));
};

// Multer instances
const uploaders = {
  products:  multer({ storage: makeStorage('products'),  fileFilter: imgFilter, limits: { fileSize: 2*1024*1024 } }),
  categories:multer({ storage: makeStorage('categories'),fileFilter: imgFilter, limits: { fileSize: 500*1024   } }),
  banners:   multer({ storage: makeStorage('banners'),   fileFilter: imgFilter, limits: { fileSize: 3*1024*1024 } }),
  logos:     multer({ storage: makeStorage('logos'),     fileFilter: imgFilter, limits: { fileSize: 1*1024*1024 } }),
  documents: multer({ storage: makeStorage('documents'), fileFilter: docFilter, limits: { fileSize: 5*1024*1024 } }),
};

// Helper : vérifier présence du token sans valider (upload public-auth)
const hasToken = (req) => !!req.headers.authorization?.replace('Bearer ', '');

// ── POST /api/upload/products
router.post('/products', (req, res) => {
  if (!hasToken(req)) return res.status(401).json({ error: 'Non authentifié' });
  uploaders.products.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    res.json({ url: `/uploads/products/${req.file.filename}` });
  });
});

// ── POST /api/upload/categories (admin)
router.post('/categories', (req, res) => {
  if (!hasToken(req)) return res.status(401).json({ error: 'Non authentifié' });
  uploaders.categories.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    res.json({ url: `/uploads/categories/${req.file.filename}` });
  });
});

// ── POST /api/upload/banners (admin)
router.post('/banners', (req, res) => {
  if (!hasToken(req)) return res.status(401).json({ error: 'Non authentifié' });
  uploaders.banners.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    res.json({ url: `/uploads/banners/${req.file.filename}` });
  });
});

// ── POST /api/upload/logos (admin ou seller)
router.post('/logos', (req, res) => {
  if (!hasToken(req)) return res.status(401).json({ error: 'Non authentifié' });
  uploaders.logos.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    res.json({ url: `/uploads/logos/${req.file.filename}`, filename: req.file.filename });
  });
});

// ── POST /api/upload/documents (admin ou seller) — PDF, images, 5 Mo
router.post('/documents', (req, res) => {
  if (!hasToken(req)) return res.status(401).json({ error: 'Non authentifié' });
  uploaders.documents.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    res.json({
      url:          `/uploads/documents/${req.file.filename}`,
      filename:     req.file.filename,
      isPdf:        req.file.mimetype === 'application/pdf',
      originalName: req.file.originalname,
    });
  });
});

// ── DELETE /api/upload/:type/:filename
router.delete('/:type/:filename', (req, res) => {
  try {
    const allowed = ['products','categories','banners','logos','documents'];
    if (!allowed.includes(req.params.type)) return res.status(400).json({ error: 'Type invalide' });
    const file = path.join(UPLOADS_DIR, req.params.type, path.basename(req.params.filename));
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
