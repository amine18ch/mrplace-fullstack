/**
 * Moteur de routage flotte vs 3PL
 * Évalue dans l'ordre : zone → contraintes physiques → capacité → coût → SLA
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function computeRouting({ deliveryGovernorate, weightKg = 0, isFragile = false, isCod = false, isExpress = false, declaredValue = 0 }) {
  // 1. Vérifier la couverture de la zone
  const zone = await prisma.fleetZone.findUnique({ where: { governorate: deliveryGovernorate } });

  const fleetEligible = zone && zone.isActive && (zone.mode === 'FLEET' || zone.mode === 'HYBRID');

  if (fleetEligible) {
    // 2. Chercher un véhicule actif avec capacité suffisante et docs valides
    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'ACTIVE', capacityKg: { gte: weightKg } },
      include: { docs: true },
    });

    const compliantVehicle = vehicles.find(v => {
      const now = new Date();
      const expired = v.docs.some(d => d.expiresAt && new Date(d.expiresAt) < now);
      return !expired;
    });

    if (compliantVehicle) {
      // 3. Estimer coût flotte (fixe interne pour le MVP)
      const fleetCost = estimateFleetCost(deliveryGovernorate);

      // 4. Pour HYBRID : comparer avec meilleur 3PL
      if (zone.mode === 'HYBRID') {
        const tpl = await getBest3PL({ governorate: deliveryGovernorate, weightKg, isFragile, isCod, isExpress });
        if (tpl && tpl.estimatedCost < fleetCost) {
          return { ...tpl, rationale: `Zone hybride — 3PL moins cher (${tpl.estimatedCost} vs ${fleetCost} TND)` };
        }
      }

      return {
        mode: 'FLEET',
        vehicleId: compliantVehicle.id,
        carrierId: null,
        estimatedCost: fleetCost,
        estimatedDeliveryDays: isExpress ? 1 : 2,
        rationale: `Flotte propre disponible pour ${deliveryGovernorate} (véhicule ${compliantVehicle.plate})`,
      };
    }

    // Flotte indisponible/non conforme → fallback 3PL si HYBRID, sinon forcer 3PL
    if (zone.mode === 'FLEET') {
      const tpl = await getBest3PL({ governorate: deliveryGovernorate, weightKg, isFragile, isCod, isExpress });
      if (tpl) return { ...tpl, rationale: `Flotte indisponible pour ${deliveryGovernorate} — bascule automatique 3PL` };
      return noCarrierResult(deliveryGovernorate);
    }
  }

  // Zone non couverte par flotte ou THIRD_PARTY → 3PL direct
  const tpl = await getBest3PL({ governorate: deliveryGovernorate, weightKg, isFragile, isCod, isExpress });
  if (tpl) return tpl;
  return noCarrierResult(deliveryGovernorate);
}

async function getBest3PL({ governorate, weightKg, isFragile, isCod, isExpress }) {
  const grids = await prisma.pricingGrid.findMany({
    where: {
      minWeightKg: { lte: weightKg },
      maxWeightKg: { gte: weightKg },
      carrier: { status: 'ACTIVE' },
    },
    include: {
      carrier: {
        include: { contracts: { where: { status: 'ACTIVE' } } },
      },
    },
  });

  const eligible = grids
    .filter(g => g.carrier.contracts.length > 0)
    .filter(g => g.governorate === 'ALL' || g.governorate === governorate);

  if (eligible.length === 0) return null;

  const priced = eligible.map(g => ({
    carrierId: g.carrierId,
    carrierName: g.carrier.name,
    estimatedCost: g.basePrice + (isCod ? g.codSurcharge : 0) + (isFragile ? g.fragileExtra : 0) + (isExpress ? g.expressExtra : 0),
    estimatedDeliveryDays: g.carrier.contracts[0]?.slaDays || 3,
  }));
  priced.sort((a, b) => a.estimatedCost - b.estimatedCost);

  const best = priced[0];
  return {
    mode: 'THIRD_PARTY',
    vehicleId: null,
    carrierId: best.carrierId,
    estimatedCost: best.estimatedCost,
    estimatedDeliveryDays: best.estimatedDeliveryDays,
    rationale: `Meilleur 3PL pour ${governorate} : ${best.carrierName} à ${best.estimatedCost.toFixed(3)} TND`,
  };
}

function estimateFleetCost(governorate) {
  // Coût marginal flotte par zone (à affiner avec les vrais coûts)
  const ZONE_COSTS = {
    'Tunis': 8, 'Ariana': 8, 'Ben Arous': 8, 'Manouba': 8,
    'Sousse': 15, 'Monastir': 15, 'Mahdia': 18,
    'Sfax': 15, 'Gabès': 22, 'Médenine': 25,
  };
  return ZONE_COSTS[governorate] || 20;
}

function noCarrierResult(governorate) {
  return {
    mode: 'THIRD_PARTY',
    vehicleId: null,
    carrierId: null,
    estimatedCost: 25,
    estimatedDeliveryDays: 5,
    rationale: `Aucun transporteur disponible pour ${governorate} — à affecter manuellement`,
  };
}

// Génère un numéro de suivi unique
function generateTrackingRef() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MKT-${ts}-${rand}`;
}

module.exports = { computeRouting, getBest3PL, generateTrackingRef };
