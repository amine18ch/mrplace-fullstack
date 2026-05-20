const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where:{slug:'electronics'}, update:{}, create:{name:'Électronique',slug:'electronics',icon:'📱'} }),
    prisma.category.upsert({ where:{slug:'fashion'}, update:{}, create:{name:'Mode',slug:'fashion',icon:'👕'} }),
    prisma.category.upsert({ where:{slug:'home'}, update:{}, create:{name:'Maison & Cuisine',slug:'home',icon:'🛋️'} }),
    prisma.category.upsert({ where:{slug:'beauty'}, update:{}, create:{name:'Beauté',slug:'beauty',icon:'💄'} }),
    prisma.category.upsert({ where:{slug:'sports'}, update:{}, create:{name:'Sports',slug:'sports',icon:'⚽'} }),
    prisma.category.upsert({ where:{slug:'toys'}, update:{}, create:{name:'Jouets & Bébé',slug:'toys',icon:'🧸'} }),
    prisma.category.upsert({ where:{slug:'grocery'}, update:{}, create:{name:'Épicerie',slug:'grocery',icon:'🛒'} }),
    prisma.category.upsert({ where:{slug:'auto'}, update:{}, create:{name:'Auto',slug:'auto',icon:'🚗'} }),
  ]);
  const catMap = Object.fromEntries(categories.map(c=>[c.slug,c.id]));
  console.log('✅ Categories created');

  // Sellers
  const sellers = await Promise.all([
    prisma.seller.upsert({ where:{slug:'techhub'}, update:{}, create:{name:'TechHub Store',slug:'techhub',logo:'💻',color:'#2563EB',rating:4.8,reviewsCount:12450,verified:true,badge:'Top Seller',location:'Tunis, Tunisie',joinedYear:2018,productsCount:1240,responseTime:'sous 1 heure'} }),
    prisma.seller.upsert({ where:{slug:'fashion-empire'}, update:{}, create:{name:'Fashion Empire',slug:'fashion-empire',logo:'👗',color:'#3B82F6',rating:4.7,reviewsCount:8932,verified:true,badge:'Premium',location:'Sfax, Tunisie',joinedYear:2019,productsCount:980,responseTime:'sous 2 heures'} }),
    prisma.seller.upsert({ where:{slug:'maison-essentiels'}, update:{}, create:{name:'Maison Essentiels',slug:'maison-essentiels',logo:'🏠',color:'#1E3A8A',rating:4.6,reviewsCount:6712,verified:true,badge:'Top Seller',location:'Sousse, Tunisie',joinedYear:2020,productsCount:540,responseTime:'sous 3 heures'} }),
    prisma.seller.upsert({ where:{slug:'beauty-paradise'}, update:{}, create:{name:'Beauty Paradise',slug:'beauty-paradise',logo:'💄',color:'#60A5FA',rating:4.9,reviewsCount:15320,verified:true,badge:'Premium',location:'Tunis, Tunisie',joinedYear:2017,productsCount:720,responseTime:'sous 1 heure'} }),
    prisma.seller.upsert({ where:{slug:'sports-arena'}, update:{}, create:{name:'Sports Arena',slug:'sports-arena',logo:'⚽',color:'#2563EB',rating:4.5,reviewsCount:4321,verified:true,badge:'Top Seller',location:'Nabeul, Tunisie',joinedYear:2021,productsCount:430,responseTime:'sous 4 heures'} }),
    prisma.seller.upsert({ where:{slug:'monde-enfants'}, update:{}, create:{name:'Monde Enfants',slug:'monde-enfants',logo:'🧸',color:'#3B82F6',rating:4.7,reviewsCount:3870,verified:true,badge:'Premium',location:'Bizerte, Tunisie',joinedYear:2020,productsCount:310,responseTime:'sous 2 heures'} }),
    prisma.seller.upsert({ where:{slug:'gourmet-marche'}, update:{}, create:{name:'Gourmet Marché',slug:'gourmet-marche',logo:'🛒',color:'#1E3A8A',rating:4.4,reviewsCount:2190,verified:true,badge:'Nouveau',location:'Ariana, Tunisie',joinedYear:2023,productsCount:180,responseTime:'sous 5 heures'} }),
    prisma.seller.upsert({ where:{slug:'auto-pro'}, update:{}, create:{name:'Auto Pro',slug:'auto-pro',logo:'🚗',color:'#0A1F44',rating:4.6,reviewsCount:5430,verified:true,badge:'Top Seller',location:'Ben Arous, Tunisie',joinedYear:2019,productsCount:620,responseTime:'sous 3 heures'} }),
  ]);
  const selMap = Object.fromEntries(sellers.map(s=>[s.slug,s.id]));
  console.log('✅ Sellers created');

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@mrplace.tn' },
    update: {},
    create: { name:'Administrateur', email:'admin@mrplace.tn', password: await bcrypt.hash('Admin@2024!',10), role:'ADMIN' }
  });

  // Products
  const products = [
    { title:'iPhone 15 Pro Max 256Go Titanium', brand:'Apple', sellerSlug:'techhub', catSlug:'electronics', sub:'Téléphones', price:4699, orig:5199, img:'📱', desc:"L'iPhone le plus puissant jamais conçu, avec design titane et puce A17 Pro.", spec:{Écran:'6.7" Super Retina XDR',Puce:'A17 Pro',Caméra:'48MP Triple',Batterie:'4441 mAh'}, variants:{couleurs:['Naturel','Bleu','Blanc','Noir'],stockage:['256Go','512Go','1To']}, tags:['bestseller'] },
    { title:'Samsung Galaxy S24 Ultra 512Go', brand:'Samsung', sellerSlug:'techhub', catSlug:'electronics', sub:'Téléphones', price:4299, orig:4999, img:'📱', desc:"Flagship IA avec stylet S Pen intégré et caméra 200MP.", spec:{Écran:'6.8" Dynamic AMOLED',Puce:'Snapdragon 8 Gen 3',Caméra:'200MP Quad',Batterie:'5000 mAh'}, variants:{couleurs:['Titane Noir','Titane Gris','Titane Violet'],stockage:['256Go','512Go','1To']}, tags:['trending'] },
    { title:'Google Pixel 8 Pro 256Go', brand:'Google', sellerSlug:'techhub', catSlug:'electronics', sub:'Téléphones', price:3299, orig:3699, img:'📱', desc:"Photographie IA de pointe avec Magic Editor.", spec:{Écran:'6.7" LTPO OLED',Puce:'Google Tensor G3',Caméra:'50MP Triple',Batterie:'5050 mAh'}, variants:{couleurs:['Obsidian','Porcelain'],stockage:['128Go','256Go','512Go']}, tags:['new'] },
    { title:'OnePlus 12 5G Flagship', brand:'OnePlus', sellerSlug:'techhub', catSlug:'electronics', sub:'Téléphones', price:2899, orig:3499, img:'📱', desc:"Charge rapide avec caméra Hasselblad.", spec:{Écran:'6.82" LTPO AMOLED',Puce:'Snapdragon 8 Gen 3',Caméra:'50MP Triple',Batterie:'5400 mAh'}, variants:{couleurs:['Noir','Vert'],stockage:['256Go','512Go']}, tags:['trending'] },
    { title:'MacBook Pro 16" M3 Max 1To', brand:'Apple', sellerSlug:'techhub', catSlug:'electronics', sub:'Ordinateurs', price:11999, orig:12999, img:'💻', desc:"Performance révolutionnaire pour les pros.", spec:{Écran:'16.2" Liquid Retina XDR',Puce:'M3 Max',RAM:'36Go',Stockage:'1To SSD'}, variants:{couleurs:['Noir Sidéral','Argent'],stockage:['512Go','1To','2To']}, tags:['bestseller'] },
    { title:'Dell XPS 15 OLED 9530', brand:'Dell', sellerSlug:'techhub', catSlug:'electronics', sub:'Ordinateurs', price:7499, orig:8299, img:'💻', desc:"Écran OLED époustouflant avec Intel Core i9.", spec:{Écran:'15.6" 3.5K OLED',Puce:'Intel i9-13900H',RAM:'32Go',Stockage:'1To SSD'}, variants:{couleurs:['Argent Platine'],stockage:['512Go','1To']}, tags:['new'] },
    { title:'ASUS ROG Zephyrus G14 Gaming', brand:'Asus', sellerSlug:'techhub', catSlug:'electronics', sub:'Ordinateurs', price:6299, orig:6999, img:'💻', desc:"PC gaming ultra-portable avec RTX 4070.", spec:{Écran:'14" QHD 165Hz',Puce:'AMD Ryzen 9',GPU:'RTX 4070',RAM:'16Go'}, variants:{couleurs:['Gris Eclipse','Blanc Moonlight']}, tags:['trending'] },
    { title:'Samsung 65" Neo QLED 8K', brand:'Samsung', sellerSlug:'techhub', catSlug:'electronics', sub:'TV', price:8999, orig:11999, img:'📺', desc:"Brillance Mini-LED avec upscaling IA 8K.", spec:{Taille:'65"',Résolution:'8K',HDR:'Quantum HDR',Refresh:'120Hz'}, variants:{couleurs:['Noir']}, tags:['bestseller'] },
    { title:'LG OLED C3 55" Smart TV', brand:'LG', sellerSlug:'techhub', catSlug:'electronics', sub:'TV', price:4299, orig:5499, img:'📺', desc:"Pixels auto-éclairants pour un noir parfait.", spec:{Taille:'55"',Résolution:'4K',HDR:'Dolby Vision',Refresh:'120Hz'}, variants:{couleurs:['Argent Titane']}, tags:['new'] },
    { title:'Sony WH-1000XM5 Casque', brand:'Sony', sellerSlug:'techhub', catSlug:'electronics', sub:'Audio', price:1399, orig:1699, img:'🎧', desc:"Réduction de bruit leader sur le marché.", spec:{Type:'Supra-auriculaire',Batterie:'30h',ANC:'Oui',Bluetooth:'5.2'}, variants:{couleurs:['Noir','Argent','Bleu Nuit']}, tags:['bestseller'] },
    { title:'Bose QuietComfort Ultra Earbuds', brand:'Bose', sellerSlug:'techhub', catSlug:'electronics', sub:'Audio', price:1199, orig:1399, img:'🎧', desc:"Audio immersif avec ANC de classe mondiale.", spec:{Type:'Intra-auriculaire',Batterie:'6h+24h',ANC:'Oui',IP:'IPX4'}, variants:{couleurs:['Noir','Blanc Fumé']}, tags:['trending'] },
    { title:'Apple Watch Series 9 GPS 45mm', brand:'Apple', sellerSlug:'techhub', catSlug:'electronics', sub:'Montres', price:1899, orig:2099, img:'⌚', desc:"Plus intelligente, plus lumineuse, plus puissante.", spec:{Écran:'Always-On Retina',Puce:'S9 SiP',Batterie:'18h',Eau:'50m'}, variants:{couleurs:['Minuit','Lumière Stellaire','Rose']}, tags:['bestseller'] },
    { title:'Nike Air Max 270 React', brand:'Nike', sellerSlug:'fashion-empire', catSlug:'fashion', sub:'Chaussures', price:599, orig:799, img:'👟', desc:"Confort iconique rencontrant le style audacieux.", spec:{Matière:'Mesh & Synthétique',Semelle:'Caoutchouc',Style:'Lifestyle'}, variants:{couleurs:['Noir','Blanc','Bleu','Rouge'],tailles:['38','39','40','41','42','43','44','45']}, tags:['bestseller'] },
    { title:'Adidas Ultraboost 22 Running', brand:'Adidas', sellerSlug:'fashion-empire', catSlug:'fashion', sub:'Chaussures', price:699, orig:899, img:'👟', desc:"Semelle Boost à retour d'énergie maximal.", spec:{Matière:'Primeknit+',Semelle:'Continental Rubber',Drop:'10mm'}, variants:{couleurs:['Noir Core','Blanc Cloud'],tailles:['38','39','40','41','42','43']}, tags:['trending'] },
    { title:'Chemise slim fit coton Zara', brand:'Zara', sellerSlug:'fashion-empire', catSlug:'fashion', sub:'Homme', price:149, orig:199, img:'👔', desc:"Chemise en coton pour une élégance quotidienne.", spec:{Matière:'100% Coton',Coupe:'Slim',Entretien:'Machine 30°'}, variants:{couleurs:['Blanc','Bleu','Noir','Marine'],tailles:['XS','S','M','L','XL','XXL']}, tags:['new'] },
    { title:'Blazer laine premium H&M', brand:'H&M', sellerSlug:'fashion-empire', catSlug:'fashion', sub:'Homme', price:399, orig:599, img:'🧥', desc:"Blazer taillé en mélange de laine.", spec:{Matière:'Mélange laine',Coupe:'Regular',Doublure:'Polyester'}, variants:{couleurs:['Marine','Anthracite','Noir'],tailles:['XS','S','M','L','XL']}, tags:['new'] },
    { title:'Jean 501 Original Levi\'s', brand:'Levi\'s', sellerSlug:'fashion-empire', catSlug:'fashion', sub:'Homme', price:299, orig:399, img:'👖', desc:"Le jean original depuis 1873.", spec:{Matière:'100% Coton',Coupe:'Droite',Taille:'Milieu'}, variants:{couleurs:['Bleu Foncé','Bleu Clair','Noir'],tailles:['XS','S','M','L','XL']}, tags:['bestseller'] },
    { title:'Sac Gucci GG Marmont Mini', brand:'Gucci', sellerSlug:'fashion-empire', catSlug:'fashion', sub:'Sacs', price:5999, orig:6999, img:'👜', desc:"Cuir matelassé iconique avec quincaillerie GG.", spec:{Matière:'Cuir Matelassé',Fermeture:'Magnétique',Origine:'Italie'}, variants:{couleurs:['Noir','Beige','Rouge']}, tags:['limited'] },
    { title:'Dyson V15 Detect Aspirateur', brand:'Dyson', sellerSlug:'maison-essentiels', catSlug:'home', sub:'Électroménager', price:2799, orig:3199, img:'🧹', desc:"Révèle la poussière cachée avec la détection laser.", spec:{Type:'Sans fil',Batterie:'60min',Bac:'0.77L',Poids:'3.1kg'}, variants:{couleurs:['Jaune','Nickel']}, tags:['bestseller'] },
    { title:'Philips Air Fryer XXL 7.3L', brand:'Philips', sellerSlug:'maison-essentiels', catSlug:'home', sub:'Électroménager', price:1099, orig:1399, img:'🍳', desc:"Cuisson sans matières grasses par technologie Rapid Air.", spec:{Capacité:'7.3L',Puissance:'2225W',Température:'40-200°C',Fonction:'Smart Sensing'}, variants:{couleurs:['Noir','Argent']}, tags:['trending'] },
    { title:'IKEA MALM Commode 4 tiroirs', brand:'IKEA', sellerSlug:'maison-essentiels', catSlug:'home', sub:'Meubles', price:649, orig:799, img:'🗄️', desc:"Lignes épurées et design harmonieux.", spec:{Largeur:'80cm',Hauteur:'100cm',Matière:'Panneau de particules',Tiroirs:'4'}, variants:{couleurs:['Blanc','Brun-Noir','Placage Chêne']}, tags:['new'] },
    { title:'Le Creuset Cocotte Ronde 26cm', brand:'Le Creuset', sellerSlug:'maison-essentiels', catSlug:'home', sub:'Cuisine', price:1599, orig:1899, img:'🍲', desc:"Patrimoine en fonte émaillée de France.", spec:{Matière:'Fonte émaillée',Capacité:'5.3L',Diamètre:'26cm',Origine:'France'}, variants:{couleurs:['Cerise','Marseille','Caraïbes','Noir Mat']}, tags:['bestseller'] },
    { title:'Bosch Lave-vaisselle Série 8', brand:'Bosch', sellerSlug:'maison-essentiels', catSlug:'home', sub:'Électroménager', price:3499, orig:3999, img:'🧺', desc:"PerfectDry avec technologie Zeolith.", spec:{Capacité:'14 couverts',Bruit:'42dB',Énergie:'A',Programmes:'8'}, variants:{couleurs:['Inox']}, tags:['new'] },
    { title:'Crème de la Mer 60ml', brand:'La Mer', sellerSlug:'beauty-paradise', catSlug:'beauty', sub:'Soins', price:1899, orig:2099, img:'🧴', desc:"La légendaire crème hydratante.", spec:{Type:'Crème',Peau:'Tous types',Taille:'60ml',Bénéfices:'Hydratation profonde'}, variants:{volume:['30ml','60ml','100ml']}, tags:['bestseller'] },
    { title:'Chanel N°5 Eau de Parfum 100ml', brand:'Chanel', sellerSlug:'beauty-paradise', catSlug:'beauty', sub:'Parfum', price:899, orig:1099, img:'🌸', desc:"Le parfum le plus iconique au monde.", spec:{Type:'EDP',Famille:'Aldéhyde Floral',Notes:'Aldéhydes',Fond:'Santal'}, variants:{volume:['50ml','100ml','200ml']}, tags:['limited'] },
    { title:'MAC Ruby Woo Rouge à lèvres', brand:'MAC', sellerSlug:'beauty-paradise', catSlug:'beauty', sub:'Maquillage', price:329, orig:399, img:'💋', desc:"L'iconique rouge mat retro.", spec:{Fini:'Matte Retro',Poids:'3g',Type:'Bullet'}, variants:{couleurs:['Ruby Woo','Diva','Russian Red']}, tags:['bestseller'] },
    { title:'Dior Forever Foundation 30ml', brand:'Dior', sellerSlug:'beauty-paradise', catSlug:'beauty', sub:'Maquillage', price:419, orig:499, img:'💄', desc:"Fond de teint parfait 24h.", spec:{Fini:'Mat',SPF:'15',Poids:'30ml',Couvrance:'Totale'}, variants:{couleurs:['1N','2N','3N','4N','5N']}, tags:['new'] },
    { title:'L\'Oreal Revitalift Crème 50ml', brand:'L\'Oreal', sellerSlug:'beauty-paradise', catSlug:'beauty', sub:'Soins', price:99, orig:149, img:'🧴', desc:"Anti-âge avec Pro-Rétinol.", spec:{Type:'Crème',Peau:'Mature',Taille:'50ml',Bénéfices:'Anti-rides'}, variants:{volume:['50ml']}, tags:['trending'] },
    { title:'Nike Pro Tapis de Yoga 6mm', brand:'Nike', sellerSlug:'sports-arena', catSlug:'sports', sub:'Fitness', price:249, orig:329, img:'🧘', desc:"Adhérence et amorti premium.", spec:{Épaisseur:'6mm',Matière:'TPE',Longueur:'180cm',Largeur:'61cm'}, variants:{couleurs:['Noir','Marine','Rose','Gris']}, tags:['new'] },
    { title:'Adidas Predator Chaussures Football', brand:'Adidas', sellerSlug:'sports-arena', catSlug:'sports', sub:'Sports d\'équipe', price:799, orig:999, img:'⚽', desc:"Contrôlez le jeu avec les Predator.", spec:{Surface:'Terrain Ferme',Matière:'Synthétique',Fermeture:'Lacets',Tech:'Demonskin'}, variants:{couleurs:['Noir/Rouge','Blanc/Bleu'],tailles:['38','39','40','41','42','43','44']}, tags:['bestseller'] },
    { title:'Under Armour Haltères Project Rock', brand:'Under Armour', sellerSlug:'sports-arena', catSlug:'sports', sub:'Fitness', price:599, orig:799, img:'🏋️', desc:"Entraînez-vous avec des haltères réglables.", spec:{Matière:'Fonte','Revêtement':'Caoutchouc',Max:'20kg/unité',Grip:'Knurled'}, variants:{poids:['5kg','10kg','15kg','20kg']}, tags:['trending'] },
    { title:'LEGO Technic Lamborghini Sián', brand:'Lego', sellerSlug:'monde-enfants', catSlug:'toys', sub:'Jouets', price:1799, orig:2099, img:'🚗', desc:"Réplique authentique en 3696 pièces.", spec:{Pièces:'3696',Âge:'18+',Échelle:'1:8',Marque:'LEGO Technic'}, variants:{}, tags:['bestseller'] },
    { title:'Fisher Price Smart Stages Trotteur', brand:'Fisher Price', sellerSlug:'monde-enfants', catSlug:'toys', sub:'Jouets', price:199, orig:249, img:'🧸', desc:"Apprentissage de la marche avec 75+ chansons.", spec:{Âge:'6-36 mois',Chansons:'75+',Niveaux:'3',Piles:'4xAA'}, variants:{couleurs:['Rose','Bleu','Jaune']}, tags:['new'] },
    { title:'Chicco Bravo Poussette pliage rapide', brand:'Chicco', sellerSlug:'monde-enfants', catSlug:'toys', sub:'Poussettes', price:1299, orig:1499, img:'👶', desc:"Poussette à pliage rapide d'une main.", spec:{Poids:'10kg',Inclinaison:'Multi-position',Rangement:'Grand panier',Âge:'0-22kg'}, variants:{couleurs:['Noir','Gris','Marine']}, tags:['trending'] },
    { title:'Nestle Nido Lait en poudre 2.5kg', brand:'Nestle', sellerSlug:'gourmet-marche', catSlug:'grocery', sub:'Garde-manger', price:89, orig:109, img:'🥛', desc:"Lait entier en poudre de haute qualité.", spec:{Poids:'2.5kg',Type:'Lait entier',Origine:'Suisse'}, variants:{}, tags:['bestseller'] },
    { title:'Lipton Yellow Label Thé 100 sachets', brand:'Lipton', sellerSlug:'gourmet-marche', catSlug:'grocery', sub:'Boissons', price:29, orig:39, img:'🍵', desc:"Mélange de thé premium en sachets.", spec:{Sachets:'100',Poids:'200g',Origine:'Multiple'}, variants:{}, tags:['new'] },
    { title:'Café Lavazza Qualità Rossa 1kg', brand:'Lavazza', sellerSlug:'gourmet-marche', catSlug:'grocery', sub:'Boissons', price:85, orig:99, img:'☕', desc:"Mélange équilibré de café arabica et robusta.", spec:{Poids:'1kg',Type:'Mouture',Intensité:'5/10'}, variants:{}, tags:['bestseller'] },
    { title:'Essuie-glaces Bosch Aerotwin', brand:'Bosch', sellerSlug:'auto-pro', catSlug:'auto', sub:'Accessoires', price:159, orig:199, img:'🚙', desc:"Performance silencieuse et fluide.", spec:{Type:'Beam',Tech:'Aerotwin',Origine:'Allemagne'}, variants:{taille:['18"','20"','22"','24"','26"']}, tags:['new'] },
    { title:'Huile moteur Castrol GTX 4L', brand:'Castrol', sellerSlug:'auto-pro', catSlug:'auto', sub:'Entretien', price:129, orig:169, img:'🛢️', desc:"Protection moteur premium.", spec:{Grade:'5W-30',Volume:'4L',Type:'Synthétique'}, variants:{volume:['1L','4L']}, tags:['trending'] },
    { title:'Pneu Michelin Pilot Sport 4 225/45R17', brand:'Michelin', sellerSlug:'auto-pro', catSlug:'auto', sub:'Accessoires', price:599, orig:749, img:'🛞', desc:"Pneu haute performance ultra.", spec:{Taille:'225/45R17',Type:'Été',Charge:'94Y'}, variants:{}, tags:['bestseller'] },
    { title:'Dashcam Vantrue E1 Lite 4K', brand:'Vantrue', sellerSlug:'auto-pro', catSlug:'auto', sub:'Accessoires', price:499, orig:649, img:'📷', desc:"Caméra embarquée 4K ultra HD.", spec:{Résolution:'4K',Angle:'170°',Stockage:'Max 256Go',Nuit:'Oui'}, variants:{couleurs:['Noir']}, tags:['new'] },
  ];

  for (const p of products) {
    const discount = Math.round((1 - p.price/p.orig)*100);
    const stock = 10 + Math.floor(Math.random()*100);
    await prisma.product.create({
      data: {
        title: p.title,
        brand: p.brand,
        sellerId: selMap[p.sellerSlug],
        categoryId: catMap[p.catSlug],
        subcategory: p.sub,
        price: p.price,
        originalPrice: p.orig,
        discount,
        description: p.desc,
        specifications: JSON.stringify(p.spec),
        variants: JSON.stringify(p.variants || {}),
        images: JSON.stringify([p.img]),
        stock,
        lowStock: stock < 15,
        rating: parseFloat((4 + Math.random()).toFixed(1)),
        reviewsCount: 50 + Math.floor(Math.random()*5000),
        soldCount: 100 + Math.floor(Math.random()*10000),
        tags: JSON.stringify(p.tags),
        warranty: '1 an',
        returnPolicy: 'Retour 15 jours',
        expressDelivery: true,
        freeDelivery: p.price > 100,
      }
    });
  }
  console.log(`✅ ${products.length} products created`);

  // Promo codes
  for (const promo of [
    { code:'SAVE10', discount:0.10 },
    { code:'FIRST20', discount:0.20 },
    { code:'WELCOME15', discount:0.15 },
  ]) {
    await prisma.promoCode.upsert({ where:{code:promo.code}, update:{}, create:promo });
  }
  console.log('✅ Promo codes created');

  // Admin users
  await prisma.adminUser.upsert({
    where: { email: 'superadmin@mrplace.tn' },
    update: {},
    create: { name:'Super Admin', email:'superadmin@mrplace.tn', password: await bcrypt.hash('SuperAdmin@2024!', 10), role:'SUPER_ADMIN', permissions: JSON.stringify(['*']) }
  });
  await prisma.adminUser.upsert({
    where: { email: 'mod@mrplace.tn' },
    update: {},
    create: { name:'Modérateur', email:'mod@mrplace.tn', password: await bcrypt.hash('Admin@2024!', 10), role:'MODERATEUR', permissions: JSON.stringify(['products', 'vendors', 'orders']) }
  });
  await prisma.adminUser.upsert({
    where: { email: 'compta@mrplace.tn' },
    update: {},
    create: { name:'Comptable', email:'compta@mrplace.tn', password: await bcrypt.hash('Admin@2024!', 10), role:'COMPTABLE', permissions: JSON.stringify(['finance']) }
  });
  console.log('✅ Admin users created');

  // Platform settings
  for (const [key, value, group] of [
    ['platform_name', 'MARKET', 'GENERAL'],
    ['currency', 'TND', 'GENERAL'],
    ['vat_rate', '19', 'FINANCE'],
    ['commission_rate', '10', 'FINANCE'],
    ['timezone', 'Africa/Tunis', 'GENERAL'],
    ['contact_email', 'contact@mrplace.tn', 'GENERAL'],
  ]) {
    await prisma.platformSetting.upsert({ where: { key }, update: { value }, create: { key, value, group } });
  }
  console.log('✅ Platform settings created');

  // VendorApplication for each seller
  for (const seller of sellers) {
    await prisma.vendorApplication.upsert({
      where: { sellerId: seller.id },
      update: {},
      create: { sellerId: seller.id, status: 'APPROVED', reviewedAt: new Date() }
    });
  }
  console.log('✅ Vendor applications created');

  // Global commission
  const existingCommission = await prisma.commission.findFirst({ where: { type: 'GLOBAL' } });
  if (!existingCommission) {
    await prisma.commission.create({ data: { type: 'GLOBAL', rate: 0.10, isActive: true } });
  }
  console.log('✅ Commission created');

  // Demo banners
  await prisma.banner.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, title: 'Bienvenue sur MARKET', imageUrl: '🛍️', linkUrl: '/', position: 'HOME_HERO', isActive: true, sortOrder: 0 }
  }).catch(() => prisma.banner.create({ data: { title: 'Bienvenue sur MARKET', imageUrl: '🛍️', linkUrl: '/', position: 'HOME_HERO', isActive: true, sortOrder: 0 } }));
  await prisma.banner.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, title: 'Promotions de la saison', imageUrl: '🏷️', linkUrl: '/category/electronics', position: 'HOME_HERO', isActive: true, sortOrder: 1 }
  }).catch(() => prisma.banner.create({ data: { title: 'Promotions de la saison', imageUrl: '🏷️', linkUrl: '/category/electronics', position: 'HOME_HERO', isActive: true, sortOrder: 1 } }));
  console.log('✅ Banners created');

  console.log('🎉 Seed completed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
