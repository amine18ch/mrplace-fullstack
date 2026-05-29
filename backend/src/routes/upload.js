const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { auth } = require('../middleware/auth');
const { sellerAuth } = require('../middleware/sellerAuth');
const { adminAuth }  = require('../middleware/adminAuth');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

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

// DELETE /api/upload/:type/:filename — supprimer un fichier
router.delete('/:type/:filename', (req, res) => {
  try {
    const file = path.join(UPLOADS_DIR, req.params.type, req.params.filename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
