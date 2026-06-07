/**
 * Templates HTML pour les documents de livraison
 * Conformes à la législation tunisienne (Loi 2004-33, Décret 2021-417)
 * Même pattern que admin/documents.js : HTML retourné en text/html, print-to-PDF navigateur
 */

const CSS = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Inter,sans-serif;font-size:12px;color:#111;background:#fff;padding:20px}
  .doc{max-width:800px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1E3A8A;padding-bottom:12px;margin-bottom:16px}
  .logo-block .name{font-size:20px;font-weight:800;color:#1E3A8A}
  .logo-block .sub{font-size:10px;color:#666;margin-top:2px}
  .doc-title{font-size:16px;font-weight:700;color:#1E3A8A;margin-bottom:4px}
  .doc-ref{font-size:10px;color:#666}
  .doc-date{font-size:10px;color:#666}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}
  .party-box{border:1px solid #E2E8F0;border-radius:6px;padding:10px}
  .party-box .label{font-size:9px;font-weight:700;color:#666;text-transform:uppercase;margin-bottom:6px}
  .party-box .value{font-size:12px;font-weight:600;color:#111}
  .party-box .detail{font-size:10px;color:#444;margin-top:2px;line-height:1.4}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px}
  th{background:#1E3A8A;color:#fff;padding:7px 10px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #E2E8F0}
  tr:nth-child(even) td{background:#F8FAFC}
  .totals{display:flex;justify-content:flex-end;margin-top:8px}
  .totals-box{border:2px solid #1E3A8A;border-radius:6px;padding:12px;min-width:240px}
  .total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
  .total-row.main{font-weight:700;font-size:13px;border-top:1px solid #1E3A8A;margin-top:4px;padding-top:6px}
  .signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}
  .sig-box{border:1px solid #E2E8F0;border-radius:6px;padding:10px;text-align:center}
  .sig-box .sig-label{font-size:9px;font-weight:700;color:#666;text-transform:uppercase;margin-bottom:40px}
  .sig-box .sig-name{font-size:10px;color:#444;border-top:1px solid #ccc;padding-top:6px;margin-top:4px}
  .alert-box{background:#FFF7ED;border:1px solid #FED7AA;border-radius:6px;padding:10px;margin:10px 0;font-size:10px;color:#92400E}
  .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600}
  .badge-blue{background:#DBEAFE;color:#1E40AF}
  .badge-green{background:#D1FAE5;color:#065F46}
  .badge-orange{background:#FED7AA;color:#92400E}
  .badge-red{background:#FEE2E2;color:#991B1B}
  .qr-zone{display:flex;align-items:center;gap:8px;font-size:9px;color:#666;margin-top:12px;padding-top:8px;border-top:1px solid #E2E8F0}
  .legal-mentions{font-size:9px;color:#888;margin-top:16px;padding-top:10px;border-top:1px solid #E2E8F0;line-height:1.5}
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0}
  .info-item{background:#F8FAFC;border-radius:6px;padding:8px}
  .info-item .ikey{font-size:9px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:3px}
  .info-item .ival{font-size:12px;font-weight:700;color:#111}
  @media print{body{padding:0}.no-print{display:none}}
</style>`;

const fmtNum = n => new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtDT = d => d ? new Date(d).toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const genRef = (prefix, id) => `${prefix}-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(id).padStart(6,'0')}`;

// ── Lettre de Voiture ─────────────────────────────────────────────────────────
function lettreDeVoiture(shipment, platform, seller, order) {
  const delivery = (() => { try { return JSON.parse(shipment.deliveryAddress||'{}'); } catch { return {}; } })();
  const pickup   = (() => { try { return JSON.parse(shipment.pickupAddress||'{}');   } catch { return {}; } })();
  const items = order?.items || [];
  const ref = genRef('LV', shipment.id);

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Lettre de Voiture ${ref}</title>${CSS}</head><body>
<div class="doc">
  <div class="header">
    <div class="logo-block">
      <div class="name">${platform.name}</div>
      <div class="sub">NIF: ${platform.nif} | RNE: ${platform.rne}</div>
      <div class="sub">${platform.address}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-title">LETTRE DE VOITURE</div>
      <div class="doc-ref">Réf : <strong>${ref}</strong></div>
      <div class="doc-date">Émise le : ${fmtDate(new Date())}</div>
      <span class="badge badge-blue">${shipment.mode === 'FLEET' ? 'Flotte propre' : '3PL'}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="label">Expéditeur (Vendeur)</div>
      <div class="value">${seller?.name || '—'}</div>
      <div class="detail">${seller?.adresseComplete || pickup.street || '—'}</div>
      <div class="detail">Tél : ${seller?.phone || '—'}</div>
    </div>
    <div class="party-box">
      <div class="label">Destinataire (Client)</div>
      <div class="value">${delivery.name || order?.user?.name || '—'}</div>
      <div class="detail">${delivery.street || '—'}, ${delivery.area || ''}</div>
      <div class="detail">${delivery.governorate || '—'}</div>
      <div class="detail">Tél : ${delivery.phone || order?.user?.phone || '—'}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="ikey">Commande</div><div class="ival">#${String(shipment.orderId).padStart(6,'0')}</div></div>
    <div class="info-item"><div class="ikey">Suivi</div><div class="ival">${shipment.trackingRef || '—'}</div></div>
    <div class="info-item"><div class="ikey">Poids total</div><div class="ival">${shipment.weightKg} kg</div></div>
    <div class="info-item"><div class="ikey">Valeur déclarée</div><div class="ival">${fmtNum(shipment.declaredValue)} TND</div></div>
    <div class="info-item"><div class="ikey">Fragile</div><div class="ival">${shipment.isFragile ? 'OUI ⚠️' : 'Non'}</div></div>
    <div class="info-item"><div class="ikey">COD</div><div class="ival">${shipment.isCod ? fmtNum(shipment.codAmount)+' TND' : 'Non'}</div></div>
  </div>

  ${items.length > 0 ? `<table>
    <thead><tr><th>Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">PU (TND)</th><th style="text-align:right">Total (TND)</th></tr></thead>
    <tbody>
      ${items.map(it => `<tr><td>${it.product?.title || '—'}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${fmtNum(it.price)}</td><td style="text-align:right">${fmtNum(it.price * it.qty)}</td></tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${shipment.isFragile ? '<div class="alert-box">⚠️ MARCHANDISE FRAGILE — Manipuler avec précaution — Ne pas renverser</div>' : ''}
  ${shipment.isCod ? `<div class="alert-box" style="background:#EFF6FF;border-color:#BFDBFE;color:#1E40AF">💰 PAIEMENT À LA LIVRAISON — Encaisser <strong>${fmtNum(shipment.codAmount)} TND</strong> avant remise du colis</div>` : ''}

  <div class="signatures">
    <div class="sig-box"><div class="sig-label">Expéditeur / Vendeur</div><div class="sig-name">Signature & Cachet</div></div>
    <div class="sig-box"><div class="sig-label">Transporteur</div><div class="sig-name">Signature & Cachet</div></div>
    <div class="sig-box"><div class="sig-label">Destinataire / Client</div><div class="sig-name">Signature à la réception</div></div>
  </div>

  <div class="legal-mentions">
    Document établi conformément à la <strong>Loi n°2004-33 du 19 avril 2004</strong> sur l'organisation des transports terrestres.<br>
    En cas de litige : <strong>Code de Commerce tunisien</strong> — articles régissant le contrat de transport de choses.<br>
    Conservation obligatoire : 10 ans — ${platform.name} — NIF: ${platform.nif}
  </div>
</div>
<div class="no-print" style="position:fixed;bottom:16px;right:16px">
  <button onclick="window.print()" style="background:#1E3A8A;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimer / Sauvegarder PDF</button>
</div>
</body></html>`;
}

// ── Bon de Livraison ──────────────────────────────────────────────────────────
function bonDeLivraison(shipment, platform, order) {
  const delivery = (() => { try { return JSON.parse(shipment.deliveryAddress||'{}'); } catch { return {}; } })();
  const ref = genRef('BL', shipment.id);

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bon de Livraison ${ref}</title>${CSS}</head><body>
<div class="doc">
  <div class="header">
    <div class="logo-block">
      <div class="name">${platform.name}</div>
      <div class="sub">NIF: ${platform.nif}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-title">BON DE LIVRAISON</div>
      <div class="doc-ref">Réf : <strong>${ref}</strong></div>
      <div class="doc-date">Date : ${fmtDate(new Date())}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="ikey">Commande</div><div class="ival">#${String(shipment.orderId).padStart(6,'0')}</div></div>
    <div class="info-item"><div class="ikey">Suivi</div><div class="ival">${shipment.trackingRef || '—'}</div></div>
    <div class="info-item"><div class="ikey">Livraison</div><div class="ival">${shipment.isExpress ? 'Express' : 'Standard'}</div></div>
  </div>

  <div class="party-box" style="margin-bottom:12px">
    <div class="label">Adresse de livraison</div>
    <div class="value">${delivery.name || order?.user?.name || '—'}</div>
    <div class="detail">${delivery.building ? delivery.building+', ' : ''}${delivery.street || '—'}</div>
    <div class="detail">${delivery.area || ''} — ${delivery.governorate || '—'}</div>
    <div class="detail">Tél : ${delivery.phone || '—'}</div>
    ${delivery.notes ? `<div class="detail">Notes : ${delivery.notes}</div>` : ''}
  </div>

  ${shipment.isCod ? `<div class="alert-box" style="background:#EFF6FF;border-color:#BFDBFE;color:#1E40AF;font-size:14px;font-weight:700;text-align:center;padding:14px">
    💰 MONTANT À ENCAISSER : ${fmtNum(shipment.codAmount)} TND
  </div>` : '<div class="alert-box" style="background:#F0FDF4;border-color:#BBF7D0;color:#166534">✅ Déjà payé en ligne — Aucun encaissement requis</div>'}

  <div class="signatures" style="margin-top:16px;grid-template-columns:1fr 1fr">
    <div class="sig-box"><div class="sig-label">Livreur</div><div class="sig-name">Nom : ___________</div></div>
    <div class="sig-box"><div class="sig-label">Client — Signature de réception</div><div class="sig-name">Date : ___________</div></div>
  </div>

  <div class="legal-mentions">Décret n°2021-417 — Transport routier de marchandises — ${platform.name}</div>
</div>
<div class="no-print" style="position:fixed;bottom:16px;right:16px">
  <button onclick="window.print()" style="background:#1E3A8A;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimer</button>
</div>
</body></html>`;
}

// ── Manifeste de Tournée ──────────────────────────────────────────────────────
function manifesteTournee(tour, driver, vehicle, stops, shipments, platform) {
  const ref = genRef('MT', tour.id);
  const codTotal = shipments.filter(s => s.isCod).reduce((s, sh) => s + sh.codAmount, 0);

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Manifeste Tournée ${ref}</title>${CSS}</head><body>
<div class="doc">
  <div class="header">
    <div class="logo-block">
      <div class="name">${platform.name}</div>
      <div class="sub">NIF: ${platform.nif}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-title">MANIFESTE DE TOURNÉE</div>
      <div class="doc-ref">Réf : <strong>${ref}</strong></div>
      <div class="doc-date">Date : <strong>${fmtDate(tour.date)}</strong></div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="label">Chauffeur</div>
      <div class="value">${driver?.name || '—'}</div>
      <div class="detail">CIN : ${driver?.cin || '—'} | Permis : ${driver?.licenseNo || '—'}</div>
      <div class="detail">Tél : ${driver?.phone || '—'}</div>
    </div>
    <div class="party-box">
      <div class="label">Véhicule</div>
      <div class="value">${vehicle?.brand || '—'} ${vehicle?.model || ''}</div>
      <div class="detail">Immatriculation : <strong>${vehicle?.plate || '—'}</strong></div>
      <div class="detail">Type : ${vehicle?.type || '—'} | PTAC : ${vehicle?.ptacKg || '—'} kg</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="ikey">Nb de stops</div><div class="ival">${stops.length}</div></div>
    <div class="info-item"><div class="ikey">COD à encaisser</div><div class="ival">${fmtNum(codTotal)} TND</div></div>
    <div class="info-item"><div class="ikey">Km estimés</div><div class="ival">${tour.kmEstimated || '—'}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Commande</th>
        <th>Destinataire</th>
        <th>Gouvernorat</th>
        <th>COD</th>
        <th>Statut</th>
        <th>Signé</th>
      </tr>
    </thead>
    <tbody>
      ${stops.sort((a,b)=>a.position-b.position).map((stop, i) => {
        const s = shipments.find(sh => sh.id === stop.shipmentId) || {};
        const addr = (() => { try { return JSON.parse(s.deliveryAddress||'{}'); } catch { return {}; } })();
        return `<tr>
          <td>${i+1}</td>
          <td>#${String(s.orderId||'').padStart(6,'0')}</td>
          <td>${addr.name || '—'}<br><span style="font-size:10px;color:#666">${addr.phone || ''}</span></td>
          <td>${addr.governorate || '—'}</td>
          <td>${s.isCod ? fmtNum(s.codAmount)+' TND' : '—'}</td>
          <td><span class="badge ${stop.status==='DONE'?'badge-green':stop.status==='FAILED'?'badge-red':'badge-blue'}">${stop.status}</span></td>
          <td style="min-width:80px">&nbsp;</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box"><div class="sig-label">Gestionnaire flotte</div><div class="sig-name">Signature départ</div></div>
    <div class="sig-box"><div class="sig-label">Chauffeur</div><div class="sig-name">Signature départ</div></div>
    <div class="sig-box"><div class="sig-label">Caisse — Remise COD</div><div class="sig-name">Montant : _______ TND</div></div>
  </div>

  <div class="legal-mentions">Arrêté du Ministère du Transport du 17/03/2009 — Feuille de route obligatoire — ${platform.name}</div>
</div>
<div class="no-print" style="position:fixed;bottom:16px;right:16px">
  <button onclick="window.print()" style="background:#1E3A8A;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimer</button>
</div>
</body></html>`;
}

// ── Reçu COD ─────────────────────────────────────────────────────────────────
function recuCOD(shipment, collection, platform, order) {
  const delivery = (() => { try { return JSON.parse(shipment.deliveryAddress||'{}'); } catch { return {}; } })();
  const ref = genRef('COD', shipment.id);

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Reçu COD ${ref}</title>${CSS}</head><body>
<div class="doc" style="max-width:400px">
  <div class="header">
    <div class="logo-block"><div class="name">${platform.name}</div></div>
    <div style="text-align:right">
      <div class="doc-title">REÇU DE PAIEMENT</div>
      <div class="doc-ref">${ref}</div>
      <div class="doc-date">${fmtDT(collection.collectedAt)}</div>
    </div>
  </div>

  <div class="info-grid" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
    <div class="info-item"><div class="ikey">Client</div><div class="ival">${delivery.name || order?.user?.name || '—'}</div></div>
    <div class="info-item"><div class="ikey">Commande</div><div class="ival">#${String(shipment.orderId).padStart(6,'0')}</div></div>
  </div>

  <div style="background:#F0FDF4;border:2px solid #059669;border-radius:8px;padding:16px;text-align:center;margin:12px 0">
    <div style="font-size:11px;color:#065F46;font-weight:600;margin-bottom:4px">MONTANT ENCAISSÉ</div>
    <div style="font-size:28px;font-weight:800;color:#065F46">${fmtNum(collection.amount)} TND</div>
    <div style="font-size:11px;color:#065F46;margin-top:4px">Mode : ${collection.method === 'CASH' ? 'Espèces' : 'TPE / Carte'}</div>
  </div>

  ${collection.signatureUrl ? `<div style="text-align:center;margin:8px 0"><img src="${collection.signatureUrl}" style="max-height:60px;border:1px solid #ccc;padding:4px;border-radius:4px" alt="Signature client"/></div>` : ''}

  <div class="legal-mentions" style="text-align:center">
    Ce reçu atteste du paiement à la livraison.<br>
    ${platform.name} — NIF: ${platform.nif} — ${platform.email}
  </div>
</div>
<div class="no-print" style="position:fixed;bottom:16px;right:16px">
  <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimer reçu</button>
</div>
</body></html>`;
}

// ── Bordereau de remise COD (chauffeur → caisse) ───────────────────────────────
function bordereauRemiseCOD(settlement, driver, tour, collections, platform) {
  const ref = genRef('REM', settlement.id);

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Remise COD ${ref}</title>${CSS}</head><body>
<div class="doc">
  <div class="header">
    <div class="logo-block"><div class="name">${platform.name}</div><div class="sub">NIF: ${platform.nif}</div></div>
    <div style="text-align:right">
      <div class="doc-title">BORDEREAU DE REMISE COD</div>
      <div class="doc-ref">Réf : <strong>${ref}</strong></div>
      <div class="doc-date">${fmtDate(new Date())}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="label">Chauffeur remettant</div>
      <div class="value">${driver?.name || '—'}</div>
      <div class="detail">CIN : ${driver?.cin || '—'}</div>
      <div class="detail">Tournée : ${tour ? fmtDate(tour.date) : '—'}</div>
    </div>
    <div class="party-box">
      <div class="label">Récapitulatif</div>
      <div class="info-grid" style="grid-template-columns:1fr 1fr;margin-top:4px">
        <div class="info-item"><div class="ikey">Attendu</div><div class="ival">${fmtNum(settlement.totalExpected)} TND</div></div>
        <div class="info-item"><div class="ikey">Remis</div><div class="ival">${fmtNum(settlement.totalActual)} TND</div></div>
      </div>
      ${Math.abs(settlement.diff) > 0.001 ? `<div class="alert-box" style="margin-top:6px">⚠️ Écart : ${fmtNum(settlement.diff)} TND</div>` : '<div style="color:#059669;font-size:11px;margin-top:6px">✅ Concordant</div>'}
    </div>
  </div>

  <table>
    <thead><tr><th>Commande</th><th>Montant COD</th><th>Mode</th><th>Heure</th></tr></thead>
    <tbody>
      ${collections.map(c => `<tr>
        <td>#${String(c.shipmentId).padStart(6,'0')}</td>
        <td>${fmtNum(c.amount)} TND</td>
        <td>${c.method === 'CASH' ? 'Espèces' : 'TPE'}</td>
        <td>${fmtDT(c.collectedAt)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box"><div class="sig-label">Chauffeur</div><div class="sig-name">Signature remettant</div></div>
    <div class="sig-box"><div class="sig-label">Caissier</div><div class="sig-name">Signature recevant</div></div>
    <div class="sig-box"><div class="sig-label">Superviseur</div><div class="sig-name">Signature validation</div></div>
  </div>
</div>
<div class="no-print" style="position:fixed;bottom:16px;right:16px">
  <button onclick="window.print()" style="background:#1E3A8A;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px">🖨️ Imprimer</button>
</div>
</body></html>`;
}

module.exports = { lettreDeVoiture, bonDeLivraison, manifesteTournee, recuCOD, bordereauRemiseCOD };
