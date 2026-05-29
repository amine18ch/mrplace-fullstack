const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const count = await p.banner.count();
  if (count > 0) { console.log('Banners already exist:', count); return; }
  const slides = [
    { title:'MEGA PROMO', subtitle:'Jusqu\'à -70%', description:'Électronique, Mode & Maison', ctaText:'Acheter maintenant', catSlug:'phones', bgFrom:'#1E3A8A', bgTo:'#2563EB', emoji:'🎉', sortOrder:0 },
    { title:'Nouveautés Tech', subtitle:'Derniers gadgets', description:'iPhone 15, Galaxy S24, MacBook M3', ctaText:'Découvrir', catSlug:'electronics', bgFrom:'#2563EB', bgTo:'#3B82F6', emoji:'📱', sortOrder:1 },
    { title:'Livraison Express', subtitle:'Demain avant 22h', description:'Sur toutes les commandes', ctaText:'Commander', catSlug:'', bgFrom:'#3B82F6', bgTo:'#60A5FA', emoji:'🚚', sortOrder:2 },
  ];
  for (const s of slides) await p.banner.create({ data: s });
  console.log('3 banners seeded');
}
main().finally(() => p.$disconnect());
