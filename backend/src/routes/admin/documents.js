/**
 * Génération de documents officiels — Finance & Transport
 * Basé sur la législation tunisienne :
 * - Loi n°2000-83 du 9 août 2000 (e-commerce)
 * - Code de l'IRPP et de l'IS (retenue à la source Art. 52)
 * - Loi de Finances 2025 (Art. 68 — retenue sur paiements plateformes)
 * - Code de la TVA (taux 19%)
 * - Arrêté du Ministère du Transport (feuille de route, bon de livraison)
 * - Note commune n°14/2022 — DGI (facturation électronique)
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// Auth via token (header ou query param pour les iframes)
const auth = async (req, res, next) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send('<h1>Non authentifié</h1>');
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).send('<h1>Session expirée</h1>'); }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum  = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const now = () => new Date();
const genRef  = prefix => `${prefix}-${now().getFullYear()}${String(now().getMonth()+1).padStart(2,'0')}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

const getPlatform = async () => {
  const settings = await prisma.platformSetting.findMany();
  const m = Object.fromEntries(settings.map(s => [s.key, s.value]));
  return {
    name:    m['marketplace_name']    || 'MARKET Tunisia',
    legal:   m['marketplace_legal']   || 'SARL',
    nif:     m['marketplace_nif']     || 'N/A',
    rne:     m['marketplace_rne']     || 'N/A',
    address: m['marketplace_address'] || 'Tunis, Tunisie',
    email:   m['marketplace_email']   || 'contact@market.tn',
    tel:     m['marketplace_tel']     || 'N/A',
    manager: m['marketplace_manager'] || 'N/A',
    rc:      m['marketplace_rc']      || 'N/A',
  };
};

const CSS_BASE = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;font-size:10.5pt;color:#0f172a;background:#f8fafc;padding:0}
  @page{margin:2cm 2.5cm;size:A4}
  @media print{body{background:#fff;padding:0}.no-print{display:none!important}}
  .doc{max-width:800px;margin:0 auto;background:#fff;padding:32px;min-height:100vh}
  .toolbar{position:fixed;top:0;left:0;right:0;background:#0f172a;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;z-index:100}
  .toolbar-title{font-weight:700;font-size:13px}
  .btn-print{background:#2563eb;color:#fff;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
  .btn-print:hover{background:#1d4ed8}
  .doc-body{margin-top:48px}
  .header{border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:20px;display:grid;grid-template-columns:1fr auto;gap:16px}
  .header-left h1{font-size:16pt;font-weight:800;color:#0f172a}
  .header-left .subtitle{color:#2563eb;font-weight:600;font-size:11pt;margin-top:2px}
  .header-right{text-align:right;font-size:9pt;color:#475569}
  .header-right strong{display:block;color:#0f172a;font-size:10pt}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
  .meta-box{border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#f8fafc}
  .meta-box h3{font-size:8pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
  .meta-row{display:flex;justify-content:space-between;font-size:9.5pt;margin-bottom:3px}
  .meta-row .label{color:#64748b}
  .meta-row .value{font-weight:600;color:#0f172a}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  table.main th{background:#1e3a8a;color:#fff;padding:9px 12px;font-size:9pt;text-align:left;font-weight:600}
  table.main td{padding:8px 12px;font-size:9.5pt;border-bottom:1px solid #f1f5f9}
  table.main tr:nth-child(even) td{background:#f8fafc}
  table.main td.num{text-align:right;font-family:monospace}
  table.main tfoot td{background:#1e3a8a;color:#fff;font-weight:700;padding:10px 12px}
  table.main tfoot td.num{text-align:right}
  .legal-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;font-size:8.5pt;color:#1e40af;margin:16px 0}
  .legal-box strong{display:block;margin-bottom:4px;font-size:9pt}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px}
  .sign-box{border:1px solid #e2e8f0;border-radius:6px;padding:16px;text-align:center}
  .sign-box p{font-size:9pt;color:#64748b;margin-bottom:4px}
  .sign-box strong{font-size:10pt}
  .sign-line{height:50px;border-bottom:1px dashed #cbd5e1;margin:12px 0}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:8.5pt;font-weight:700}
  .badge-green{background:#d1fae5;color:#065f46}
  .badge-blue{background:#dbeafe;color:#1e40af}
  .badge-red{background:#fee2e2;color:#991b1b}
  .badge-orange{background:#ffedd5;color:#9a3412}
  .page-break{page-break-before:always}
  .highlight{background:#fefce8;border-left:3px solid #eab308;padding:8px 12px;font-size:9pt;margin:10px 0}
  .total-line{border-top:2px solid #0f172a;padding-top:8px;margin-top:8px}
</style>`;

const toolbarHtml = (title) => `
<div class="toolbar no-print">
  <span class="toolbar-title">📄 ${title}</span>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimer / Enregistrer PDF</button>
</div>`;

// ════════════════════════════════════════════════════════════════════════════
// FINANCE DOCUMENTS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/documents/finance/bordereau-versement/:cycleId
router.get('/finance/bordereau-versement/:cycleId', auth, async (req, res) => {
  try {
    const cycle = await prisma.paymentCycle.findUnique({
      where: { id: parseInt(req.params.cycleId) },
      include: { seller: true },
    });
    if (!cycle) return res.status(404).send('<h1>Cycle introuvable</h1>');

    const platform = await getPlatform();
    const ref = genRef('BV');
    const tvaRate = 0.19;
    const commissionHT = cycle.commission / (1 + tvaRate);
    const tva = cycle.commission - commissionHT;

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bordereau de Versement ${ref}</title>${CSS_BASE}</head>
<body>
${toolbarHtml(`Bordereau de Versement — ${cycle.seller.name}`)}
<div class="doc doc-body">
  <div class="header">
    <div class="header-left">
      <h1>BORDEREAU DE VERSEMENT</h1>
      <div class="subtitle">${platform.name} — Marketplace Tunisia</div>
    </div>
    <div class="header-right">
      <strong>Réf : ${ref}</strong>
      Date : ${fmtDate(now())}<br>
      N° fiscal : ${platform.nif}<br>
      RNE : ${platform.rne}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <h3>La Plateforme (Donneur d'ordre)</h3>
      <div class="meta-row"><span class="label">Raison sociale</span><span class="value">${platform.name}</span></div>
      <div class="meta-row"><span class="label">Forme juridique</span><span class="value">${platform.legal}</span></div>
      <div class="meta-row"><span class="label">NIF</span><span class="value">${platform.nif}</span></div>
      <div class="meta-row"><span class="label">Adresse</span><span class="value">${platform.address}</span></div>
    </div>
    <div class="meta-box">
      <h3>Le Vendeur (Bénéficiaire)</h3>
      <div class="meta-row"><span class="label">Raison sociale</span><span class="value">${cycle.seller.name}</span></div>
      <div class="meta-row"><span class="label">NIF</span><span class="value">${cycle.seller.rc || cycle.seller.application?.taxId || 'N/A'}</span></div>
      <div class="meta-row"><span class="label">Banque</span><span class="value">${cycle.seller.banque || 'N/A'}</span></div>
      <div class="meta-row"><span class="label">RIB</span><span class="value">${cycle.seller.rib || 'N/A'}</span></div>
    </div>
  </div>

  <div class="meta-box" style="margin-bottom:16px">
    <h3>Période de référence</h3>
    <div class="meta-row">
      <span class="label">Du</span><span class="value">${fmtDate(cycle.periodStart)}</span>
    </div>
    <div class="meta-row">
      <span class="label">Au</span><span class="value">${fmtDate(cycle.periodEnd)}</span>
    </div>
  </div>

  <table class="main">
    <thead>
      <tr><th>Désignation</th><th class="num">Montant (TND)</th></tr>
    </thead>
    <tbody>
      <tr><td>Chiffre d'affaires brut réalisé via la Plateforme</td><td class="num">${fmtNum(cycle.grossAmount)}</td></tr>
      <tr><td>Commission HT (base imposable TVA)</td><td class="num">(${fmtNum(commissionHT)})</td></tr>
      <tr><td>TVA collectée 19% (Art. 5 Code TVA)</td><td class="num">(${fmtNum(tva)})</td></tr>
      ${cycle.seller.rib ? `<tr><td>Retenue à la source applicable (Art. 52 CIR / Art. 68 LF 2025)</td><td class="num">—</td></tr>` : ''}
    </tbody>
    <tfoot>
      <tr><td>MONTANT NET À VERSER AU VENDEUR</td><td class="num">${fmtNum(cycle.netAmount)} TND</td></tr>
    </tfoot>
  </table>

  <div class="legal-box">
    <strong>Base légale</strong>
    Conformément à l'article 68 de la Loi de Finances 2025, la Plateforme agit en qualité d'intermédiaire technique soumis aux obligations de communication à l'Administration Fiscale.
    La commission est soumise à la TVA au taux de 19% conformément à l'article 5 du Code de la TVA.
    Versement effectué sur le compte RIB ${cycle.seller.rib || '____________________'} — ${cycle.seller.banque || '____'}.
    Statut : <span class="badge ${cycle.status === 'PAID' ? 'badge-green' : 'badge-orange'}">${cycle.status === 'PAID' ? 'VERSÉ le ' + fmtDate(cycle.paidAt) : 'EN ATTENTE'}</span>
  </div>

  <div class="sign-grid">
    <div class="sign-box">
      <p>Pour la Plateforme</p>
      <strong>${platform.manager}</strong>
      <div class="sign-line"></div>
      <p>Signature et cachet</p>
    </div>
    <div class="sign-box">
      <p>Pour le Vendeur — Accusé de réception</p>
      <strong>${cycle.seller.name}</strong>
      <div class="sign-line"></div>
      <p>Signature et cachet</p>
    </div>
  </div>
</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send(`<h1>Erreur: ${e.message}</h1>`); }
});

// GET /api/admin/documents/finance/declaration-tva?month=&year=
router.get('/finance/declaration-tva', auth, async (req, res) => {
  try {
    const m = req.query.month !== undefined ? parseInt(req.query.month) : now().getMonth();
    const y = req.query.year  !== undefined ? parseInt(req.query.year)  : now().getFullYear();
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0, 23, 59, 59);
    const platform = await getPlatform();
    const ref = genRef('DT');

    // CA total des commandes
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { subtotal: true, vat: true, total: true, discount: true },
    });
    const totalCA      = orders.reduce((s, o) => s + o.subtotal, 0);
    const totalVATOrders = orders.reduce((s, o) => s + o.vat, 0);

    // Commissions (soumises à TVA séparément)
    const globalComm = await prisma.commission.findFirst({ where: { type: 'GLOBAL', isActive: true } });
    const rate = globalComm?.rate || 0.10;
    const commissionsHT = totalCA * rate;
    const tvaOnCommissions = commissionsHT * 0.19;
    const commissionsHT_period = commissionsHT;

    const moisLabel = new Date(y, m, 1).toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Déclaration TVA ${moisLabel}</title>${CSS_BASE}</head>
<body>
${toolbarHtml(`Déclaration TVA — ${moisLabel}`)}
<div class="doc doc-body">
  <div class="header">
    <div class="header-left">
      <h1>DÉCLARATION DE LA TVA</h1>
      <div class="subtitle">Période : ${moisLabel.toUpperCase()}</div>
    </div>
    <div class="header-right">
      <strong>Réf : ${ref}</strong>
      Date d'établissement : ${fmtDate(now())}<br>
      NIF : ${platform.nif}<br>
      Régime : Réel (mensuel)
    </div>
  </div>

  <div class="meta-box" style="margin-bottom:16px">
    <h3>Identité du déclarant</h3>
    <div class="meta-row"><span class="label">Raison sociale</span><span class="value">${platform.name} (${platform.legal})</span></div>
    <div class="meta-row"><span class="label">NIF</span><span class="value">${platform.nif}</span></div>
    <div class="meta-row"><span class="label">RNE</span><span class="value">${platform.rne}</span></div>
    <div class="meta-row"><span class="label">Adresse</span><span class="value">${platform.address}</span></div>
    <div class="meta-row"><span class="label">Activité</span><span class="value">Intermédiaire de commerce électronique (Code NACE : 6312)</span></div>
  </div>

  <h3 style="margin:16px 0 8px;color:#1e3a8a;font-size:11pt">I. TVA COLLECTÉE (sur les commissions facturées aux vendeurs)</h3>
  <table class="main">
    <thead><tr><th>Base imposable</th><th>Taux</th><th class="num">Montant TVA (TND)</th></tr></thead>
    <tbody>
      <tr>
        <td>Commissions de référencement HT (Art. 5 Code TVA)</td>
        <td>19%</td>
        <td class="num">${fmtNum(tvaOnCommissions)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr><td colspan="2">TOTAL TVA COLLECTÉE</td><td class="num">${fmtNum(tvaOnCommissions)} TND</td></tr>
    </tfoot>
  </table>

  <h3 style="margin:16px 0 8px;color:#1e3a8a;font-size:11pt">II. TVA DÉDUCTIBLE (achats et charges soumis à TVA)</h3>
  <table class="main">
    <thead><tr><th>Nature</th><th class="num">Montant TVA (TND)</th></tr></thead>
    <tbody>
      <tr><td>Hébergement et services informatiques</td><td class="num">____,___</td></tr>
      <tr><td>Autres achats grevés de TVA</td><td class="num">____,___</td></tr>
    </tbody>
    <tfoot>
      <tr><td>TOTAL TVA DÉDUCTIBLE</td><td class="num">____,___ TND</td></tr>
    </tfoot>
  </table>

  <h3 style="margin:16px 0 8px;color:#1e3a8a;font-size:11pt">III. RÉCAPITULATIF</h3>
  <table class="main">
    <thead><tr><th>Ligne</th><th class="num">Montant (TND)</th></tr></thead>
    <tbody>
      <tr><td>TVA collectée</td><td class="num">${fmtNum(tvaOnCommissions)}</td></tr>
      <tr><td>TVA déductible</td><td class="num">(____,___)</td></tr>
      <tr><td>Crédit de TVA reporté de la période précédente</td><td class="num">____,___</td></tr>
    </tbody>
    <tfoot>
      <tr><td>TVA NETTE DUE (à verser au receveur des finances)</td><td class="num">____,___ TND</td></tr>
    </tfoot>
  </table>

  <div class="highlight">
    ⚠️ Cette déclaration doit être déposée avant le <strong>28 du mois suivant</strong> à la recette des finances compétente, accompagnée du paiement correspondant (Art. 19 CDPF).
  </div>

  <div class="legal-box">
    <strong>Références légales</strong>
    • Code de la TVA (Loi n°88-61 du 2 juin 1988) — Art. 5 : taux 19%<br>
    • Loi n°2000-83 du 9 août 2000 relative au commerce électronique<br>
    • Note commune n°14/2022 (DGI) — Obligations déclaratives des plateformes numériques<br>
    • Art. 68 Loi de Finances 2025 — Retenue à la source sur les paiements de plateformes
  </div>

  <div class="sign-grid">
    <div class="sign-box">
      <p>Le Responsable Comptable</p><strong></strong>
      <div class="sign-line"></div><p>Signature et cachet</p>
    </div>
    <div class="sign-box">
      <p>Le Directeur Général</p><strong>${platform.manager}</strong>
      <div class="sign-line"></div><p>Signature et cachet</p>
    </div>
  </div>
</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send(`<h1>Erreur: ${e.message}</h1>`); }
});

// GET /api/admin/documents/finance/etat-comptable?month=&year=
router.get('/finance/etat-comptable', auth, async (req, res) => {
  try {
    const m = req.query.month !== undefined ? parseInt(req.query.month) : now().getMonth();
    const y = req.query.year  !== undefined ? parseInt(req.query.year)  : now().getFullYear();
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0, 23, 59, 59);
    const platform = await getPlatform();
    const ref = genRef('EC');
    const moisLabel = new Date(y, m, 1).toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' });

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: { include: { product: { include: { seller: { select: { name: true } } } } } }, user: { select: { name: true } } },
    });
    const cycles = await prisma.paymentCycle.findMany({
      where: { periodStart: { gte: start }, periodEnd: { lte: end } },
      include: { seller: { select: { name: true } } },
    });

    const totalCA          = orders.reduce((s,o) => s + o.subtotal, 0);
    const totalDiscounts   = orders.reduce((s,o) => s + o.discount, 0);
    const totalShipping    = orders.reduce((s,o) => s + o.shippingCost, 0);
    const totalVAT         = orders.reduce((s,o) => s + o.vat, 0);
    const totalRevenue     = orders.reduce((s,o) => s + o.total, 0);
    const globalComm       = await prisma.commission.findFirst({ where: { type: 'GLOBAL', isActive: true } });
    const rate             = globalComm?.rate || 0.10;
    const totalCommissions = totalCA * rate;
    const totalToVendors   = cycles.reduce((s,c) => s + c.netAmount, 0);

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>État Comptable ${moisLabel}</title>${CSS_BASE}</head>
<body>
${toolbarHtml(`État Comptable — ${moisLabel}`)}
<div class="doc doc-body">
  <div class="header">
    <div class="header-left">
      <h1>ÉTAT COMPTABLE MENSUEL</h1>
      <div class="subtitle">Période : ${moisLabel.toUpperCase()}</div>
    </div>
    <div class="header-right">
      <strong>Réf : ${ref}</strong>
      Établi le ${fmtDate(now())}<br>
      NIF : ${platform.nif}
    </div>
  </div>

  <h3 style="color:#1e3a8a;margin-bottom:8px">I. COMPTE DE RÉSULTAT SIMPLIFIÉ</h3>
  <table class="main">
    <thead><tr><th>Poste</th><th>Qté</th><th class="num">Montant (TND)</th></tr></thead>
    <tbody>
      <tr style="background:#f0f9ff"><td colspan="3" style="font-weight:700;color:#1e3a8a;padding:8px 12px">PRODUITS</td></tr>
      <tr><td>CA Marchandises (GMV) — Montant brut des transactions</td><td>${orders.length} commandes</td><td class="num">${fmtNum(totalCA)}</td></tr>
      <tr><td>Commissions perçues HT (${(rate*100).toFixed(0)}%)</td><td>—</td><td class="num">${fmtNum(totalCommissions)}</td></tr>
      <tr><td>Frais de livraison facturés</td><td>—</td><td class="num">${fmtNum(totalShipping)}</td></tr>
      <tr><td>TVA collectée (19%)</td><td>—</td><td class="num">${fmtNum(totalVAT)}</td></tr>
      <tr style="background:#f0f9ff"><td colspan="3" style="font-weight:700;color:#1e3a8a;padding:8px 12px">CHARGES</td></tr>
      <tr><td>Versements nets aux vendeurs</td><td>${cycles.length} cycles</td><td class="num">(${fmtNum(totalToVendors)})</td></tr>
      <tr><td>Réductions accordées (codes promo)</td><td>—</td><td class="num">(${fmtNum(totalDiscounts)})</td></tr>
    </tbody>
    <tfoot>
      <tr><td>RÉSULTAT NET PLATEFORME (avant charges d'exploitation)</td><td>—</td><td class="num">${fmtNum(totalCommissions - (totalCA - totalToVendors - totalDiscounts > 0 ? 0 : 0))} TND</td></tr>
    </tfoot>
  </table>

  <h3 style="color:#1e3a8a;margin:16px 0 8px">II. DÉTAIL DES COMMANDES (${orders.length} commandes)</h3>
  <table class="main">
    <thead><tr><th>#</th><th>Client</th><th>Date</th><th>Statut</th><th class="num">Total TTC</th></tr></thead>
    <tbody>
      ${orders.slice(0,20).map(o => `
        <tr>
          <td>#${String(o.id).padStart(5,'0')}</td>
          <td>${o.user?.name || '—'}</td>
          <td>${fmtShort(o.createdAt)}</td>
          <td><span class="badge ${o.status==='LIVREE'?'badge-green':o.status==='ANNULEE'?'badge-red':'badge-blue'}">${o.status}</span></td>
          <td class="num">${fmtNum(o.total)}</td>
        </tr>`).join('')}
      ${orders.length > 20 ? `<tr><td colspan="5" style="text-align:center;color:#64748b;font-style:italic">... et ${orders.length-20} autres commandes</td></tr>` : ''}
    </tbody>
    <tfoot>
      <tr><td colspan="4">TOTAL PÉRIODE</td><td class="num">${fmtNum(totalRevenue)} TND</td></tr>
    </tfoot>
  </table>

  <h3 style="color:#1e3a8a;margin:16px 0 8px">III. CYCLES DE VERSEMENT VENDEURS</h3>
  <table class="main">
    <thead><tr><th>Vendeur</th><th class="num">Brut</th><th class="num">Commission</th><th class="num">Net versé</th><th>Statut</th></tr></thead>
    <tbody>
      ${cycles.map(c => `
        <tr>
          <td>${c.seller?.name}</td>
          <td class="num">${fmtNum(c.grossAmount)}</td>
          <td class="num">(${fmtNum(c.commission)})</td>
          <td class="num">${fmtNum(c.netAmount)}</td>
          <td><span class="badge ${c.status==='PAID'?'badge-green':'badge-orange'}">${c.status}</span></td>
        </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr><td>TOTAUX</td><td class="num">${fmtNum(cycles.reduce((s,c)=>s+c.grossAmount,0))}</td><td class="num">(${fmtNum(cycles.reduce((s,c)=>s+c.commission,0))})</td><td class="num">${fmtNum(totalToVendors)}</td><td></td></tr>
    </tfoot>
  </table>

  <div class="legal-box">
    <strong>Document établi conformément à :</strong>
    • Système Comptable des Entreprises (SCE) — Loi n°96-112 du 30 décembre 1996<br>
    • Note commune DGI n°14/2022 relative aux obligations des plateformes numériques<br>
    • Art. 68 Loi de Finances 2025 — Déclaration des paiements aux vendeurs
  </div>

  <div class="sign-grid">
    <div class="sign-box"><p>Expert-comptable</p><div class="sign-line"></div><p>Visa</p></div>
    <div class="sign-box"><p>Direction Générale</p><strong>${platform.manager}</strong><div class="sign-line"></div><p>Signature et cachet</p></div>
  </div>
</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send(`<h1>Erreur: ${e.message}</h1>`); }
});

// ════════════════════════════════════════════════════════════════════════════
// TRANSPORT DOCUMENTS (Ministère du Transport & Ministère de l'Intérieur TN)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/documents/transport/bon-livraison/:orderId
router.get('/transport/bon-livraison/:orderId', auth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.orderId) },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { product: { include: { seller: { select: { name: true, location: true, phone: true } } } } } },
      },
    });
    if (!order) return res.status(404).send('<h1>Commande introuvable</h1>');

    const platform = await getPlatform();
    const addr = (() => { try { return JSON.parse(order.shippingAddress); } catch { return {}; } })();
    const ref = `BL-${String(order.id).padStart(6,'0')}`;
    const totalPoids = '____'; // non stocké

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bon de Livraison ${ref}</title>${CSS_BASE}
<style>
  .bl-header{background:#0f172a;color:#fff;padding:12px 20px;display:grid;grid-template-columns:1fr auto;align-items:center}
  .bl-header h1{font-size:14pt;font-weight:800}
  .bl-header .ref{font-size:11pt;font-weight:700;color:#93c5fd}
  .info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:12px 0}
  .info-cell{border:1px solid #e2e8f0;border-radius:6px;padding:10px;background:#f8fafc}
  .info-cell h4{font-size:8pt;text-transform:uppercase;color:#64748b;margin-bottom:6px;font-weight:700}
  .info-cell p{font-size:10pt;font-weight:600;line-height:1.4}
  .barcode-area{border:2px dashed #cbd5e1;border-radius:6px;padding:12px;text-align:center;margin:12px 0;background:#f8fafc}
  .signature-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:20px}
  .sig-box{border:1px solid #e2e8f0;border-radius:6px;padding:12px;text-align:center;background:#f8fafc}
  .sig-box h4{font-size:8pt;text-transform:uppercase;color:#64748b;margin-bottom:8px}
  .sig-line{height:40px;border-bottom:1px solid #cbd5e1;margin:8px 0}
</style>
</head>
<body>
${toolbarHtml(`Bon de Livraison ${ref}`)}
<div class="doc doc-body" style="padding:20px">
  <!-- En-tête officiel -->
  <div class="bl-header">
    <div>
      <h1>BON DE LIVRAISON</h1>
      <p style="font-size:9pt;opacity:.8">Conformément au Décret n°2021-417 du 22 juin 2021 (Transport de marchandises)</p>
    </div>
    <div style="text-align:right">
      <div class="ref">${ref}</div>
      <div style="font-size:9pt;opacity:.8">Date : ${fmtDate(now())}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-cell">
      <h4>Expéditeur (Plateforme)</h4>
      <p>${platform.name}</p>
      <p style="font-size:9pt;color:#64748b">${platform.address}</p>
      <p style="font-size:9pt;color:#64748b">Tél : ${platform.tel}</p>
      <p style="font-size:9pt;color:#64748b">NIF : ${platform.nif}</p>
    </div>
    <div class="info-cell">
      <h4>Destinataire</h4>
      <p>${addr.name || order.user?.name}</p>
      <p style="font-size:9pt;color:#64748b">${addr.building || ''}, ${addr.street || ''}</p>
      <p style="font-size:9pt;color:#64748b">${addr.area || ''}, ${addr.governorate || ''}</p>
      <p style="font-size:9pt;color:#64748b">Tél : ${addr.phone || order.user?.phone || '—'}</p>
    </div>
    <div class="info-cell">
      <h4>Informations livraison</h4>
      <p style="font-size:9pt">Commande : #${String(order.id).padStart(6,'0')}</p>
      <p style="font-size:9pt">Paiement : ${order.paymentMethod || 'N/A'}</p>
      <p style="font-size:9pt">Total TTC : <strong>${fmtNum(order.total)} TND</strong></p>
      ${order.trackingNumber ? `<p style="font-size:9pt">Suivi : ${order.trackingNumber}</p>` : ''}
    </div>
  </div>

  <div class="barcode-area">
    <p style="font-size:10pt;font-weight:700;letter-spacing:4px">${ref}</p>
    <p style="font-size:8pt;color:#64748b;margin-top:4px">Scanner ce code pour valider la livraison</p>
    <div style="font-size:28pt;letter-spacing:2px;font-family:monospace;margin:4px 0">||||| ||| || ||||| || |||</div>
  </div>

  <!-- Détail colis -->
  <table class="main">
    <thead><tr><th>#</th><th>Article</th><th>Vendeur</th><th>Qté</th><th class="num">P.U. TND</th><th class="num">Total TND</th></tr></thead>
    <tbody>
      ${order.items.map((item, i) => `
        <tr>
          <td>${i+1}</td>
          <td>${item.product?.title || '—'}</td>
          <td>${item.product?.seller?.name || '—'}</td>
          <td style="text-align:center">${item.qty}</td>
          <td class="num">${fmtNum(item.price)}</td>
          <td class="num">${fmtNum(item.price * item.qty)}</td>
        </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr><td colspan="5">TOTAL</td><td class="num">${fmtNum(order.total)} TND</td></tr>
    </tfoot>
  </table>

  <!-- Infos transport -->
  <div class="meta-grid" style="margin:12px 0">
    <div class="meta-box">
      <h3>Informations colis</h3>
      <div class="meta-row"><span class="label">Nombre de colis</span><span class="value">____</span></div>
      <div class="meta-row"><span class="label">Poids total estimé</span><span class="value">${totalPoids} kg</span></div>
      <div class="meta-row"><span class="label">Nature marchandise</span><span class="value">Articles e-commerce non dangereux</span></div>
      <div class="meta-row"><span class="label">Fragilité</span><span class="value">☐ Fragile  ☐ Standard</span></div>
    </div>
    <div class="meta-box">
      <h3>Remboursement à la livraison (COD)</h3>
      <div class="meta-row"><span class="label">Mode paiement</span><span class="value">${order.paymentMethod === 'cod' ? '💵 Paiement à la livraison' : '✓ Prépayé'}</span></div>
      <div class="meta-row"><span class="label">Montant à encaisser</span><span class="value">${order.paymentMethod === 'cod' ? fmtNum(order.total) + ' TND' : '0,000 TND (prépayé)'}</span></div>
    </div>
  </div>

  <div class="highlight">
    📋 <strong>Instructions livreur :</strong> Vérifier l'identité du destinataire (CIN ou passeport). En cas d'absence, déposer un avis de passage. Ne pas laisser le colis sans signature. Tout refus doit être signalé dans le système sous 2 heures.
  </div>

  <!-- Signatures -->
  <div class="signature-row">
    <div class="sig-box">
      <h4>Livreur</h4>
      <p style="font-size:9pt">Nom : ____________________</p>
      <p style="font-size:9pt">CIN : ____________________</p>
      <p style="font-size:9pt">Immatriculation véhicule :</p>
      <p style="font-size:9pt">____________________</p>
      <div class="sig-line"></div>
      <p style="font-size:8pt;color:#64748b">Signature + date de départ</p>
    </div>
    <div class="sig-box">
      <h4>Destinataire — Accusé de réception</h4>
      <p style="font-size:9pt">Nom : ____________________</p>
      <p style="font-size:9pt">CIN : ____________________</p>
      <p style="font-size:9pt">Heure de livraison : ___:___</p>
      <div class="sig-line"></div>
      <p style="font-size:8pt;color:#64748b">Signature + date de réception</p>
    </div>
    <div class="sig-box">
      <h4>Superviseur Logistique</h4>
      <p style="font-size:9pt;color:#64748b">(Visa de contrôle)</p>
      <div class="sig-line" style="height:60px"></div>
      <p style="font-size:8pt;color:#64748b">Cachet + signature</p>
    </div>
  </div>

  <div class="legal-box" style="margin-top:16px">
    <strong>Base légale transport</strong>
    • Décret n°2021-417 du 22 juin 2021 relatif au transport routier de marchandises<br>
    • Loi n°2004-33 du 19 avril 2004 portant organisation des transports terrestres<br>
    • Arrêté du Ministre du Transport du 17 mars 2009 (conditions de transport de colis)<br>
    • Art. 55 Code de la route — obligation de port du bon de transport
  </div>
</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send(`<h1>Erreur: ${e.message}</h1>`); }
});

// GET /api/admin/documents/transport/feuille-route?date=YYYY-MM-DD&orders=1,2,3
router.get('/transport/feuille-route', auth, async (req, res) => {
  try {
    const dateStr = req.query.date || now().toISOString().split('T')[0];
    const orderIds = req.query.orders ? req.query.orders.split(',').map(Number).filter(Boolean) : [];
    const platform = await getPlatform();
    const ref = `FR-${dateStr.replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    let orders = [];
    if (orderIds.length) {
      orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: { user: { select: { name: true, phone: true } } },
      });
    } else {
      // Prendre les commandes du jour en statut EXPEDIEE
      const d = new Date(dateStr);
      orders = await prisma.order.findMany({
        where: {
          status: { in: ['EXPEDIEE','EN_ATTENTE'] },
          createdAt: { gte: d, lte: new Date(d.getTime() + 86400000) },
        },
        include: { user: { select: { name: true, phone: true } } },
        take: 30,
      });
    }

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Feuille de Route ${ref}</title>${CSS_BASE}
<style>
  .fr-header{background:#0f172a;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
  .fr-info{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}
  .fr-cell{border:1px solid #e2e8f0;border-radius:6px;padding:10px;background:#f8fafc}
  .fr-cell h4{font-size:8pt;text-transform:uppercase;color:#64748b;margin-bottom:6px;font-weight:700}
  .stop-row{border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin:8px 0;display:grid;grid-template-columns:32px 1fr auto;gap:12px;align-items:center}
  .stop-num{width:32px;height:32px;background:#1e3a8a;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11pt}
  .stop-status{border:1px solid #e2e8f0;border-radius:4px;padding:4px 8px;font-size:8pt;color:#64748b;text-align:center;min-width:80px}
</style>
</head>
<body>
${toolbarHtml(`Feuille de Route — ${dateStr}`)}
<div class="doc doc-body" style="padding:20px">
  <div class="fr-header">
    <div>
      <h1 style="font-size:15pt;font-weight:800">FEUILLE DE ROUTE LIVREUR</h1>
      <p style="font-size:9pt;opacity:.8">Ministère du Transport — Document officiel obligatoire</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:12pt;font-weight:800;color:#93c5fd">${ref}</div>
      <div style="font-size:10pt">Date : ${fmtDate(new Date(dateStr))}</div>
    </div>
  </div>

  <div class="fr-info">
    <div class="fr-cell">
      <h4>Livreur</h4>
      <p>Nom : ____________________</p>
      <p style="font-size:9pt;margin-top:4px">CIN : ____________________</p>
      <p style="font-size:9pt">Permis : ____________________</p>
    </div>
    <div class="fr-cell">
      <h4>Véhicule</h4>
      <p>Immat. : ____________________</p>
      <p style="font-size:9pt;margin-top:4px">Marque : ____________________</p>
      <p style="font-size:9pt">Tonnage : _________ T</p>
    </div>
    <div class="fr-cell">
      <h4>Départ</h4>
      <p>Lieu : ${platform.address}</p>
      <p style="font-size:9pt;margin-top:4px">Heure départ : ___h___</p>
      <p style="font-size:9pt">Km compteur : ___________</p>
    </div>
    <div class="fr-cell">
      <h4>Retour</h4>
      <p>Heure retour : ___h___</p>
      <p style="font-size:9pt;margin-top:4px">Km fin : ___________</p>
      <p style="font-size:9pt">Total km : ___________</p>
    </div>
  </div>

  <h3 style="color:#1e3a8a;margin:16px 0 10px;font-size:11pt">LISTE DES ARRÊTS — ${orders.length} livraison(s)</h3>

  ${orders.map((o, i) => {
    const addr = (() => { try { return JSON.parse(o.shippingAddress); } catch { return {}; } })();
    return `
    <div class="stop-row">
      <div class="stop-num">${i+1}</div>
      <div>
        <div style="font-weight:700;font-size:10.5pt">${addr.name || o.user?.name || 'Client'}</div>
        <div style="font-size:9pt;color:#475569">📍 ${addr.building || ''} ${addr.street || ''}, ${addr.area || ''}, ${addr.governorate || ''}</div>
        <div style="font-size:9pt;color:#475569">📞 ${addr.phone || o.user?.phone || '—'} &nbsp;|&nbsp; Commande #${String(o.id).padStart(6,'0')} &nbsp;|&nbsp; ${fmtNum(o.total)} TND ${o.paymentMethod==='cod'?'💵 COD':'✓ Prépayé'}</div>
      </div>
      <div>
        <div class="stop-status">Heure arr. : ___h___</div>
        <div class="stop-status" style="margin-top:4px">☐ Livré  ☐ Absent  ☐ Refusé</div>
      </div>
    </div>`;
  }).join('')}

  <div class="meta-grid" style="margin:16px 0">
    <div class="meta-box">
      <h3>Récapitulatif journalier</h3>
      <div class="meta-row"><span class="label">Total livraisons prévues</span><span class="value">${orders.length}</span></div>
      <div class="meta-row"><span class="label">Livraisons effectuées</span><span class="value">_____ / ${orders.length}</span></div>
      <div class="meta-row"><span class="label">Montant COD encaissé</span><span class="value">____,___ TND</span></div>
      <div class="meta-row"><span class="label">Colis retournés</span><span class="value">_____</span></div>
    </div>
    <div class="meta-box">
      <h3>Contrôle superviseur</h3>
      <div class="meta-row"><span class="label">Vérifié par</span><span class="value">____________________</span></div>
      <div class="meta-row"><span class="label">Heure contrôle</span><span class="value">___h___</span></div>
      <div class="meta-row"><span class="label">Observations</span><span class="value">____________________</span></div>
    </div>
  </div>

  <div class="legal-box">
    <strong>Obligations légales livreur (Ministère du Transport TN)</strong>
    • Ce document doit être présenté à tout contrôle de la force publique (Art. 55 Code de la route)<br>
    • Le livreur doit être porteur de : permis de conduire, carte grise, vignette assurance, certificat de visite technique<br>
    • Arrêté du Ministre du Transport du 17/03/2009 — Art. 12 : obligation de feuille de route pour tout transport commercial<br>
    • Décret n°2021-417 : le transporteur est responsable des colis jusqu'à remise contre signature<br>
    • En cas d'accident : contacter immédiatement le 197 (Police) ou le 198 (Garde Nationale)
  </div>

  <div class="signature-row">
    <div class="sig-box">
      <h4>Responsable logistique</h4>
      <div class="sig-line"></div><p style="font-size:8pt;color:#64748b">Signature départ</p>
    </div>
    <div class="sig-box">
      <h4>Livreur</h4>
      <div class="sig-line"></div><p style="font-size:8pt;color:#64748b">Signature retour</p>
    </div>
    <div class="sig-box">
      <h4>Direction</h4>
      <div class="sig-line"></div><p style="font-size:8pt;color:#64748b">Visa de contrôle</p>
    </div>
  </div>
</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { res.status(500).send(`<h1>Erreur: ${e.message}</h1>`); }
});

module.exports = router;
