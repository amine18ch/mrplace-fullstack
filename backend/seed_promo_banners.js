const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const existing = await p.banner.count({ where: { type: 'PROMO' } });
  if (existing > 0) { console.log('Promo banners already exist:', existing); return; }

  const promos = [
    { type:'PROMO', title:'Tech Premium', subtitle:'Apple, Samsung & plus', description:'Les meilleures marques tech', ctaText:'Voir maintenant', catSlug:'phones', bgFrom:'#0A1F44', bgTo:'#2563EB', emoji:'📱', sortOrder:0 },
    { type:'PROMO', title:'Semaine Mode', subtitle:'Nouvelles collections', description:'Tendances de la saison', ctaText:'Voir maintenant', catSlug:'fashion', bgFrom:'#2563EB', bgTo:'#60A5FA', emoji:'👗', sortOrder:1 },
    { type:'PROMO', title:'Relooking Maison', subtitle:"Jusqu'à -50%", description:'Mobilier & décoration', ctaText:'Voir maintenant', catSlug:'home', bgFrom:'#1E3A8A', bgTo:'#3B82F6', emoji:'🛋️', sortOrder:2 },
    { type:'PROMO', title:'Sélection Beauté', subtitle:'Marques de luxe', description:'Cosmétiques & parfums', ctaText:'Voir maintenant', catSlug:'beauty', bgFrom:'#9D174D', bgTo:'#EC4899', emoji:'💄', sortOrder:3 },
  ];

  for (const b of promos) await p.banner.create({ data: b });
  console.log('4 promo banners seeded');
}
main().finally(() => p.$disconnect());
