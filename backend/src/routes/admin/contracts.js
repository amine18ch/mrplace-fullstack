const router  = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../../middleware/adminAuth');
const prisma = new PrismaClient();

// Générer une référence unique ex: MKT-2026-00042
const genRef = (id) => {
  const year = new Date().getFullYear();
  return `MKT-${year}-${String(id).padStart(5, '0')}`;
};

// Récupérer les settings de la plateforme
const getPlatformData = async () => {
  const settings = await prisma.platformSetting.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  return {
    nomMarketplace:         map['marketplace_name']     || 'MARKET Tunisia',
    formeJuridique:         map['marketplace_legal']    || 'SARL',
    capital:                map['marketplace_capital']  || 'N/A',
    rne:                    map['marketplace_rne']      || 'N/A',
    nif:                    map['marketplace_nif']      || 'N/A',
    adresse:                map['marketplace_address']  || 'Tunis, Tunisie',
    gerant:                 map['marketplace_manager']  || 'N/A',
    email:                  map['marketplace_email']    || 'contact@market.tn',
    tribunal:               map['marketplace_tribunal'] || 'Tribunal de Commerce de Tunis',
    inpdpDeclaration:       map['marketplace_inpdp']    || 'N/A',
  };
};

// ── GET /api/admin/contracts — liste tous les contrats
router.get('/', async (req, res) => {
  try {
    const contracts = await prisma.contract.findMany({
      include: { seller: { select: { id:true, name:true, email:true, slug:true, logo:true, isActive:true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contracts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/contracts/:id — détail contrat + données pour génération
router.get('/:id', async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { seller: true },
    });
    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    const platform = await getPlatformData();
    res.json({ contract, seller: contract.seller, platform });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/contracts/generate/:sellerId — créer ou régénérer un contrat
router.post('/generate/:sellerId', requireRole('SUPER_ADMIN', 'MODERATEUR'), async (req, res) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) return res.status(404).json({ error: 'Vendeur introuvable' });

    const {
      tauxCommission = 10, montantAbonnement = 0, tarifMiseEnAvant = 0,
      tauxRetenueSource = 0, frequenceVersement = 'Mensuel', seuilVersement = 100,
      delaiMiseEnDemeure = 5, delaiPreavisTarif = 30, delaiPreavisResiliation = 30,
      delaiRegularisation = 15, delaiSoldeCompte = 15, dureeInitiale = 12,
      dateDebut,
    } = req.body;

    // Vérifier si contrat existant
    const existing = await prisma.contract.findUnique({ where: { sellerId } });

    let contract;
    if (existing) {
      contract = await prisma.contract.update({
        where: { sellerId },
        data: {
          tauxCommission, montantAbonnement, tarifMiseEnAvant, tauxRetenueSource,
          frequenceVersement, seuilVersement, delaiMiseEnDemeure, delaiPreavisTarif,
          delaiPreavisResiliation, delaiRegularisation, delaiSoldeCompte, dureeInitiale,
          dateDebut: dateDebut ? new Date(dateDebut) : new Date(),
          status: 'DRAFT',
        },
        include: { seller: true },
      });
    } else {
      contract = await prisma.contract.create({
        data: {
          sellerId,
          ref: genRef(sellerId),
          tauxCommission, montantAbonnement, tarifMiseEnAvant, tauxRetenueSource,
          frequenceVersement, seuilVersement, delaiMiseEnDemeure, delaiPreavisTarif,
          delaiPreavisResiliation, delaiRegularisation, delaiSoldeCompte, dureeInitiale,
          dateDebut: dateDebut ? new Date(dateDebut) : new Date(),
          status: 'DRAFT',
        },
        include: { seller: true },
      });
    }

    const platform = await getPlatformData();
    res.json({ contract, seller: contract.seller, platform });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/admin/contracts/:id — mettre à jour les conditions tarifaires
router.patch('/:id', requireRole('SUPER_ADMIN', 'MODERATEUR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      tauxCommission, montantAbonnement, tarifMiseEnAvant, tauxRetenueSource,
      frequenceVersement, seuilVersement, delaiMiseEnDemeure, delaiPreavisTarif,
      delaiPreavisResiliation, delaiRegularisation, delaiSoldeCompte, dureeInitiale,
      status, dateDebut, dateSignatureMarket,
    } = req.body;
    const data = {};
    if (tauxCommission       !== undefined) data.tauxCommission       = parseFloat(tauxCommission);
    if (montantAbonnement    !== undefined) data.montantAbonnement    = parseFloat(montantAbonnement);
    if (tarifMiseEnAvant     !== undefined) data.tarifMiseEnAvant     = parseFloat(tarifMiseEnAvant);
    if (tauxRetenueSource    !== undefined) data.tauxRetenueSource    = parseFloat(tauxRetenueSource);
    if (frequenceVersement   !== undefined) data.frequenceVersement   = frequenceVersement;
    if (seuilVersement       !== undefined) data.seuilVersement       = parseFloat(seuilVersement);
    if (delaiMiseEnDemeure   !== undefined) data.delaiMiseEnDemeure   = parseInt(delaiMiseEnDemeure);
    if (delaiPreavisTarif    !== undefined) data.delaiPreavisTarif    = parseInt(delaiPreavisTarif);
    if (delaiPreavisResiliation !== undefined) data.delaiPreavisResiliation = parseInt(delaiPreavisResiliation);
    if (delaiRegularisation  !== undefined) data.delaiRegularisation  = parseInt(delaiRegularisation);
    if (delaiSoldeCompte     !== undefined) data.delaiSoldeCompte     = parseInt(delaiSoldeCompte);
    if (dureeInitiale        !== undefined) data.dureeInitiale        = parseInt(dureeInitiale);
    if (status               !== undefined) data.status               = status;
    if (dateDebut            !== undefined) data.dateDebut            = new Date(dateDebut);
    if (dateSignatureMarket  !== undefined) data.dateSignatureMarket  = new Date(dateSignatureMarket);
    const contract = await prisma.contract.update({ where: { id }, data, include: { seller: true } });
    res.json(contract);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/contracts/:id/send — marquer comme envoyé au vendeur
router.post('/:id/send', requireRole('SUPER_ADMIN', 'MODERATEUR'), async (req, res) => {
  try {
    const contract = await prisma.contract.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'SENT', dateSignatureMarket: new Date() },
      include: { seller: true },
    });
    res.json(contract);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/contracts/:id/sign — acceptation électronique (admin confirme signature vendeur)
router.post('/:id/sign', requireRole('SUPER_ADMIN', 'MODERATEUR'), async (req, res) => {
  try {
    const logRef = `LOG-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    const contract = await prisma.contract.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'SIGNED',
        dateSignatureClient: new Date(),
        logAcceptanceRef: logRef,
        signedByIp: req.ip,
      },
      include: { seller: true },
    });
    // Activer le vendeur si pas encore actif
    if (!contract.seller.isActive) {
      await prisma.seller.update({ where: { id: contract.sellerId }, data: { isActive: true, verified: true } });
    }
    res.json(contract);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/contracts/:id/html — HTML du contrat pour impression/PDF
router.get('/:id/html', async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { seller: true },
    });
    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    const platform = await getPlatformData();
    const s = contract.seller;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'long', year:'numeric' }) : '___________';

    const html = generateContractHtml({ contract, seller: s, platform, fmtDate });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Suppression
router.delete('/:id', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.contract.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════
//  Générateur HTML du contrat
// ════════════════════════════════════════════════════════
function generateContractHtml({ contract: c, seller: s, platform: p, fmtDate }) {
  const rep = (val, fallback = '___________') => val || fallback;
  const fmtNum = (n) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Contrat de Référencement - ${s.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; font-size:11pt; color:#1e293b; background:#fff; padding:20px; }
  @media print {
    body { padding:0; }
    .no-print { display:none !important; }
    @page { margin: 2cm 2.5cm; size: A4; }
  }
  .contract-container { max-width:800px; margin:0 auto; }
  .header { text-align:center; margin-bottom:32px; border-bottom:3px solid #2563EB; padding-bottom:20px; }
  .header h1 { font-size:22pt; font-weight:800; color:#0f172a; letter-spacing:-0.5px; }
  .header .platform { font-size:14pt; color:#2563EB; font-weight:600; margin-top:4px; }
  .header .subtitle { font-size:10pt; color:#64748b; margin-top:2px; }
  .meta-box { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#e2e8f0; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin-bottom:28px; }
  .meta-cell { background:#f8fafc; padding:12px 16px; }
  .meta-cell .label { font-size:8.5pt; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
  .meta-cell .value { font-size:12pt; font-weight:700; color:#2563EB; margin-top:2px; }
  .section { margin-bottom:24px; }
  .section-title { font-size:13pt; font-weight:700; color:#2563EB; border-bottom:1.5px solid #dbeafe; padding-bottom:6px; margin-bottom:14px; }
  .sub-title { font-size:11pt; font-weight:700; color:#334155; margin-bottom:10px; margin-top:16px; }
  .data-table { width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }
  .data-table td { padding:9px 14px; font-size:10pt; border-bottom:1px solid #f1f5f9; }
  .data-table td:first-child { color:#64748b; font-weight:600; width:40%; background:#f8fafc; }
  .data-table td:last-child { color:#2563EB; font-weight:600; }
  .data-table tr:last-child td { border-bottom:none; }
  .tariff-table { width:100%; border-collapse:collapse; margin:12px 0; }
  .tariff-table th { background:#1e3a8a; color:#fff; padding:9px 14px; font-size:9.5pt; text-align:left; font-weight:600; }
  .tariff-table td { padding:8px 14px; font-size:10pt; border-bottom:1px solid #e2e8f0; }
  .tariff-table td:nth-child(2) { color:#2563EB; font-weight:700; }
  .tariff-table tr:nth-child(even) td { background:#f8fafc; }
  p { margin-bottom:10px; font-size:10.5pt; line-height:1.6; }
  ul { margin:8px 0 10px 20px; }
  ul li { margin-bottom:4px; font-size:10pt; line-height:1.5; }
  .sign-section { margin-top:40px; display:grid; grid-template-columns:1fr 1fr; gap:40px; }
  .sign-box { border:1px solid #e2e8f0; border-radius:8px; padding:20px; }
  .sign-box .title { font-weight:700; color:#2563EB; font-size:10.5pt; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:8px; }
  .sign-box .field { margin-bottom:8px; font-size:10pt; }
  .sign-box .field span { color:#64748b; }
  .sign-box .signature-zone { height:60px; border:1px dashed #cbd5e1; border-radius:4px; margin-top:16px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:9pt; }
  .legal-note { background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:12px 16px; font-size:9pt; color:#1e40af; margin-top:20px; text-align:center; font-style:italic; }
  .status-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:9pt; font-weight:700; }
  .status-DRAFT    { background:#fef3c7; color:#92400e; }
  .status-SENT     { background:#dbeafe; color:#1e40af; }
  .status-SIGNED   { background:#d1fae5; color:#065f46; }
  .status-TERMINATED { background:#fee2e2; color:#991b1b; }
  .print-btn { position:fixed; bottom:24px; right:24px; background:#2563EB; color:#fff; border:none; padding:14px 24px; border-radius:50px; font-size:13pt; font-weight:700; cursor:pointer; box-shadow:0 4px 20px rgba(37,99,235,.4); z-index:100; }
  .print-btn:hover { background:#1d4ed8; }
</style>
</head>
<body>
<div class="contract-container">

  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <!-- En-tête -->
  <div class="header">
    <h1>CONTRAT DE RÉFÉRENCEMENT VENDEUR</h1>
    <div class="platform">${rep(p.nomMarketplace)}</div>
    <div class="subtitle">Plateforme de commerce électronique</div>
  </div>

  <!-- Méta -->
  <div class="meta-box">
    <div class="meta-cell"><div class="label">Référence contrat</div><div class="value">${c.ref}</div></div>
    <div class="meta-cell"><div class="label">Date de création</div><div class="value">${fmtDate(c.createdAt)}</div></div>
    <div class="meta-cell"><div class="label">Statut</div><div class="value"><span class="status-badge status-${c.status}">${c.status}</span></div></div>
    <div class="meta-cell"><div class="label">Validité</div><div class="value">${c.dureeInitiale} mois — renouvelable</div></div>
  </div>

  <p style="text-align:center;font-style:italic;font-weight:600;color:#64748b;">ENTRE LES SOUSSIGNÉS</p>

  <!-- Article 1 -->
  <div class="section">
    <div class="section-title">Article 1 — Identification des parties</div>
    <div class="sub-title">1.1 La Plateforme (Opérateur)</div>
    <table class="data-table">
      <tr><td>Dénomination sociale</td><td>${rep(p.nomMarketplace)}</td></tr>
      <tr><td>Forme juridique</td><td>${rep(p.formeJuridique)}</td></tr>
      <tr><td>Capital social</td><td>${rep(p.capital)}</td></tr>
      <tr><td>Registre national (RNE)</td><td>${rep(p.rne)}</td></tr>
      <tr><td>Matricule fiscal</td><td>${rep(p.nif)}</td></tr>
      <tr><td>Siège social</td><td>${rep(p.adresse)}</td></tr>
      <tr><td>Représentant légal</td><td>${rep(p.gerant)}</td></tr>
      <tr><td>Email</td><td>${rep(p.email)}</td></tr>
    </table>
    <div class="sub-title">1.2 Le Vendeur</div>
    <table class="data-table">
      <tr><td>Raison sociale / Nom</td><td>${rep(s.name)}</td></tr>
      <tr><td>Forme juridique</td><td>${rep(s.formeJuridique)}</td></tr>
      <tr><td>Matricule fiscal (NIF)</td><td>${rep(s.rc ? s.rc : s.application?.taxId)}</td></tr>
      <tr><td>Registre commerce (RC)</td><td>${rep(s.rc)}</td></tr>
      <tr><td>Patente n°</td><td>${rep(s.patente)}</td></tr>
      <tr><td>Adresse siège</td><td>${rep(s.adresseComplete || s.location)}</td></tr>
      <tr><td>Téléphone</td><td>${rep(s.phone)}</td></tr>
      <tr><td>Email professionnel</td><td>${rep(s.email)}</td></tr>
      <tr><td>Représentant / Gérant</td><td>${rep(s.gerant)}</td></tr>
      <tr><td>CIN représentant</td><td>${rep(s.cinGerant)}</td></tr>
    </table>
    <p>Ensemble désignés « les Parties ». Le présent contrat est conclu conformément à la loi n°2000-83 du 9 août 2000 relative aux échanges et au commerce électronique, au Code des Obligations et des Contrats (COC) tunisien, et à la loi organique n°2004-63 relative à la protection des données personnelles.</p>
  </div>

  <!-- Article 2 -->
  <div class="section">
    <div class="section-title">Article 2 — Objet du contrat</div>
    <p>Le présent contrat a pour objet de définir les conditions dans lesquelles la Plateforme accorde au Vendeur l'accès à son espace de vente en ligne, ainsi que les droits et obligations réciproques des Parties dans le cadre de cette relation commerciale.</p>
    <p>La Plateforme agit exclusivement en qualité d'intermédiaire technique de mise en relation entre le Vendeur et les acheteurs. Elle n'est ni co-vendeur ni mandataire du Vendeur dans la conclusion des transactions.</p>
  </div>

  <!-- Article 3 -->
  <div class="section">
    <div class="section-title">Article 3 — Conditions de référencement</div>
    <div class="sub-title">3.1 Catégorie de produits autorisée</div>
    <p>Le Vendeur est autorisé à référencer sur la Plateforme les produits et/ou services relevant de la catégorie suivante : <strong style="color:#2563EB">${rep(s.categorieAutorisee, 'Toutes catégories autorisées')}</strong>.</p>
    <div class="sub-title">3.2 Critères de classement</div>
    <p>Le classement des annonces est déterminé par : score d'évaluation acheteurs, taux de satisfaction des commandes, ancienneté sur la Plateforme, et pertinence des mots-clés.</p>
    <div class="sub-title">3.3 Conditions de déréférencement</div>
    <p>La Plateforme se réserve le droit de suspendre le référencement du Vendeur en cas de :</p>
    <ul>
      <li>Non-conformité fiscale ou absence de matricule fiscal valide</li>
      <li>Produits contrefaits, dangereux ou interdits par la législation tunisienne</li>
      <li>Taux de litiges supérieur à 15% sur 30 jours glissants</li>
      <li>Non-respect répété des délais de livraison annoncés</li>
      <li>Fraude ou manœuvres dolosives envers les acheteurs ou la Plateforme</li>
    </ul>
    <p>Toute suspension fait l'objet d'une notification préalable par email avec un délai de <strong>${c.delaiMiseEnDemeure}</strong> jours ouvrables pour régularisation, sauf en cas de fraude avérée.</p>
  </div>

  <!-- Article 4 -->
  <div class="section">
    <div class="section-title">Article 4 — Commissions et structure tarifaire</div>
    <table class="tariff-table">
      <thead><tr><th>Élément tarifaire</th><th>Taux / Montant</th><th>Conditions</th></tr></thead>
      <tbody>
        <tr><td>Commission sur ventes</td><td>${c.tauxCommission} %</td><td>Par transaction HT</td></tr>
        <tr><td>Abonnement mensuel</td><td>${fmtNum(c.montantAbonnement)} TND</td><td>Prélèvement le 1er du mois</td></tr>
        <tr><td>Mise en avant (optionnel)</td><td>${fmtNum(c.tarifMiseEnAvant)} TND/sem.</td><td>Sur demande</td></tr>
        <tr><td>Retenue à la source (si applicable)</td><td>${c.tauxRetenueSource} %</td><td>Art. 68 LF 2025 — vendeurs sans NIF</td></tr>
      </tbody>
    </table>
    <p>Toute modification tarifaire sera notifiée au Vendeur avec un préavis minimum de <strong>${c.delaiPreavisTarif}</strong> jours calendaires. L'absence de contestation vaut acceptation tacite.</p>
    <div class="sub-title">4.1 Modalités de versement au Vendeur</div>
    <table class="data-table">
      <tr><td>Banque</td><td>${rep(s.banque)}</td></tr>
      <tr><td>RIB / IBAN</td><td>${rep(s.rib || s.application?.bankAccount)}</td></tr>
      <tr><td>Fréquence de versement</td><td>${c.frequenceVersement}</td></tr>
      <tr><td>Seuil minimum de versement</td><td>${fmtNum(c.seuilVersement)} TND</td></tr>
    </table>
  </div>

  <!-- Article 5 -->
  <div class="section">
    <div class="section-title">Article 5 — Obligations du Vendeur</div>
    <div class="sub-title">5.1 Obligations fiscales et administratives</div>
    <ul>
      <li>Maintenir un matricule fiscal (NIF) valide et le communiquer sans délai en cas de changement</li>
      <li>Établir une facture conforme pour chaque transaction réalisée via la Plateforme</li>
      <li>Se conformer à toutes les obligations déclaratives envers la Direction Générale des Impôts</li>
    </ul>
    <div class="sub-title">5.2 Obligations commerciales</div>
    <ul>
      <li>Assurer l'exactitude et la mise à jour des descriptions, prix et stocks de ses annonces</li>
      <li>Respecter les délais de traitement des commandes annoncés sur la Plateforme</li>
      <li>Répondre aux réclamations acheteurs dans un délai maximum de 48 heures ouvrables</li>
      <li>Maintenir un taux de satisfaction acheteurs supérieur à 80%</li>
    </ul>
  </div>

  <!-- Article 6 -->
  <div class="section">
    <div class="section-title">Article 6 — Obligations de la Plateforme</div>
    <ul>
      <li>Assurer la disponibilité technique de la Plateforme avec un taux cible de 99,5%</li>
      <li>Traiter les paiements acheteurs via un PSP agréé par la Banque Centrale de Tunisie</li>
      <li>Notifier le Vendeur de toute modification des conditions contractuelles avec le préavis de ${c.delaiPreavisTarif} jours</li>
      <li>Mettre à disposition un tableau de bord permettant le suivi des commandes et versements</li>
      <li>Assurer la confidentialité des données commerciales du Vendeur conformément à la loi n°2004-63</li>
    </ul>
  </div>

  <!-- Article 7 -->
  <div class="section">
    <div class="section-title">Article 7 — Responsabilité et garanties</div>
    <div class="sub-title">7.1 Responsabilité du Vendeur</div>
    <p>Le Vendeur est seul responsable de la conformité des produits aux normes tunisiennes, des vices cachés (COC art. 645), de l'exactitude des informations publiées et du respect de ses obligations fiscales.</p>
    <div class="sub-title">7.2 Limitation de responsabilité de la Plateforme</div>
    <p>La Plateforme, en sa qualité d'intermédiaire technique, ne pourra être tenue responsable de la qualité des produits ni des litiges entre le Vendeur et les acheteurs. Sa responsabilité est plafonnée aux commissions perçues au cours des 3 mois précédant le fait générateur.</p>
  </div>

  <!-- Article 8, 9 -->
  <div class="section">
    <div class="section-title">Article 8 — Propriété intellectuelle</div>
    <p>Le Vendeur concède à la Plateforme une licence non exclusive d'utiliser les photos, descriptions et logos publiés sur ses annonces, aux seules fins de diffusion et promotion sur la Plateforme.</p>
    <div class="section-title" style="margin-top:20px;">Article 9 — Protection des données personnelles</div>
    <table class="data-table">
      <tr><td>Responsable du traitement</td><td>${rep(p.nomMarketplace)}</td></tr>
      <tr><td>Finalité du traitement</td><td>Gestion des comptes vendeurs, facturation, lutte antifraude</td></tr>
      <tr><td>Durée de conservation</td><td>5 ans après fin du contrat (obligation fiscale)</td></tr>
      <tr><td>Droits du Vendeur</td><td>Accès, rectification, opposition (Art. 32 loi 2004-63)</td></tr>
      <tr><td>Déclaration INPDP</td><td>${rep(p.inpdpDeclaration)}</td></tr>
    </table>
  </div>

  <!-- Article 10 -->
  <div class="section">
    <div class="section-title">Article 10 — Durée et résiliation</div>
    <div class="sub-title">10.1 Durée</div>
    <p>Le présent contrat entre en vigueur à compter du <strong>${fmtDate(c.dateDebut)}</strong> pour une durée initiale de <strong>${c.dureeInitiale}</strong> mois, renouvelable tacitement par périodes annuelles sauf dénonciation avec un préavis de <strong>${c.delaiPreavisResiliation}</strong> jours.</p>
    <div class="sub-title">10.2 Résiliation pour motif légitime</div>
    <p>Chaque Partie peut résilier le présent contrat pour motif légitime, après notification écrite et délai de régularisation de <strong>${c.delaiRegularisation}</strong> jours.</p>
    <div class="sub-title">10.3 Effets de la résiliation</div>
    <p>En cas de résiliation, la Plateforme procède au versement des sommes dues dans un délai de <strong>${c.delaiSoldeCompte}</strong> jours ouvrables après clôture du compte.</p>
  </div>

  <!-- Article 11, 12 -->
  <div class="section">
    <div class="section-title">Article 11 — Règlement des litiges</div>
    <p>À défaut de résolution amiable dans un délai de 30 jours, le litige sera soumis à la juridiction exclusive du <strong>${rep(p.tribunal)}</strong>, conformément au droit tunisien applicable.</p>
    <div class="section-title" style="margin-top:20px;">Article 12 — Dispositions diverses</div>
    <p>Le présent contrat constitue l'intégralité de l'accord entre les Parties et se substitue à tout accord antérieur. Si l'une des clauses était déclarée nulle, les autres demeurent pleinement en vigueur.</p>
  </div>

  <!-- Signatures -->
  <div class="sign-section">
    <div class="sign-box">
      <div class="title">Pour la Plateforme</div>
      <div class="field"><span>Nom du signataire :</span><br><strong>${rep(p.gerant)}</strong></div>
      <div class="field"><span>Qualité :</span> Gérant / Directeur Général</div>
      <div class="field"><span>Date :</span> ${fmtDate(c.dateSignatureMarket)}</div>
      <div class="signature-zone">Signature et cachet</div>
    </div>
    <div class="sign-box">
      <div class="title">Pour le Vendeur</div>
      <div class="field"><span>Nom du signataire :</span><br><strong>${rep(s.gerant || s.name)}</strong></div>
      <div class="field"><span>Qualité :</span> ${rep(s.qualiteSignataire, 'Gérant')}</div>
      <div class="field"><span>Date :</span> ${fmtDate(c.dateSignatureClient)}</div>
      <div class="signature-zone">${c.status === 'SIGNED' ? '✅ Signé électroniquement' : 'Signature et cachet'}</div>
    </div>
  </div>

  ${c.logAcceptanceRef ? `<div class="legal-note">
    Conformément à l'article 1 de la loi n°2000-83 du 9 août 2000, le clic de validation horodaté vaut signature au sens du droit tunisien (COC art. 453 bis).<br>
    Log d'acceptation conservé sous ref : <strong>${c.logAcceptanceRef}</strong>
  </div>` : ''}

</div>
</body>
</html>`;
}

module.exports = router;
