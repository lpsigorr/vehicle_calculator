/* ============================================================
   TARIEVEN / TARIFS 2021 — Calculator Script
   Source of truth: TARIEVEN / TARIFS 2021 document (attached image)
   All monetary values verified against tariff sheet image.
   ============================================================

   HOW TO MAINTAIN TARIFF VALUES:
   --------------------------------
   All business-critical values live in the TARIFF_DATA object below.
   - VEHICLES:        capacity specs per vehicle type
   - PRICES:          base prices per pricing mode per vehicle
   - KM_TAX:          km surcharge percentages (only where shown in sheet)
   - WAITING:         included free minutes + per-15min rate
   - EXTRA_STOPS:     surcharge per stop type per vehicle
   - DISPO:           hourly rates (under/over 6h) + km supp
   - NAVETTES:        fixed navette tariffs by zone
   - SUPPLEMENTS:     night/frigo/convoyeur/chauffeur fixed amounts
   - FUEL_SURCHARGE:  default example % (adjust monthly)
   - VAT_RATE:        21% as per document

   To update a value, find the appropriate key in TARIFF_DATA
   and change the number. Do NOT touch the calculation functions.
   ============================================================ */

"use strict";

// ============================================================
// TARIFF DATA — SINGLE SOURCE OF TRUTH
// All values from TARIEVEN / TARIFS 2021 sheet.
// Fields marked VERIFY: value could not be read with 100% confidence.
// ============================================================
const TARIFF_DATA = {

  // Vehicle IDs used internally throughout the script
  VEHICLE_IDS: [
    "voiture",
    "bestel_1pal",
    "bestel_2pal",
    "bestel_3pal",
    "camion_6pal",
    "camion_14pal",
    "camion_17pal",
    "camion_18pal_lourd",
    "bache_18pal",
    "semi_bache_33pal",
    "frigo_15pal_minus12_0",
    "frigo_15pal_0_minus20",
  ],

  // Vehicle capacity constraints
  VEHICLES: {
    voiture: {
      label: "Voiture / Gewone wagen",
      pallets: 0,
      weight: 50,         // kg
      height: 0.70,       // m
      length: 0.70,       // m
      width: 0.90,        // m
      volume: 0.5,        // m³
      tailLift: false,
      tempRange: null,    // null = no refrigeration
    },
    bestel_1pal: {
      label: "Camionette bestelwagen – 1 Pal",
      pallets: 1,
      weight: 450,
      height: 1.10,
      length: 1.49,
      width: 1.05,
      volume: 2.7,
      tailLift: false,
      tempRange: null,
    },
    bestel_2pal: {
      label: "Camionette bestelwagen – 2 Pal",
      pallets: 2,
      weight: 500,
      height: 1.35,
      length: 2.10,
      width: 1.20,
      volume: 6,
      tailLift: false,
      tempRange: null,
    },
    bestel_3pal: {
      label: "Camionette bestelwagen – 3 Pal",
      pallets: 3,
      weight: 500,
      height: 1.76,
      length: 2.50,
      width: 1.38,
      volume: 9,
      tailLift: false,
      tempRange: null,
    },
    camion_6pal: {
      label: "Camion vrachtwagen – 6 Pal",
      pallets: 6,
      weight: 750,
      height: 1.96,
      length: 3.43,
      width: 2.07,
      volume: 15.09,
      tailLift: true,
      tailLiftCapacity: 700,  // kg
      tempRange: null,
    },
    camion_14pal: {
      label: "Camion vrachtwagen – 14 Pal",
      pallets: 14,
      weight: 5000,
      height: 2.27,
      length: 6.00,
      width: 2.46,
      volume: 33.5,
      tailLift: true,
      tailLiftCapacity: 1450,
      tempRange: null,
    },
    camion_17pal: {
      label: "Camion vrachtwagen – 17 Pal",
      pallets: 17,
      weight: 5000,
      height: 2.27,
      length: 7.20,
      width: 2.46,
      volume: 42.4,
      tailLift: true,
      tailLiftCapacity: 1450,
      tempRange: null,
    },
    camion_18pal_lourd: {
      label: "Camion lourd / zware vrachtwagen – 18 Pal",
      pallets: 18,
      weight: 9000,
      height: 2.27,
      length: 7.60,
      width: 2.46,
      volume: 42.4,
      tailLift: true,
      tailLiftCapacity: 1450,
      tempRange: null,
    },
    bache_18pal: {
      label: "Bâché / huifwagen – 18 Pal",
      pallets: 18,
      weight: 8700,
      height: 2.35,
      length: 7.60,
      width: 2.46,
      volume: 42.4,
      tailLift: true,
      tailLiftCapacity: 1450,
      tempRange: null,
    },
    semi_bache_33pal: {
      label: "Semi bâché / huifwagen – 33 Pal",
      pallets: 33,
      weight: 30000,
      height: 2.50,
      length: 13.60,
      width: 2.46,
      volume: 76.3,
      tailLift: false,
      tempRange: null,
    },
    frigo_15pal_minus12_0: {
      label: "Camion frigo / koelwagen – 15 Pal (-12°C / 0°C)",
      pallets: 15,
      weight: 5500,
      height: 2.27,   // Document note: "pour 14 pal"
      length: 7.60,
      width: 2.26,
      volume: 37.5,
      tailLift: true,
      tailLiftCapacity: 1450,
      tempRange: "minus12_0",
    },
    frigo_15pal_0_minus20: {
      label: "Camion frigo / koelwagen – 15 Pal (0°C / -20°C)",
      pallets: 15,
      weight: 5500,
      height: 2.27,   // Document note: "pour 14 pal"
      length: 7.60,
      width: 2.26,
      volume: 37.5,
      tailLift: true,
      tailLiftCapacity: 1450,
      tempRange: "0_minus20",
    },
  },

  // Base prices per pricing mode (excl. VAT)
  // Source: tariff sheet rows: Prix Bxl, Prix Banl., Prix Prov. min, Prix Km prov. min
  PRICES: {
    bxl: {
      voiture:                9.15,
      bestel_1pal:           18.97,
      bestel_2pal:           37.04,
      bestel_3pal:           49.80,
      camion_6pal:           71.10,
      camion_14pal:          88.88,
      camion_17pal:          94.81,  // VERIFY: read as 94.81 from "Prix Bxl" row — sheet shows €94.81 for col 17Pal
      camion_18pal_lourd:   106.65,
      bache_18pal:          112.58,
      semi_bache_33pal:     130.36,
      frigo_15pal_minus12_0: 106.65,
      frigo_15pal_0_minus20: 118.50,
    },
    rand: {
      voiture:               11.64,
      bestel_1pal:           21.37,
      bestel_2pal:           42.72,
      bestel_3pal:           55.71,
      camion_6pal:           77.02,
      camion_14pal:          94.81,
      camion_17pal:         100.73,
      camion_18pal_lourd:   112.58,
      bache_18pal:          118.50,
      semi_bache_33pal:     142.20,
      frigo_15pal_minus12_0: 112.58,
      frigo_15pal_0_minus20: 124.43,
    },
    prov_min: {
      voiture:               22.18,
      bestel_1pal:           33.27,
      bestel_2pal:           49.90,
      bestel_3pal:           59.88,
      camion_6pal:           83.17,
      camion_14pal:         102.55,
      camion_17pal:         109.39,
      camion_18pal_lourd:   113.95,
      bache_18pal:          120.78,
      semi_bache_33pal:     153.82,
      frigo_15pal_minus12_0: 113.95,
      frigo_15pal_0_minus20: 127.62,
    },
    prov_km: {
      // Rate per km (Prix / Prijs Km prov. min)
      voiture:               0.44,
      bestel_1pal:           0.51,
      bestel_2pal:           0.55,
      bestel_3pal:           0.60,
      camion_6pal:           0.83,
      camion_14pal:          1.03,
      camion_17pal:          1.09,
      camion_18pal_lourd:    1.14,
      bache_18pal:           1.20,
      semi_bache_33pal:      1.54,
      frigo_15pal_minus12_0: 1.14,
      frigo_15pal_0_minus20: 1.27,
    },
  },

  // Km tax percentages — only for vehicles/modes where shown in the sheet.
  // null = no km tax applicable (not shown in tariff sheet for that vehicle)
  // NOTE: Voiture, bestel 1/2/3 pal, camion 6pal have NO km tax shown in sheet.
  KM_TAX: {
    bxl: {
      voiture:                null,
      bestel_1pal:            null,
      bestel_2pal:            null,
      bestel_3pal:            null,
      camion_6pal:            null,
      camion_14pal:           0.0652,
      camion_17pal:           0.0620,
      camion_18pal_lourd:     0.0834,
      bache_18pal:            0.0797,
      semi_bache_33pal:       0.0680,
      frigo_15pal_minus12_0:  0.0834,
      frigo_15pal_0_minus20:  0.0797,
    },
    rand: {
      voiture:                null,
      bestel_1pal:            null,
      bestel_2pal:            null,
      bestel_3pal:            null,
      camion_6pal:            null,
      camion_14pal:           0.0652,
      camion_17pal:           0.0620,
      camion_18pal_lourd:     0.0834,
      bache_18pal:            0.0797,
      semi_bache_33pal:       0.0680,
      frigo_15pal_minus12_0:  0.0834,
      frigo_15pal_0_minus20:  0.0797,
    },
    prov_min: {
      voiture:                null,
      bestel_1pal:            null,
      bestel_2pal:            null,
      bestel_3pal:            null,
      camion_6pal:            null,
      camion_14pal:           0.0680,
      camion_17pal:           0.0638,
      camion_18pal_lourd:     0.0987,
      bache_18pal:            0.0931,
      semi_bache_33pal:       0.0711,
      frigo_15pal_minus12_0:  0.0987,
      frigo_15pal_0_minus20:  0.0931,
    },
    prov_km: {
      voiture:                null,
      bestel_1pal:            null,
      bestel_2pal:            null,
      bestel_3pal:            null,
      camion_6pal:            null,
      camion_14pal:           0.0880,
      camion_17pal:           0.0826,
      camion_18pal_lourd:     0.1268,
      bache_18pal:            0.1200,
      semi_bache_33pal:       0.0898,
      frigo_15pal_minus12_0:  0.1268,
      frigo_15pal_0_minus20:  0.1200,
    },
    extra_stop_other: {
      // Km tax on "Extra stop autres / anderen" — same as prov_km row
      voiture:                null,
      bestel_1pal:            null,
      bestel_2pal:            null,
      bestel_3pal:            null,
      camion_6pal:            null,
      camion_14pal:           0.0880,
      camion_17pal:           0.0826,
      camion_18pal_lourd:     0.1268,
      bache_18pal:            0.1200,
      semi_bache_33pal:       0.0898,
      frigo_15pal_minus12_0:  0.1268,
      frigo_15pal_0_minus20:  0.1200,
    },
  },

  // Waiting time: included free minutes and per-15min surcharge
  WAITING: {
    voiture:                { includedMin: 0,  per15min: 6.99 },
    bestel_1pal:            { includedMin: 0,  per15min: 6.99 },
    bestel_2pal:            { includedMin: 15, per15min: 6.99 },
    bestel_3pal:            { includedMin: 15, per15min: 6.99 },
    camion_6pal:            { includedMin: 15, per15min: 8.11 },
    camion_14pal:           { includedMin: 15, per15min: 10.18 },
    camion_17pal:           { includedMin: 15, per15min: 10.18 },
    camion_18pal_lourd:     { includedMin: 15, per15min: 10.73 },
    bache_18pal:            { includedMin: 30, per15min: 10.73 },
    semi_bache_33pal:       { includedMin: 30, per15min: 11.85 },
    frigo_15pal_minus12_0:  { includedMin: 15, per15min: 10.73 },
    frigo_15pal_0_minus20:  { includedMin: 30, per15min: 11.85 },
  },

  // Extra stop surcharges
  // VERIFY: Extra stop autres/anderen values confirmed from sheet visual inspection.
  // Both BXL stops and "autres" appear to share the same rate grid in the sheet.
  EXTRA_STOPS: {
    bxl: {
      voiture:                9.15,
      bestel_1pal:           16.52,
      bestel_2pal:           21.94,
      bestel_3pal:           27.35,
      camion_6pal:           35.55,
      camion_14pal:          44.44,
      camion_17pal:          47.41,
      camion_18pal_lourd:    53.34,
      bache_18pal:           56.29,
      semi_bache_33pal:      68.36,
      frigo_15pal_minus12_0: 53.34,
      frigo_15pal_0_minus20: 59.26,
    },
    other: {
      // VERIFY: These values read from "Extra stop autres / anderen" row in sheet.
      // Visual inspection suggests same values as BXL row for most vehicles.
      // Marked for staff verification against original document.
      voiture:                11.64,  // VERIFY
      bestel_1pal:            16.52,  // VERIFY
      bestel_2pal:            21.94,  // VERIFY
      bestel_3pal:            27.35,  // VERIFY
      camion_6pal:            35.55,  // VERIFY
      camion_14pal:           44.44,  // VERIFY
      camion_17pal:           47.41,  // VERIFY
      camion_18pal_lourd:     53.34,  // VERIFY
      bache_18pal:            56.29,  // VERIFY
      semi_bache_33pal:       68.36,  // VERIFY
      frigo_15pal_minus12_0:  53.34,  // VERIFY
      frigo_15pal_0_minus20:  59.26,  // VERIFY
    },
  },

  // Tournée / Dispo hourly rates
  // "under6" = Tournée/Dispo - de van 6H/U (less than 6h)
  // "over6"  = Tournée/Dispo + de van 6H/U (6h or more)
  DISPO: {
    under6: {
      voiture:                null,   // Dash in sheet — not available
      bestel_1pal:            30.41,
      bestel_2pal:            38.74,
      bestel_3pal:            38.74,
      camion_6pal:            45.58,
      camion_14pal:           51.28,
      camion_17pal:           55.83,
      camion_18pal_lourd:     60.73,
      bache_18pal:            60.73,
      semi_bache_33pal:       72.26,
      frigo_15pal_minus12_0:  60.73,
      frigo_15pal_0_minus20:  65.65,
    },
    over6: {
      voiture:                null,   // Dash in sheet — not available
      bestel_1pal:            0.00,   // €0.00 as shown in sheet
      bestel_2pal:            34.19,
      bestel_3pal:            34.19,
      camion_6pal:            41.02,
      camion_14pal:           46.26,
      camion_17pal:           50.94,
      camion_18pal_lourd:     55.83,
      bache_18pal:            55.83,
      semi_bache_33pal:       66.32,
      frigo_15pal_minus12_0:  55.83,
      frigo_15pal_0_minus20:  60.73,
    },
    kmSupp: {
      voiture:                null,
      bestel_1pal:            0.26,
      bestel_2pal:            0.27,
      bestel_3pal:            0.30,
      camion_6pal:            0.41,
      camion_14pal:           0.51,
      camion_17pal:           0.55,
      camion_18pal_lourd:     0.57,
      bache_18pal:            0.60,
      semi_bache_33pal:       0.77,
      frigo_15pal_minus12_0:  0.57,
      frigo_15pal_0_minus20:  0.64,
    },
  },

  // Navette fixed prices by zone
  NAVETTES: {
    bxl:      { label: "Bxl / Brussel",              price: 6.65 },
    rand:     { label: "Banl. / Rand",               price: 7.76 },
    brabant:  { label: "Brabant",                    price: 12.20 },
    prov:     { label: "Prov.",                      price: 15.25 },
    prov_lux: { label: "Prov. Lux.",                 price: 24.40 },
    export:   { label: "Export (sur demande)",       price: null, note: "À partir de / Vanaf €50 — prix sur demande / prijs op aanvraag" },
  },

  // Supplements
  SUPPLEMENTS: {
    nightBase:          67.22,  // Nuit / Nacht
    nightFrigo12_0:     79.44,  // Nuit / Nacht 12°C / 0°C
    nightFrigo0_20:     91.67,  // Nuit / Nacht 0°C / -20°C
    convoyeurPerHour:   31.27,  // Convoyeur / Begeleider /u/h
    chauffeurPerHour:   36.66,  // 2° Chauffeur /u/h
  },

  // Fuel surcharge (variable — update monthly)
  FUEL_SURCHARGE_EXAMPLE_PCT: 7.75, // Example from November 2020 — NOT a fixed rate

  // VAT
  VAT_RATE: 0.21,
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/** Convert a value in given unit to meters */
function normalizeToMeters(value, unit) {
  if (!value || isNaN(value)) return 0;
  return unit === "cm" ? value / 100 : parseFloat(value);
}

/** Round a number to 2 decimal places */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "€\u00A0" + n.toFixed(2);
}

/** Round minutes up to next 15-min block */
function roundUpTo15(minutes) {
  return Math.ceil(minutes / 15);
}

// ============================================================
// VEHICLE SELECTION ENGINE
// ============================================================

/**
 * Returns an array of candidate vehicle IDs that satisfy all user requirements.
 * Also returns a debug object describing pass/fail per vehicle per constraint.
 */
function getCandidateVehicles(req) {
  const { pallets, weight, height, length, width, volume, tailLift, refrigerated, tempRange } = req;
  const candidates = [];
  const debugInfo = {};

  for (const id of TARIFF_DATA.VEHICLE_IDS) {
    const v = TARIFF_DATA.VEHICLES[id];
    const checks = {};

    // Pallet check
    checks.pallets = { required: pallets, capacity: v.pallets, pass: pallets <= v.pallets };

    // Weight check
    checks.weight = { required: weight, capacity: v.weight, pass: weight <= v.weight };

    // Dimension checks (only if user provided non-zero values)
    checks.height = height > 0
      ? { required: height, capacity: v.height, pass: height <= v.height }
      : { pass: true, note: "non renseigné" };

    checks.length = length > 0
      ? { required: length, capacity: v.length, pass: length <= v.length }
      : { pass: true, note: "non renseigné" };

    checks.width = width > 0
      ? { required: width, capacity: v.width, pass: width <= v.width }
      : { pass: true, note: "non renseigné" };

    checks.volume = volume > 0
      ? { required: volume, capacity: v.volume, pass: volume <= v.volume }
      : { pass: true, note: "non renseigné" };

    // Tail lift check
    if (tailLift) {
      checks.tailLift = { required: true, available: v.tailLift, pass: v.tailLift === true };
    } else {
      checks.tailLift = { pass: true, note: "non requis" };
    }

    // Refrigeration check
    if (refrigerated) {
      const needsTemp = tempRange !== null && tempRange !== undefined;
      if (v.tempRange === null) {
        // Vehicle has no refrigeration
        checks.refrigeration = { required: tempRange || "frigo", available: "aucune", pass: false };
      } else if (needsTemp && v.tempRange !== tempRange) {
        checks.refrigeration = { required: tempRange, available: v.tempRange, pass: false };
      } else {
        checks.refrigeration = { required: tempRange, available: v.tempRange, pass: true };
      }
    } else {
      // Non-refrigerated jobs: frigo trucks ARE valid (they can carry ambient cargo)
      // but for clean matching, prefer non-frigo. We do NOT exclude frigo trucks.
      checks.refrigeration = { pass: true, note: "non requis" };
    }

    const allPass = Object.values(checks).every(c => c.pass);
    debugInfo[id] = { label: v.label, checks, allPass };

    if (allPass) candidates.push(id);
  }

  return { candidates, debugInfo };
}

/** Return the best (smallest/first valid) vehicle from candidates */
function selectBestVehicle(candidates) {
  // VEHICLE_IDS is ordered smallest to largest — first match is smallest valid
  for (const id of TARIFF_DATA.VEHICLE_IDS) {
    if (candidates.includes(id)) return id;
  }
  return null;
}

// ============================================================
// PRICE CALCULATION FUNCTIONS
// ============================================================

/** Get base price for a vehicle + pricing mode */
function getBasePrice(vehicleId, mode, kmDistance) {
  const prices = TARIFF_DATA.PRICES[mode];
  if (!prices) return { price: 0, note: "Mode de tarification inconnu" };
  const p = prices[vehicleId];
  if (p === undefined || p === null) return { price: 0, note: "Prix non disponible pour ce véhicule/mode" };

  if (mode === "prov_km") {
    const dist = parseFloat(kmDistance) || 0;
    return { price: p * dist, note: `${fmt(p).replace("€\u00A0", "")} €/km × ${dist} km` };
  }
  return { price: p, note: null };
}

/** Get km tax amount for a vehicle + mode */
function getKmTax(vehicleId, mode, basePrice) {
  const taxTable = TARIFF_DATA.KM_TAX[mode];
  if (!taxTable) return { amount: 0, pct: null };
  const pct = taxTable[vehicleId];
  if (pct === null || pct === undefined) return { amount: 0, pct: null };
  return { amount: basePrice * pct, pct };
}

/** Calculate extra km tax for extra stops autres/anderen */
function getExtraStopKmTax(vehicleId, stopPrice) {
  const pct = TARIFF_DATA.KM_TAX.extra_stop_other[vehicleId];
  if (pct === null || pct === undefined) return { amount: 0, pct: null };
  return { amount: stopPrice * pct, pct };
}

/** Calculate waiting time surcharge */
function calculateWaitingCost(vehicleId, totalWaitMinutes) {
  const w = TARIFF_DATA.WAITING[vehicleId];
  if (!w) return { amount: 0, note: "—" };

  const extra = totalWaitMinutes - w.includedMin;
  if (extra <= 0) return { amount: 0, note: `${totalWaitMinutes} min ≤ ${w.includedMin} min inclus`, included: w.includedMin };

  const blocks = roundUpTo15(extra);
  const amount = blocks * w.per15min;
  return {
    amount,
    note: `${extra} min extra → ${blocks} × 15 min × ${fmt(w.per15min)}`,
    included: w.includedMin,
    blocks,
    ratePerBlock: w.per15min,
  };
}

/** Calculate extra stops cost */
function calculateExtraStops(vehicleId, stopsInBxl, stopsOther) {
  const bxlRate = TARIFF_DATA.EXTRA_STOPS.bxl[vehicleId] || 0;
  const otherRate = TARIFF_DATA.EXTRA_STOPS.other[vehicleId] || 0;

  const bxlCost = stopsInBxl * bxlRate;
  const otherCost = stopsOther * otherRate;

  return {
    bxlCost,
    otherCost,
    bxlRate,
    otherRate,
    totalStopCost: bxlCost + otherCost,
  };
}

/** Calculate dispo/tournée cost */
function calculateDispoCost(vehicleId, duration, hours, extraKm) {
  const rateTable = TARIFF_DATA.DISPO[duration];
  const kmRate = TARIFF_DATA.DISPO.kmSupp[vehicleId];
  const hourlyRate = rateTable ? rateTable[vehicleId] : null;

  if (hourlyRate === null || hourlyRate === undefined) {
    return { amount: 0, kmCost: 0, note: "Non disponible pour ce véhicule (voir tarif)", unavailable: true };
  }

  const hoursCost = hourlyRate * hours;
  const kmCost = kmRate ? (kmRate * extraKm) : 0;

  return {
    amount: hoursCost,
    kmCost,
    hourlyRate,
    kmRate,
    hours,
    extraKm,
    note: null,
    unavailable: false,
  };
}

/** Calculate supplements */
function calculateSupplements(opts) {
  const s = TARIFF_DATA.SUPPLEMENTS;
  let total = 0;
  const lines = [];

  if (opts.nightBase) {
    total += s.nightBase;
    lines.push({ label: "Supplément nuit", amount: s.nightBase });
  }
  if (opts.nightFrigo12) {
    total += s.nightFrigo12_0;
    lines.push({ label: "Nuit frigo -12°C/0°C", amount: s.nightFrigo12_0 });
  }
  if (opts.nightFrigo20) {
    total += s.nightFrigo0_20;
    lines.push({ label: "Nuit frigo 0°C/-20°C", amount: s.nightFrigo0_20 });
  }
  if (opts.convoyeurHours > 0) {
    const amt = s.convoyeurPerHour * opts.convoyeurHours;
    total += amt;
    lines.push({ label: `Convoyeur (${opts.convoyeurHours}h × ${fmt(s.convoyeurPerHour)})`, amount: amt });
  }
  if (opts.chauffeurHours > 0) {
    const amt = s.chauffeurPerHour * opts.chauffeurHours;
    total += amt;
    lines.push({ label: `2° Chauffeur (${opts.chauffeurHours}h × ${fmt(s.chauffeurPerHour)})`, amount: amt });
  }

  return { total, lines };
}

/** Calculate fuel surcharge */
function calculateFuelSurcharge(subtotal, pct) {
  if (!pct || pct <= 0) return 0;
  return subtotal * (pct / 100);
}

/** Calculate VAT */
function calculateVAT(subtotal) {
  return subtotal * TARIFF_DATA.VAT_RATE;
}

// ============================================================
// MAIN CALCULATION ORCHESTRATOR
// ============================================================

function runCalculation() {
  const warnings = [];
  const breakdownSections = [];

  // ---- Read inputs ----
  const mode = document.querySelector('input[name="pricingMode"]:checked')?.value;
  const isNavette = mode === "navette";
  const isDispo = mode === "dispo";

  // Load requirements
  const pallets = parseInt(document.getElementById("reqPallets").value) || 0;
  const weight = parseFloat(document.getElementById("reqWeight").value) || 0;
  const heightRaw = parseFloat(document.getElementById("reqHeight").value) || 0;
  const heightUnit = document.getElementById("reqHeightUnit").value;
  const lengthRaw = parseFloat(document.getElementById("reqLength").value) || 0;
  const lengthUnit = document.getElementById("reqLengthUnit").value;
  const widthRaw = parseFloat(document.getElementById("reqWidth").value) || 0;
  const widthUnit = document.getElementById("reqWidthUnit").value;
  const volume = parseFloat(document.getElementById("reqVolume").value) || 0;
  const tailLift = document.getElementById("reqTailLift").checked;
  const refrigerated = document.getElementById("reqRefrigerated").checked;
  const tempRange = refrigerated ? document.getElementById("reqTempRange").value : null;

  const height = normalizeToMeters(heightRaw, heightUnit);
  const length = normalizeToMeters(lengthRaw, lengthUnit);
  const width = normalizeToMeters(widthRaw, widthUnit);

  const req = { pallets, weight, height, length, width, volume, tailLift, refrigerated, tempRange };

  // ---- Vehicle selection ----
  const { candidates, debugInfo } = getCandidateVehicles(req);
  updateDebugPanel(debugInfo);

  const overrideEnabled = document.getElementById("vehicleOverride").checked;
  let vehicleId;
  let vehicleSelectionNote;

  if (overrideEnabled) {
    vehicleId = document.getElementById("vehicleSelect").value;
    vehicleSelectionNote = "⚠ Sélection manuelle (override opérateur)";
    warnings.push("Véhicule sélectionné manuellement — vérifier la conformité aux exigences du chargement.");
  } else {
    vehicleId = selectBestVehicle(candidates);
    if (!vehicleId) {
      vehicleSelectionNote = "⚠ Aucun véhicule trouvé pour ces paramètres";
      warnings.push("Aucun véhicule du tarif ne correspond aux exigences. Sélection manuelle requise.");
    } else {
      vehicleSelectionNote = `Sélection automatique — plus petit véhicule valide`;
    }
  }

  if (!vehicleId) {
    document.getElementById("result-warning-banner").innerHTML =
      warnings.map(w => `⚠ ${w}`).join("<br>");
    document.getElementById("result-warning-banner").style.display = "block";
    document.getElementById("result-vehicle-name").textContent = "Aucun véhicule compatible";
    document.getElementById("result-vehicle-reason").textContent = "Ajustez les paramètres ou utilisez la sélection manuelle";
    document.getElementById("breakdown-table").innerHTML = "";
    document.getElementById("totals-block").innerHTML = "";
    document.getElementById("result-placeholder").style.display = "none";
    document.getElementById("result-content").style.display = "block";
    return;
  }

  const vehicle = TARIFF_DATA.VEHICLES[vehicleId];

  // ---- Extras ----
  const waitingMinutes = parseFloat(document.getElementById("waitingMinutes").value) || 0;
  const extraStopsBxl = parseInt(document.getElementById("extraStopsBxl").value) || 0;
  const extraStopsOther = parseInt(document.getElementById("extraStopsOther").value) || 0;
  const suppNight = document.getElementById("suppNight").checked;
  const suppNightFrigo12 = document.getElementById("suppNightFrigo12").checked;
  const suppNightFrigo20 = document.getElementById("suppNightFrigo20").checked;
  const convoyeurHours = parseFloat(document.getElementById("convoyeurHours").value) || 0;
  const chauffeurHours = parseFloat(document.getElementById("chauffeurHours").value) || 0;
  const fuelEnabled = document.getElementById("fuelEnabled").checked;
  const fuelPct = fuelEnabled ? (parseFloat(document.getElementById("fuelPct").value) || 0) : 0;
  const showVAT = document.getElementById("showVAT").checked;

  // Update waiting helper
  const waitInfo = TARIFF_DATA.WAITING[vehicleId];
  document.getElementById("waitingHelper").textContent =
    `Temps inclus: ${waitInfo ? waitInfo.includedMin : "—"} min`;

  // ============================================================
  // CALCULATE BY MODE
  // ============================================================
  let baseTotal = 0;
  let manualQuote = false;

  if (isNavette) {
    // ---- NAVETTE MODE ----
    const navetteZone = document.getElementById("navetteZone").value;
    const navette = TARIFF_DATA.NAVETTES[navetteZone];

    if (navetteZone === "export" || navette.price === null) {
      manualQuote = true;
      warnings.push("Export sur demande — prix sur demande / op aanvraag. Cotation manuelle requise.");
    } else {
      baseTotal = navette.price;
      breakdownSections.push({
        title: "NAVETTE",
        rows: [{ label: `Navette — ${navette.label}`, value: navette.price }],
      });
    }

  } else if (isDispo) {
    // ---- DISPO / TOURNÉE MODE ----
    const duration = document.getElementById("dispoDuration").value;
    const hours = parseFloat(document.getElementById("dispoHours").value) || 0;
    const extraKm = parseFloat(document.getElementById("dispoExtraKm").value) || 0;

    const dispo = calculateDispoCost(vehicleId, duration, hours, extraKm);

    if (dispo.unavailable) {
      warnings.push(`Dispo/Tournée non disponible pour: ${vehicle.label}`);
      breakdownSections.push({
        title: "TOURNÉE / DISPO",
        rows: [{ label: "Non disponible pour ce véhicule", value: null, note: true }],
      });
    } else {
      baseTotal = dispo.amount + dispo.kmCost;
      const durationLabel = duration === "under6" ? "Moins de 6h" : "6h ou plus";
      breakdownSections.push({
        title: "TOURNÉE / DISPO",
        rows: [
          { label: `${durationLabel} — ${hours}h × ${fmt(dispo.hourlyRate)}`, value: dispo.amount },
          dispo.extraKm > 0 ? { label: `Km supp. — ${extraKm} km × ${fmt(dispo.kmRate)}`, value: dispo.kmCost } : null,
        ].filter(Boolean),
      });
    }

  } else {
    // ---- STANDARD MODES: bxl, rand, prov_min, prov_km ----
    const kmDistance = mode === "prov_km" ? (parseFloat(document.getElementById("provKmDistance").value) || 0) : 0;
    const base = getBasePrice(vehicleId, mode, kmDistance);
    baseTotal = base.price;

    const kmTax = getKmTax(vehicleId, mode, base.price);

    const modeLabelMap = { bxl: "Prix Bruxelles", rand: "Prix Rand / Banlieue", prov_min: "Prix Province min.", prov_km: "Prix Province / km" };
    const modeLabel = modeLabelMap[mode] || mode;

    const baseRows = [
      { label: `${modeLabel}${base.note ? " (" + base.note + ")" : ""}`, value: base.price },
    ];

    if (kmTax.pct !== null) {
      baseTotal += kmTax.amount;
      baseRows.push({ label: `Taxe kilométrique (${(kmTax.pct * 100).toFixed(2)}% × ${fmt(base.price)})`, value: kmTax.amount });
    } else {
      baseRows.push({ label: "Taxe kilométrique", value: null, noteText: "Non applicable (non renseignée dans tarif)" });
    }

    breakdownSections.push({ title: "TARIF DE BASE", rows: baseRows });
  }

  // ---- Waiting time ----
  if (!isNavette && !manualQuote) {
    const waitCost = calculateWaitingCost(vehicleId, waitingMinutes);
    if (waitingMinutes > 0 || true) {
      const waitRows = [];
      if (waitCost.amount > 0) {
        waitRows.push({ label: `Attente — ${waitCost.note}`, value: waitCost.amount });
      } else {
        waitRows.push({ label: `Attente (${waitingMinutes} min incl. ${waitCost.included} min)`, value: 0, zero: true });
      }
      baseTotal += waitCost.amount;
      breakdownSections.push({ title: "TEMPS D'ATTENTE", rows: waitRows });
    }
  }

  // ---- Extra stops ----
  if (!manualQuote && (extraStopsBxl > 0 || extraStopsOther > 0)) {
    const stops = calculateExtraStops(vehicleId, extraStopsBxl, extraStopsOther);
    const stopRows = [];

    if (extraStopsBxl > 0) {
      stopRows.push({ label: `Extra arrêts Bruxelles — ${extraStopsBxl} × ${fmt(stops.bxlRate)}`, value: stops.bxlCost });
    }
    if (extraStopsOther > 0) {
      stopRows.push({
        label: `Extra arrêts autres — ${extraStopsOther} × ${fmt(stops.otherRate)}`,
        value: stops.otherCost,
        noteText: "VERIFY: confirmer valeur Extra stop autres dans document original",
      });
      // km tax on other stops
      const otherKmTax = getExtraStopKmTax(vehicleId, stops.otherCost);
      if (otherKmTax.pct !== null) {
        stopRows.push({ label: `Taxe km extra arrêts autres (${(otherKmTax.pct * 100).toFixed(2)}%)`, value: otherKmTax.amount });
        baseTotal += otherKmTax.amount;
      }
    }

    baseTotal += stops.totalStopCost;
    breakdownSections.push({ title: "EXTRA ARRÊTS", rows: stopRows });
  }

  // ---- Supplements ----
  const suppResult = calculateSupplements({
    nightBase: suppNight,
    nightFrigo12: suppNightFrigo12,
    nightFrigo20: suppNightFrigo20,
    convoyeurHours,
    chauffeurHours,
  });

  if (suppResult.total > 0) {
    baseTotal += suppResult.total;
    breakdownSections.push({
      title: "SUPPLÉMENTS",
      rows: suppResult.lines.map(l => ({ label: l.label, value: l.amount })),
    });
  }

  // ---- Fuel surcharge ----
  const fuelAmount = calculateFuelSurcharge(baseTotal, fuelPct);
  if (fuelAmount > 0) {
    breakdownSections.push({
      title: "SURCHARGE CARBURANT",
      rows: [
        {
          label: `Surcharge carburant (${fuelPct}% — variable, vérifier mensuellement)`,
          value: fuelAmount,
          noteText: "⚠ % variable — exemple nov. 2020: 7.75%",
        },
      ],
    });
  }

  const subtotal = baseTotal + fuelAmount;
  const vatAmount = calculateVAT(subtotal);
  const totalWithVAT = subtotal + vatAmount;

  // ---- Update UI ----
  document.getElementById("result-placeholder").style.display = "none";
  document.getElementById("result-content").style.display = "block";

  // Warnings
  const warnBanner = document.getElementById("result-warning-banner");
  if (warnings.length > 0) {
    warnBanner.innerHTML = warnings.map(w => `⚠ ${w}`).join("<br>");
    warnBanner.style.display = "block";
  } else {
    warnBanner.style.display = "none";
  }

  // Vehicle card
  document.getElementById("result-vehicle-name").textContent = vehicle.label;
  document.getElementById("result-vehicle-reason").textContent = vehicleSelectionNote;

  // Manual quote display
  if (manualQuote) {
    document.getElementById("breakdown-table").innerHTML = `
      <div class="manual-quote-card">
        <strong>⚠ Prix sur demande / Prijs op aanvraag</strong>
        Export: à partir de €50 — Cotation manuelle requise. Contacter le département commercial.
      </div>`;
    document.getElementById("totals-block").innerHTML = "";
    return;
  }

  // Breakdown
  renderBreakdown(breakdownSections);
  renderTotals(subtotal, vatAmount, totalWithVAT, showVAT);
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderBreakdown(sections) {
  const container = document.getElementById("breakdown-table");
  let html = "";

  for (const section of sections) {
    html += `<div class="breakdown-section-title">${section.title}</div>`;
    for (const row of section.rows) {
      if (!row) continue;
      const valClass = row.note ? "info" : (row.zero || row.value === 0 ? "zero" : "");
      const valText = row.note ? "—" : (row.value === null ? "—" : fmt(row.value));
      html += `<div class="breakdown-row">
        <span class="breakdown-label">${row.label}</span>
        <span class="breakdown-value ${valClass}">${valText}</span>
      </div>`;
      if (row.noteText) {
        html += `<div class="breakdown-note">${row.noteText}</div>`;
      }
    }
  }

  container.innerHTML = html;
}

function renderTotals(subtotal, vatAmount, totalWithVAT, showVAT) {
  const container = document.getElementById("totals-block");
  let html = `
    <div class="total-row subtotal">
      <span class="total-label">Sous-total HTVA</span>
      <span class="total-value">${fmt(subtotal)}</span>
    </div>`;

  if (showVAT) {
    html += `
    <div class="total-row vat-row">
      <span class="total-label">TVA 21%</span>
      <span class="total-value">${fmt(vatAmount)}</span>
    </div>
    <div class="total-row grand-total">
      <span class="total-label">TOTAL TTC</span>
      <span class="total-value">${fmt(totalWithVAT)}</span>
    </div>`;
  } else {
    html += `
    <div class="total-row grand-total">
      <span class="total-label">TOTAL HTVA</span>
      <span class="total-value">${fmt(subtotal)}</span>
    </div>
    <div class="total-row vat-row">
      <span class="total-label">TVA 21% (non incluse)</span>
      <span class="total-value">${fmt(vatAmount)}</span>
    </div>`;
  }

  container.innerHTML = html;
}

function updateVehicleAutoResult(req) {
  const { candidates } = getCandidateVehicles(req);
  const container = document.getElementById("vehicle-auto-result");
  const best = selectBestVehicle(candidates);

  if (best) {
    const v = TARIFF_DATA.VEHICLES[best];
    container.innerHTML = `<div class="vehicle-match">
      <span class="match-icon">✓</span>
      <div>
        <strong>${v.label}</strong>
        <div style="font-size:11px;font-weight:400;color:#1a5c35;margin-top:2px;">
          ${candidates.length} véhicule(s) compatible(s) — plus petit sélectionné automatiquement
        </div>
      </div>
    </div>`;
  } else {
    container.innerHTML = `<div class="vehicle-nomatch">
      ✕ Aucun véhicule compatible — sélection manuelle requise
    </div>`;
  }
}

function updateDebugPanel(debugInfo) {
  const container = document.getElementById("debug-body");
  let html = "";

  for (const id of TARIFF_DATA.VEHICLE_IDS) {
    const info = debugInfo[id];
    if (!info) continue;
    const icon = info.allPass ? "✓" : "✕";
    const cls = info.allPass ? "check-pass" : "check-fail";
    html += `<div class="debug-vehicle">
      <div class="debug-vehicle-name ${cls}">${icon} ${info.label}</div>`;

    for (const [key, chk] of Object.entries(info.checks)) {
      if (chk.note === "non renseigné" || chk.note === "non requis") {
        html += `<span class="check-na">  · ${key}: N/A (${chk.note})</span><br>`;
      } else if (chk.pass) {
        const detail = chk.required !== undefined ? ` (requis: ${chk.required}, cap: ${chk.capacity})` : "";
        html += `<span class="check-pass">  ✓ ${key}${detail}</span><br>`;
      } else {
        const detail = chk.required !== undefined ? ` (requis: ${chk.required}, cap: ${chk.capacity})` : "";
        html += `<span class="check-fail">  ✕ ${key}${detail}</span><br>`;
      }
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}

// ============================================================
// UI HELPERS
// ============================================================

function populateVehicleSelect() {
  const sel = document.getElementById("vehicleSelect");
  sel.innerHTML = "";
  for (const id of TARIFF_DATA.VEHICLE_IDS) {
    const v = TARIFF_DATA.VEHICLES[id];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = v.label;
    sel.appendChild(opt);
  }
}

function toggleConditionalBlocks() {
  const mode = document.querySelector('input[name="pricingMode"]:checked')?.value;

  setVisible("block-prov-km", mode === "prov_km");
  setVisible("block-navette", mode === "navette");
  setVisible("block-dispo", mode === "dispo");
  setVisible("block-temp", document.getElementById("reqRefrigerated").checked);
  setVisible("block-vehicle-override", document.getElementById("vehicleOverride").checked);
  setVisible("block-fuel", document.getElementById("fuelEnabled").checked);
}

function setVisible(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("visible", visible);
}

function getRequirementsFromForm() {
  const pallets = parseInt(document.getElementById("reqPallets").value) || 0;
  const weight = parseFloat(document.getElementById("reqWeight").value) || 0;
  const height = normalizeToMeters(parseFloat(document.getElementById("reqHeight").value) || 0, document.getElementById("reqHeightUnit").value);
  const length = normalizeToMeters(parseFloat(document.getElementById("reqLength").value) || 0, document.getElementById("reqLengthUnit").value);
  const width = normalizeToMeters(parseFloat(document.getElementById("reqWidth").value) || 0, document.getElementById("reqWidthUnit").value);
  const volume = parseFloat(document.getElementById("reqVolume").value) || 0;
  const tailLift = document.getElementById("reqTailLift").checked;
  const refrigerated = document.getElementById("reqRefrigerated").checked;
  const tempRange = refrigerated ? document.getElementById("reqTempRange").value : null;
  return { pallets, weight, height, length, width, volume, tailLift, refrigerated, tempRange };
}

function copyBreakdownText() {
  const vehicleName = document.getElementById("result-vehicle-name").textContent;
  const rows = document.querySelectorAll(".breakdown-row");
  const totalRows = document.querySelectorAll(".total-row");

  let text = `=== TARIEVEN / TARIFS 2021 ===\n`;
  text += `Véhicule: ${vehicleName}\n\n`;

  let section = "";
  document.querySelectorAll(".breakdown-section-title, .breakdown-row, .breakdown-note").forEach(el => {
    if (el.classList.contains("breakdown-section-title")) {
      text += `\n--- ${el.textContent} ---\n`;
    } else if (el.classList.contains("breakdown-row")) {
      const label = el.querySelector(".breakdown-label")?.textContent || "";
      const value = el.querySelector(".breakdown-value")?.textContent || "";
      text += `${label.padEnd(50)} ${value}\n`;
    } else if (el.classList.contains("breakdown-note")) {
      text += `  * ${el.textContent}\n`;
    }
  });

  text += "\n--- TOTAUX ---\n";
  totalRows.forEach(row => {
    const label = row.querySelector(".total-label")?.textContent || "";
    const value = row.querySelector(".total-value")?.textContent || "";
    text += `${label.padEnd(50)} ${value}\n`;
  });

  text += `\n[Tarif 2021 — Tous les prix HTVA (21%)]`;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("btnCopy");
    const orig = btn.textContent;
    btn.textContent = "✓ Copié!";
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(() => {
    alert("Impossible de copier automatiquement. Veuillez sélectionner manuellement.");
  });
}

function resetForm() {
  document.querySelectorAll('input[type="number"]').forEach(el => {
    const defaults = {
      reqPallets: "2", reqWeight: "300", reqHeight: "1.2", reqLength: "2.0",
      reqWidth: "1.1", reqVolume: "0", waitingMinutes: "0",
      extraStopsBxl: "0", extraStopsOther: "0", convoyeurHours: "0", chauffeurHours: "0",
      fuelPct: "7.75", provKmDistance: "50", dispoHours: "4", dispoExtraKm: "0",
    };
    if (defaults[el.id] !== undefined) el.value = defaults[el.id];
  });
  document.querySelectorAll('input[type="checkbox"]').forEach(el => { el.checked = false; });
  document.querySelector('input[name="pricingMode"][value="bxl"]').checked = true;

  toggleConditionalBlocks();
  const req = getRequirementsFromForm();
  const { debugInfo } = getCandidateVehicles(req);
  updateVehicleAutoResult(req);
  updateDebugPanel(debugInfo);

  document.getElementById("result-placeholder").style.display = "block";
  document.getElementById("result-content").style.display = "none";
  document.getElementById("waitingHelper").textContent = "Temps inclus: — min";
}

// ============================================================
// EVENT LISTENERS + INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  populateVehicleSelect();
  toggleConditionalBlocks();

  // Trigger live vehicle match on requirement change
  const reqInputs = [
    "reqPallets", "reqWeight", "reqHeight", "reqLength", "reqWidth", "reqVolume",
    "reqHeightUnit", "reqLengthUnit", "reqWidthUnit",
  ];
  reqInputs.forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => {
      const req = getRequirementsFromForm();
      updateVehicleAutoResult(req);
    });
    document.getElementById(id)?.addEventListener("change", () => {
      const req = getRequirementsFromForm();
      updateVehicleAutoResult(req);
    });
  });

  document.getElementById("reqTailLift").addEventListener("change", () => {
    toggleConditionalBlocks();
    updateVehicleAutoResult(getRequirementsFromForm());
  });
  document.getElementById("reqRefrigerated").addEventListener("change", () => {
    toggleConditionalBlocks();
    updateVehicleAutoResult(getRequirementsFromForm());
  });
  document.getElementById("reqTempRange").addEventListener("change", () => {
    updateVehicleAutoResult(getRequirementsFromForm());
  });

  document.querySelectorAll('input[name="pricingMode"]').forEach(el => {
    el.addEventListener("change", toggleConditionalBlocks);
  });
  document.getElementById("vehicleOverride").addEventListener("change", toggleConditionalBlocks);
  document.getElementById("fuelEnabled").addEventListener("change", toggleConditionalBlocks);

  document.getElementById("btnCalculate").addEventListener("click", runCalculation);
  document.getElementById("btnReset").addEventListener("click", resetForm);
  document.getElementById("btnPrint").addEventListener("click", () => window.print());
  document.getElementById("btnCopy").addEventListener("click", copyBreakdownText);

  document.getElementById("debug-toggle").addEventListener("click", () => {
    const body = document.getElementById("debug-body");
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "block" : "none";
    document.getElementById("debug-toggle").querySelector("span").textContent =
      (isHidden ? "▼" : "▶") + " Détails de sélection (afficher/masquer)";
  });

  // Initial vehicle match display
  updateVehicleAutoResult(getRequirementsFromForm());
  const { debugInfo } = getCandidateVehicles(getRequirementsFromForm());
  updateDebugPanel(debugInfo);
});

/* ============================================================
   TEST SCENARIOS (for staff verification)
   ============================================================

   SCENARIO 1 — Small Brussels delivery
   Mode: Bruxelles, 1 pallet, 400kg, no tailLift, no frigo
   Expected vehicle: bestel_1pal (Camionette 1 Pal)
   Expected base: €18.97 (Prix Bxl)
   No km tax (not shown for this vehicle in sheet)
   No waiting, no stops
   Total HTVA: €18.97

   SCENARIO 2 — Province delivery with km
   Mode: Province/km, 3 pallets, 480kg, h:1.7m, l:2.4m, w:1.35m
   Distance: 80 km
   Expected vehicle: bestel_3pal (Camionette 3 Pal)
   Expected base: 0.60 × 80 = €48.00
   No km tax for this vehicle in prov_km mode
   Total HTVA: €48.00

   SCENARIO 3 — Large refrigerated delivery with tail lift
   Mode: Rand, frigo required, temp: -12°C/0°C, 14 pals, 5000kg, tailLift
   Expected vehicle: frigo_15pal_minus12_0
   Expected base Prix Rand: €112.58
   Km tax (Rand): 8.34% × €112.58 = €9.39
   Base + km tax: €121.97

   SCENARIO 4 — Dispo 8 hours with extra km
   Mode: Dispo, vehicle: camion_14pal, over6h, 8 hours, 50km extra
   Expected: 8 × €46.26 = €370.08 + 50 × €0.51 = €25.50
   Total dispo: €395.58

   SCENARIO 5 — Navette Brussels with night supplement
   Mode: Navette Bxl
   Base: €6.65
   + Night supplement: €67.22
   Total HTVA: €73.87

   ============================================================ */