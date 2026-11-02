/**
 * Demo pharmacies in Ikeja, Lagos, to try the medicine shop.
 *
 *   node scripts/demo-shop.js add      adds 3 demo pharmacies with products + a demo owner login
 *   node scripts/demo-shop.js remove   deletes every demo pharmacy and everything attached to it
 *
 * They're marked `demo: true`, so the shop only shows them to the patient accounts listed in
 * SHOP_DEMO_USERS (comma-separated emails). Real patients never see them. Uses MONGODB_URI from
 * .env, which is the LIVE database.
 */
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const DEMO_OWNER_EMAIL = 'demo.pharmacy@adjscodes.test';

// [name, generic, strength, pack, category, price $, stock, prescription-only]
const CATALOGUE = [
  ['Panadol Extra', 'Paracetamol', '500 mg tablets', 'Pack of 24', 'pain', 6.5, 40, false],
  ['Ibuprofen', 'Ibuprofen', '400 mg tablets', 'Pack of 24', 'pain', 4.0, 30, false],
  ['Benylin Chesty Cough', 'Guaifenesin', 'Syrup 100 ml', 'Bottle', 'cold-flu', 7.5, 18, false],
  ['Loratadine', 'Loratadine', '10 mg tablets', 'Pack of 30', 'allergy', 5.0, 22, false],
  ['ORS Sachets', 'Oral rehydration salts', 'Orange flavour', 'Box of 10', 'digestive', 3.0, 50, false],
  ['Vitamin C 1000', 'Ascorbic acid', 'Effervescent', 'Tube of 20', 'vitamins', 9.0, 15, false],
  ['Amoxil', 'Amoxicillin', '500 mg capsules', 'Pack of 21', 'antibiotics', 15.0, 12, true],
  ['Amlodipine', 'Amlodipine', '5 mg tablets', 'Pack of 28', 'chronic', 12.0, 20, true],
  ['Metformin', 'Metformin', '500 mg tablets', 'Pack of 56', 'chronic', 10.0, 25, true],
  ['Plaster Strips', 'Adhesive bandage', 'Assorted sizes', 'Box of 40', 'first-aid', 3.5, 0, false],
  ['Digital Thermometer', 'Thermometer', 'Under-arm / oral', '1 unit', 'devices', 11.0, 6, false],
];

const PHARMACIES = [
  {
    name: 'DEMO · Allen Avenue Pharmacy',
    address: { line1: '12 Allen Avenue', line2: 'Ikeja, Lagos' },
    coordinates: [3.3515, 6.6011],
    deliveryRadiusKm: 8,
    deliveryFeeCents: 300,
    priceFactor: 1,
    owner: true,
  },
  {
    name: 'DEMO · Ikeja GRA Chemist',
    address: { line1: '5 Isaac John Street', line2: 'Ikeja GRA, Lagos' },
    coordinates: [3.353, 6.579],
    deliveryRadiusKm: 10,
    deliveryFeeCents: 0,
    priceFactor: 1.1,
  },
  {
    name: "DEMO · ADJ's Clinic Pharmacy",
    address: { line1: '30 Opebi Road', line2: 'Ikeja, Lagos' },
    coordinates: [3.364, 6.5935],
    deliveryRadiusKm: 15,
    deliveryFeeCents: 500,
    priceFactor: 0.95,
    operatedByClinic: true,
  },
];

async function add(db) {
  if (await db.collection('pharmacies').countDocuments({ demo: true })) {
    console.log('Demo pharmacies already exist. Run "remove" first to start over.');
    return;
  }
  const now = new Date();
  let password;
  for (const [i, p] of PHARMACIES.entries()) {
    const { insertedId } = await db.collection('pharmacies').insertOne({
      name: p.name,
      licenseNumber: `DEMO-PCN-${1000 + i}`,
      email: `demo.pharmacy${i + 1}@adjscodes.test`,
      phone: '0800 000 0000',
      address: p.address,
      location: { type: 'Point', coordinates: p.coordinates },
      deliveryRadiusKm: p.deliveryRadiusKm,
      deliveryFeeCents: p.deliveryFeeCents,
      status: 'approved',
      operatedByClinic: !!p.operatedByClinic,
      demo: true,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    // each pharmacy carries most of the catalogue, at slightly different prices
    const items = CATALOGUE.filter((_, n) => (n + i) % 5 !== 0).map(([name, genericName, strength, packSize, category, price, stock, rx]) => ({
      pharmacyId: insertedId,
      name,
      genericName,
      strength,
      packSize,
      category,
      priceCents: Math.round(price * p.priceFactor * 100),
      stock: Math.max(0, stock - i * 3),
      requiresPrescription: rx,
      listed: true,
      createdAt: now,
      updatedAt: now,
    }));
    await db.collection('products').insertMany(items);
    console.log(`+ ${p.name} (${items.length} products)`);

    if (p.owner) {
      password = crypto.randomBytes(6).toString('base64url');
      await db.collection('pharmacystaffs').insertOne({
        pharmacyId: insertedId,
        name: 'Demo Owner',
        email: DEMO_OWNER_EMAIL,
        password: await bcrypt.hash(password, await bcrypt.genSalt(10)),
        role: 'owner',
        pharmacistLicense: 'DEMO-RPH-1',
        active: true,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  console.log(`\nPharmacy portal login (admin panel → Pharmacy tab): ${DEMO_OWNER_EMAIL} / ${password}`);
  console.log('Patients only see these if their email is in SHOP_DEMO_USERS.');
}

async function remove(db) {
  const ids = (await db.collection('pharmacies').find({ demo: true }).project({ _id: 1 }).toArray()).map((p) => p._id);
  if (!ids.length) return console.log('No demo pharmacies.');
  const r = await Promise.all([
    db.collection('products').deleteMany({ pharmacyId: { $in: ids } }),
    db.collection('pharmacystaffs').deleteMany({ pharmacyId: { $in: ids } }),
    db.collection('shoporders').deleteMany({ pharmacyId: { $in: ids } }),
    db.collection('pharmacypayouts').deleteMany({ pharmacyId: { $in: ids } }),
  ]);
  await db.collection('pharmacies').deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${ids.length} demo pharmacies, ${r[0].deletedCount} products, ${r[1].deletedCount} logins, ${r[2].deletedCount} orders, ${r[3].deletedCount} withdrawals.`);
}

(async () => {
  const action = process.argv[2];
  if (!['add', 'remove'].includes(action)) {
    console.log('Usage: node scripts/demo-shop.js add|remove');
    process.exit(1);
  }
  await mongoose.connect(`${process.env.MONGODB_URI}/prescripto`);
  try {
    await (action === 'add' ? add : remove)(mongoose.connection.db);
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
