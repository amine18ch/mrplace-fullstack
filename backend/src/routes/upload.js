const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { auth } = require('../middleware/auth');
const { sellerAuth } = require('../middleware/sellerAuth');
const { adminAuth }  = require('../middleware/adminAuth');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

// Types de fichiers acceptés pour les documents légaux (PDF inclus)
const docFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou PDF.'));
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'misc';
    const dir  = path.join(UPLOADS_DIR, type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase().replace(/jpeg/, 'jpg');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Format non supporté. Utilisez JPEG, PNG ou WebP.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo max
});

// POST /api/upload/products — vendeur ou admin
router.post('/products', (req, res, next) => {
  // Auth flexible: seller ou user connecté
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  next();
}, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
}, (err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

// POST /api/upload/categories — admin uniquement
router.post('/categories', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const url = `/uploads/categories/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
}, (err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

// POST /api/upload/banners — admin/modérateur (image de fond bannière)
const bannerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_DIR, 'banners');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/jpeg/, 'jpg');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 Mo pour les banners
});

router.post('/banners', adminAuth, bannerUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const url = `/uploads/banners/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
}, (err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

// POST /api/upload/documents — documents légaux vendeur (PDF/image, 5Mo, admin ou seller)
const docUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_DIR, 'documents');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  fileFilter: docFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
});

router.post('/documents', (req, res, next) => {
  // Accessible par admin ou seller connecté
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  next();
}, docUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const url = `/uploads/documents/${req.file.filename}`;
  const isPdf = req.file.mimetype === 'application/pdf';
  res.json({ url, filename: req.file.filename, isPdf, originalName: req.file.originalname });
}, (err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

// DELETE /api/upload/:type/:filename — supprimer un fichier
router.delete('/:type/:filename', (req, res) => {
  try {
    const file = path.join(UPLOADS_DIR, req.params.type, req.params.filename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
