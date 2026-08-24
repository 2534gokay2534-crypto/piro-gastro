/**
 * Kategori adlarını, sırasını ve ikonlarını ONAYLI PROTOTİPTEKİ hâline eşitler.
 * catalog.js'teki adlar biraz farklıydı (örn. "Kyla & frys"); onaylı tasarımda
 * "Kyla" yazıyor ve sıra Pizzautrustning ile başlıyor. Kaynak: prototip.
 *
 *   node scripts/sync-categories.mjs
 */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL tanımlı değil (.env)");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Onaylı tasarımdaki görüntülenme sırası
const ANA = [
  ["pizza", "pizza", "Pizzautrustning", "Pizza Equipment", "Pizza Ekipmanları",
    "Stenugnar, bandugnar, degutrustning", "Deck ovens, conveyors, dough lines", "Taş fırın, bantlı fırın, hamur hattı"],
  ["refrigeration", "snow", "Kyla", "Refrigeration", "Soğutma",
    "Kylskåp, frysar, blastchillers", "Cabinets, freezers, blast chillers", "Buzdolabı, dondurucu, şoklama"],
  ["preparation", "knife", "Förberedelse", "Preparation", "Hazırlık",
    "Skärmaskiner, blandare, kvarnar", "Slicers, mixers, mincers", "Dilimleme, mikser, kıyma makinesi"],
  ["cooking", "flame", "Tillagning", "Cooking", "Pişirme",
    "Spisar, kombiugnar, fritöser", "Ranges, combi ovens, fryers", "Ocak, kombi fırın, fritöz"],
  ["bakery", "bread", "Bageri", "Bakery", "Pastane",
    "Ugnar, jässkåp, degutrustning", "Ovens, provers, dough equipment", "Fırın, mayalandırma, hamur ekipmanı"],
  ["dishwashing", "drop", "Diskning", "Dishwashing", "Bulaşık",
    "Huvdisk, glasdisk, grovdisk", "Hood, glass and utensil washers", "Giyotin, bardak, tencere yıkama"],
  ["ventilation", "wind", "Ventilation", "Ventilation", "Havalandırma",
    "Kåpor, filter, frånluftsfläktar", "Hoods, filters, extraction fans", "Davlumbaz, filtre, aspiratör"],
  ["coffee", "cup", "Kaffe", "Coffee", "Kahve",
    "Espressomaskiner, kvarnar, brygg", "Espresso machines, grinders, brewers", "Espresso makinesi, değirmen, filtre kahve"],
  ["spare-parts", "wrench", "Reservdelar", "Spare Parts", "Yedek Parça",
    "Original reservdelar och tillbehör", "Original spare parts and accessories", "Orijinal yedek parça ve aksesuar"],
  ["ovens", "box", "Ugnar", "Ovens", "Fırınlar",
    "Kombiugnar och konvektionsugnar", "Combi and convection ovens", "Kombi ve konveksiyon fırınlar"],
  ["grills", "flame", "Grillar", "Grills", "Izgaralar",
    "Lavastens-, kontakt- och stekbordsgrillar", "Lava stone, contact grills and griddles", "Lavataş, kontakt ve pleyt ızgaralar"],
  ["dough", "bread", "Deg & mjöl", "Dough & Flour", "Hamur ve Un",
    "Degblandare och degutrullare", "Dough mixers and rollers", "Hamur yoğurma ve hamur açma makineleri"],
  ["meat", "knife", "Köttbearbetning", "Meat Processing", "Et İşleme",
    "Köttkvarnar, bensågar och korvmaskiner", "Mincers, bone saws and sausage machines", "Kıyma makineleri, kemik testereleri"],
  ["furniture", "layers", "Rostfria möbler", "Stainless Steel Furniture", "Paslanmaz Mobilya",
    "Arbetsbänkar, skåp, hyllor och underreden", "Worktables, cabinets, shelves and stands", "Çalışma tezgâhları, dolaplar, raflar ve alt üniteler"],
  ["warming", "flame", "Varmhållning", "Holding & Warming", "Sıcak Tutma",
    "Värmeskåp, bain-marie och övervärmare", "Heating cabinets, bain-marie, warmers", "Isıtma dolapları, benmariler ve üst ısıtıcılar"],
  ["tableware", "grid", "Dukat bord", "Tableware", "Tabak ve Çatal",
    "Porslin, bestick och servering", "Porcelain, cutlery and serving", "Porselen, çatal-bıçak ve servis"],
  ["textile", "tag", "Textilier", "Textiles", "Tekstil",
    "Arbetskläder, förkläden och dukar", "Workwear, aprons and linen", "İş kıyafetleri, önlükler ve masa örtüleri"],
  ["utensils", "wrench", "Köksredskap", "Kitchen Utensils", "Mutfak Gereçleri",
    "GN-kantiner, knivar, vagnar", "GN containers, knives, trolleys", "GN küvetler, bıçaklar, arabalar"],
  ["seating", "grid", "Bord & stolar", "Chairs & Tables", "Masa ve Sandalye",
    "Restaurangmöbler för gästutrymmen", "Restaurant furniture for guest areas", "Misafir alanı mobilyaları"],
];

// Alt kategoriler: id, ana, sv, en, tr
const ALT = [
  ["cooking-fryers", "Fritöser", "Fryers", "Fritözler"],
  ["refrigeration-display-counters", "Displaydiskar", "Display counters", "Teşhir reyonları"],
  ["refrigeration-refrigerators", "Kylskåp", "Refrigerators", "Buzdolapları"],
  ["refrigeration-freezers", "Frysar", "Freezers", "Dondurucular"],
  ["refrigeration-refrigerated-counters", "Kylda bänkar", "Refrigerated counters", "Soğutmalı tezgâhlar"],
  ["grills-grills", "Grillar", "Grills", "Izgaralar"],
  ["cooking-ranges-hobs", "Spisar & hällar", "Ranges & hobs", "Ocaklar ve setüstü"],
  ["furniture-worktables", "Arbetsbänkar", "Worktables", "Çalışma tezgâhları"],
  ["ovens-ovens-stands", "Ugnar & underreden", "Ovens & stands", "Fırınlar ve altlıklar"],
  ["cooking-boiling-pasta", "Kokkärl", "Boiling & pasta", "Pişirme kazanları"],
  ["furniture-neutral-units", "Neutrala enheter", "Neutral units", "Nötr üniteler"],
  ["warming-bain-marie", "Bain-marie", "Bain-marie", "Benmariler"],
  ["warming-chips-scuttles", "Pommesvärmare", "Chips scuttles", "Patates ısıtıcıları"],
  ["pizza-pizza-counters", "Pizzabänkar", "Pizza counters", "Pizza tezgâhları"],
  ["dough-dough-mixers", "Degblandare", "Dough mixers", "Hamur yoğurma makineleri"],
  ["ventilation-extraction-hoods", "Kåpor", "Extraction hoods", "Davlumbazlar"],
  ["dishwashing-sinks-hand-wash", "Diskbänkar", "Sinks & hand wash", "Evyeler ve el yıkama"],
  ["grills-griddles", "Stekbord", "Griddles", "Pleyt ızgaralar"],
  ["furniture-drawer-cabinets", "Lådskåp", "Drawer cabinets", "Çekmeceli dolaplar"],
  ["furniture-shelf-units", "Hyllsystem", "Shelf units", "Raf üniteleri"],
  ["ventilation-filters-purification", "Filter & luftrening", "Filters & purification", "Filtre ve hava arıtma"],
  ["furniture-wall-cabinets", "Väggskåp", "Wall cabinets", "Duvar dolapları"],
  ["spare-parts-gas-valves", "Gasventiler", "Gas valves", "Gaz vanaları"],
  ["furniture-work-cabinets", "Arbetsskåp", "Work cabinets", "Çalışma dolapları"],
  ["utensils-waste-bins", "Avfallskärl", "Waste bins", "Çöp üniteleri"],
  ["dishwashing-dishwasher-bases", "Diskunderreden", "Dishwasher bases", "Bulaşık altlıkları"],
  ["warming-heating-cabinets", "Värmeskåp", "Heating cabinets", "Isıtma dolapları"],
  ["furniture-wall-shelves", "Vägghyllor", "Wall shelves", "Duvar rafları"],
  ["furniture-overshelves", "Överhyllor", "Overshelves", "Üst raflar"],
  ["utensils-chopping-blocks", "Skärblock", "Chopping blocks", "Kesme blokları"],
  ["ventilation-fans-controllers", "Fläktar & styrning", "Fans & controllers", "Fanlar ve kontrol"],
  ["ventilation-airboxes", "Luftboxar", "Airboxes", "Hava kutuları"],
  ["utensils-accessories", "Tillbehör", "Accessories", "Aksesuarlar"],
];

async function main() {
  let n = 0;
  for (let i = 0; i < ANA.length; i++) {
    const [id, icon, sv, en, tr, dsv, den, dtr] = ANA[i];
    const v = await prisma.category.updateMany({
      where: { id },
      data: {
        icon, sort: i,
        nameSv: sv, nameEn: en, nameTr: tr,
        descSv: dsv, descEn: den, descTr: dtr,
      },
    });
    n += v.count;
  }
  for (let i = 0; i < ALT.length; i++) {
    const [id, sv, en, tr] = ALT[i];
    const v = await prisma.category.updateMany({
      where: { id },
      data: { sort: i, nameSv: sv, nameEn: en, nameTr: tr },
    });
    n += v.count;
  }
  console.log("Güncellenen kategori:", n);

  const ana = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sort: "asc" },
    select: { nameSv: true },
  });
  console.log("Sıra:", ana.map((c) => c.nameSv).join(" · "));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
