const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// Récupérer les settings de la plateforme
const getPlatformData = async () => {
  const settings = await prisma.platformSetting.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  return {
    nomMarketplace:   map['marketplace_name']     || 'MARKET Tunisia',
    formeJuridique:   map['marketplace_legal']    || 'SARL',
    capital:          map['marketplace_capital']  || 'N/A',
    rne:              map['marketplace_rne']      || 'N/A',
    nif:              map['marketplace_nif']      || 'N/A',
    adresse:          map['marketplace_address']  || 'Tunis, Tunisie',
    gerant:           map['marketplace_manager']  || 'N/A',
    email:            map['marketplace_email']    || 'contact@market.tn',
    tribunal:         map['marketplace_tribunal'] || 'Tribunal de Commerce de Tunis',
    inpdpDeclaration: map['marketplace_inpdp']    || 'N/A',
  };
};

module.exports = async (req, res) => {
  try {
    // Valider le token depuis query param ou header
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).send('<h1>Non authentifié</h1>');
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).send('<h1>Session expirée. Retournez à l\'admin et réessayez.</h1>');
    }

    const contract = await prisma.contract.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { seller: true },
    });
    if (!contract) return res.status(404).send('<h1>Contrat introuvable</h1>');

    const platform = await getPlatformData();
    const s = contract.seller;
    const fmtDate = (d) => d
      ? new Date(d).toLocaleDateString('fr-TN', { day:'2-digit', month:'long', year:'numeric' })
      : '___________';
    const fmtNum = (n) => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);
    const rep = (val, fallback = '___________') => val || fallback;
    const c = contract;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contrat — ${s.name} — ${c.ref}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;font-size:11pt;color:#1e293b;background:#f8fafc;padding:0}
  @page{margin:2cm 2.5cm;size:A4}
  @media print{
    body{background:#fff;padding:0}
    .no-print{display:none!important}
    .page-break{page-break-before:always}
  }
  .container{max-width:800px;margin:0 auto;background:#fff;padding:32px;min-height:100vh}
  .toolbar{position:fixed;top:0;left:0;right:0;background:#1e3a8a;color:#fff;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .toolbar h2{font-size:14px;font-weight:700}
  .toolbar-btns{display:flex;gap:10px}
  .btn{padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:.2s}
  .btn-print{background:#fff;color:#1e3a8a}
  .btn-print:hover{background:#dbeafe}
  .btn-close{background:rgba(255,255,255,.15);color:#fff}
  .btn-close:hover{background:rgba(255,255,255,.25)}
  .doc{margin-top:56px}
  .header{text-align:center;border-bottom:3px solid #2563eb;padding-bottom:20px;margin-bottom:24px}
  .header h1{font-size:22pt;font-weight:800;color:#0f172a}
  .header .platform{font-size:13pt;color:#2563eb;font-weight:600;margin-top:4px}
  .header .sub{font-size:10pt;color:#64748b}
  .meta{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px}
  .meta-cell{padding:12px 16px;background:#f8fafc;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}
  .meta-cell:nth-child(2n){border-right:none}
  .meta-cell:nth-last-child(-n+2){border-bottom:none}
  .meta-label{font-size:8pt;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
  .meta-value{font-size:12pt;font-weight:700;color:#2563eb;margin-top:2px}
  .section{margin-bottom:22px}
  .section-title{font-size:12.5pt;font-weight:700;color:#2563eb;border-bottom:1.5px solid #dbeafe;padding-bottom:6px;margin-bottom:12px}
  .sub-title{font-size:11pt;font-weight:700;color:#334155;margin:14px 0 8px}
  table.data{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:10px}
  table.data td{padding:8px 14px;font-size:10pt;border-bottom:1px solid #f1f5f9}
  table.data td:first-child{color:#64748b;font-weight:600;width:38%;background:#f8fafc}
  table.data td:last-child{color:#1e40af;font-weight:600}
  table.data tr:last-child td{border-bottom:none}
  table.tariff{width:100%;border-collapse:collapse;margin:10px 0}
  table.tariff th{background:#1e3a8a;color:#fff;padding:9px 14px;font-size:9.5pt;text-align:left;font-weight:600}
  table.tariff td{padding:8px 14px;font-size:10pt;border-bottom:1px solid #e2e8f0}
  table.tariff td:nth-child(2){color:#2563eb;font-weight:700}
  table.tariff tr:nth-child(even) td{background:#f8fafc}
  p{margin-bottom:9px;font-size:10.5pt;line-height:1.6;color:#334155}
  ul{margin:7px 0 9px 20px}
  ul li{margin-bottom:3px;font-size:10pt;line-height:1.5}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:36px}
  .sign-box{border:1px solid #e2e8f0;border-radius:8px;padding:18px}
  .sign-box .sign-title{font-weight:700;color:#2563eb;font-size:10.5pt;border-bottom:1px solid #e2e8f0;padding-bottom:7px;margin-bottom:10px}
  .sign-field{margin-bottom:7px;font-size:10pt;color:#475569}
  .sign-field strong{color:#0f172a}
  .sign-zone{height:56px;border:1px dashed #cbd5e1;border-radius:4px;margin-top:14px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:9pt}
  .signed-ok{background:#d1fae5;border:1px solid #6ee7b7;color:#065f46;text-align:center;padding:8px;border-radius:4px;margin-top:12px;font-size:9pt;font-weight:700}
  .legal-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;font-size:9pt;color:#1e40af;margin-top:20px;text-align:center;font-style:italic}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9pt;font-weight:700}
  .badge-DRAFT{background:#fef3c7;color:#92400e}
  .badge-SENT{background:#dbeafe;color:#1e40af}
  .badge-SIGNED{background:#d1fae5;color:#065f46}
  .badge-TERMINATED{background:#fee2e2;color:#991b1b}
  .center{text-align:center;font-weight:700;color:#64748b;font-style:italic;margin:10px 0}
</style>
</head>
<body>

<!-- Barre d'outils (masquée à l'impression) -->
<div class="toolbar no-print">
  <h2>📄 Contrat ${c.ref} — ${s.name}</h2>
  <div class="toolbar-btns">
    <button class="btn btn-print" onclick="window.print()">🖨️ Imprimer / Enregistrer PDF</button>
    <button class="btn btn-close" onclick="window.close()">✕ Fermer</button>
  </div>
</div>

<div class="container doc">

  <!-- En-tête -->
  <div class="header">
    <h1>CONTRAT DE RÉFÉRENCEMENT VENDEUR</h1>
    <div class="platform">${rep(platform.nomMarketplace)}</div>
    <div class="sub">Plateforme de commerce électronique</div>
  </div>

  <!-- Méta -->
  <div class="meta">
    <div class="meta-cell"><div class="meta-label">Référence contrat</div><div class="meta-value">${c.ref}</div></div>
    <div class="meta-cell"><div class="meta-label">Date de création</div><div class="meta-value">${fmtDate(c.createdAt)}</div></div>
    <div class="meta-cell"><div class="meta-label">Statut</div><div class="meta-value"><span class="badge badge-${c.status}">${c.status}</span></div></div>
    <div class="meta-cell"><div class="meta-label">Validité</div><div class="meta-value">${c.dureeInitiale} mois — renouvelable</div></div>
  </div>

  <p class="center">ENTRE LES SOUSSIGNÉS</p>

  <!-- Art. 1 -->
  <div class="section">
    <div class="section-title">Article 1 — Identification des parties</div>
    <div class="sub-title">1.1 La Plateforme (Opérateur)</div>
    <table class="data">
      <tr><td>Dénomination sociale</td><td>${rep(platform.nomMarketplace)}</td></tr>
      <tr><td>Forme juridique</td><td>${rep(platform.formeJuridique)}</td></tr>
      <tr><td>Capital social</td><td>${rep(platform.capital)}</td></tr>
      <tr><td>Registre national (RNE)</td><td>${rep(platform.rne)}</td></tr>
      <tr><td>Matricule fiscal</td><td>${rep(platform.nif)}</td></tr>
      <tr><td>Siège social</td><td>${rep(platform.adresse)}</td></tr>
      <tr><td>Représentant légal</td><td>${rep(platform.gerant)}</td></tr>
      <tr><td>Email</td><td>${rep(platform.email)}</td></tr>
    </table>
    <div class="sub-title">1.2 Le Vendeur</div>
    <table class="data">
      <tr><td>Raison sociale / Nom</td><td>${rep(s.name)}</td></tr>
      <tr><td>Forme juridique</td><td>${rep(s.formeJuridique)}</td></tr>
      <tr><td>Matricule fiscal (NIF)</td><td>${rep(s.application?.taxId)}</td></tr>
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

  <!-- Art. 2 -->
  <div class="section">
    <div class="section-title">Article 2 — Objet du contrat</div>
    <p>Le présent contrat définit les conditions dans lesquelles la Plateforme accorde au Vendeur l'accès à son espace de vente en ligne. La Plateforme agit exclusivement en qualité d'intermédiaire technique et n'est ni co-vendeur ni mandataire du Vendeur.</p>
  </div>

  <!-- Art. 3 -->
  <div class="section">
    <div class="section-title">Article 3 — Conditions de référencement</div>
    <div class="sub-title">3.1 Catégorie de produits autorisée</div>
    <p>Le Vendeur est autorisé à référencer les produits relevant de la catégorie : <strong style="color:#2563eb">${rep(s.categorieAutorisee, 'Toutes catégories autorisées')}</strong>.</p>
    <div class="sub-title">3.2 Critères de classement</div>
    <p>Score d'évaluation acheteurs, taux de satisfaction des commandes, ancienneté sur la Plateforme et pertinence des mots-clés.</p>
    <div class="sub-title">3.3 Conditions de déréférencement</div>
    <ul>
      <li>Non-conformité fiscale ou absence de matricule fiscal valide</li>
      <li>Produits contrefaits, dangereux ou interdits par la législation tunisienne</li>
      <li>Taux de litiges supérieur à 15% sur 30 jours glissants</li>
      <li>Non-respect répété des délais de livraison annoncés</li>
      <li>Fraude ou manœuvres dolosives envers les acheteurs ou la Plateforme</li>
    </ul>
    <p>Toute suspension fait l'objet d'une notification préalable avec un délai de <strong>${c.delaiMiseEnDemeure}</strong> jours ouvrables pour régularisation.</p>
  </div>

  <!-- Art. 4 -->
  <div class="section">
    <div class="section-title">Article 4 — Commissions et structure tarifaire</div>
    <table class="tariff">
      <thead><tr><th>Élément tarifaire</th><th>Taux / Montant</th><th>Conditions</th></tr></thead>
      <tbody>
        <tr><td>Commission sur ventes</td><td>${c.tauxCommission}%</td><td>Par transaction HT</td></tr>
        <tr><td>Abonnement mensuel</td><td>${fmtNum(c.montantAbonnement)} TND</td><td>Prélèvement le 1er du mois</td></tr>
        <tr><td>Mise en avant (optionnel)</td><td>${fmtNum(c.tarifMiseEnAvant)} TND/sem.</td><td>Sur demande</td></tr>
        <tr><td>Retenue à la source</td><td>${c.tauxRetenueSource}%</td><td>Art. 68 LF 2025 — vendeurs sans NIF</td></tr>
      </tbody>
    </table>
    <p>Toute modification tarifaire sera notifiée avec un préavis de <strong>${c.delaiPreavisTarif}</strong> jours.</p>
    <div class="sub-title">4.1 Modalités de versement</div>
    <table class="data">
      <tr><td>Banque</td><td>${rep(s.banque)}</td></tr>
      <tr><td>RIB / IBAN</td><td>${rep(s.rib)}</td></tr>
      <tr><td>Fréquence de versement</td><td>${c.frequenceVersement}</td></tr>
      <tr><td>Seuil minimum</td><td>${fmtNum(c.seuilVersement)} TND</td></tr>
    </table>
  </div>

  <!-- Art. 5, 6, 7 -->
  <div class="section">
    <div class="section-title">Article 5 — Obligations du Vendeur</div>
    <ul>
      <li>Maintenir un matricule fiscal (NIF) valide</li>
      <li>Établir une facture conforme pour chaque transaction</li>
      <li>Assurer l'exactitude et la mise à jour des descriptions, prix et stocks</li>
      <li>Répondre aux réclamations acheteurs dans un délai maximum de 48 heures ouvrables</li>
      <li>Maintenir un taux de satisfaction acheteurs supérieur à 80%</li>
    </ul>
    <div class="section-title" style="margin-top:16px">Article 6 — Obligations de la Plateforme</div>
    <ul>
      <li>Assurer la disponibilité technique de la Plateforme avec un taux cible de 99,5%</li>
      <li>Traiter les paiements acheteurs via un PSP agréé par la Banque Centrale de Tunisie</li>
      <li>Notifier le Vendeur de toute modification contractuelle avec ${c.delaiPreavisTarif} jours de préavis</li>
      <li>Assurer la confidentialité des données commerciales du Vendeur</li>
    </ul>
    <div class="section-title" style="margin-top:16px">Article 7 — Responsabilité</div>
    <p>Le Vendeur est seul responsable de la conformité de ses produits. La responsabilité de la Plateforme est plafonnée aux commissions perçues au cours des 3 mois précédant le fait générateur.</p>
  </div>

  <!-- Art. 8, 9 -->
  <div class="section">
    <div class="section-title">Article 8 — Propriété intellectuelle</div>
    <p>Le Vendeur concède à la Plateforme une licence non exclusive d'utiliser ses photos, descriptions et logos publiés, aux seules fins de diffusion sur la Plateforme.</p>
    <div class="section-title" style="margin-top:16px">Article 9 — Protection des données personnelles</div>
    <table class="data">
      <tr><td>Responsable du traitement</td><td>${rep(platform.nomMarketplace)}</td></tr>
      <tr><td>Finalité</td><td>Gestion comptes vendeurs, facturation, lutte antifraude</td></tr>
      <tr><td>Conservation</td><td>5 ans après fin du contrat (obligation fiscale)</td></tr>
      <tr><td>Déclaration INPDP</td><td>${rep(platform.inpdpDeclaration)}</td></tr>
    </table>
  </div>

  <!-- Art. 10, 11, 12 -->
  <div class="section">
    <div class="section-title">Article 10 — Durée et résiliation</div>
    <p>Contrat en vigueur à compter du <strong>${fmtDate(c.dateDebut)}</strong> pour une durée initiale de <strong>${c.dureeInitiale}</strong> mois, renouvelable tacitement. Préavis de résiliation : <strong>${c.delaiPreavisResiliation}</strong> jours. Solde du compte : <strong>${c.delaiSoldeCompte}</strong> jours ouvrables après clôture.</p>
    <div class="section-title" style="margin-top:16px">Article 11 — Règlement des litiges</div>
    <p>À défaut de résolution amiable dans 30 jours, le litige sera soumis au <strong>${rep(platform.tribunal)}</strong>, conformément au droit tunisien.</p>
    <div class="section-title" style="margin-top:16px">Article 12 — Dispositions diverses</div>
    <p>Le présent contrat constitue l'intégralité de l'accord entre les Parties. Si une clause est déclarée nulle, les autres demeurent en vigueur.</p>
  </div>

  <!-- Signatures -->
  <div class="sign-grid">
    <div class="sign-box">
      <div class="sign-title">Pour la Plateforme</div>
      <div class="sign-field">Nom : <strong>${rep(platform.gerant)}</strong></div>
      <div class="sign-field">Qualité : Gérant / Directeur Général</div>
      <div class="sign-field">Date : ${fmtDate(c.dateSignatureMarket)}</div>
      <div class="sign-zone">Signature et cachet</div>
    </div>
    <div class="sign-box">
      <div class="sign-title">Pour le Vendeur</div>
      <div class="sign-field">Nom : <strong>${rep(s.gerant || s.name)}</strong></div>
      <div class="sign-field">Qualité : ${rep(s.qualiteSignataire, 'Gérant')}</div>
      <div class="sign-field">Date : ${fmtDate(c.dateSignatureClient)}</div>
      ${c.status === 'SIGNED'
        ? `<div class="signed-ok">✅ Signé électroniquement — Ref: ${c.logAcceptanceRef}</div>`
        : `<div class="sign-zone">Signature et cachet</div>`
      }
    </div>
  </div>

  ${c.logAcceptanceRef ? `
  <div class="legal-note">
    Conformément à l'article 1 de la loi n°2000-83, le clic de validation horodaté vaut signature (COC art. 453 bis).<br>
    Log d'acceptation : <strong>${c.logAcceptanceRef}</strong>
  </div>` : ''}

</div>

<script>
// Auto-print si ouvert directement (pas en iframe)
if (window.self === window.top) {
  // Ouvert dans un onglet dédié - l'utilisateur peut imprimer via le bouton
}
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.send(html);
  } catch (e) {
    res.status(500).send(`<h1>Erreur: ${e.message}</h1>`);
  }
};
