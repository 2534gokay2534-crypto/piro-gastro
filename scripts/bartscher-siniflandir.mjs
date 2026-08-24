/**
 * Bartscher XML kategori eşleme kuralları.
 *
 * Her kural: [kalıp, ana kategori, alt kategori]
 * Sıra ÖNEMLİ — en özgül kural en üstte. İlk eşleşen kazanır.
 *
 * Kaynak: XML'deki 525 farklı kategori yaprağı tek tek incelenerek yazıldı.
 */
export const KURALLAR = [
  // ---------- PIZZA (fırından önce: "pizza oven" pizzaya gitsin) ----------
  [/pizza\s*(oven|ugn)/i, "pizza", null],
  [/pizza\s*(counter|bänk)/i, "pizza", "pizza-pizza-counters"],
  [/pizza/i, "pizza", null],
  [/pasta\s*machine/i, "pizza", null],

  // ---------- EL BLENDERİ (kahve/bar kuralından ÖNCE) ----------
  // Bartscher bunları "bar ekipmanı" altında satıyor; bizde Hazırlık'a ait.
  [/stick mixer|hand blender|stavmixer|immersion blender|whisk|emulsifier/i, "preparation", null],

  // ---------- ÇORBA KAZANI (kahve kuralından ÖNCE) ----------
  // "Soup kettle" bir pişirme cihazı; aşağıdaki "kettle" kuralına düşmemeli.
  [/soup kettle|soup pot|party kettle|hotpot|chafing|boiling kettle|cooking kettle/i, "cooking", "cooking-boiling-pasta"],

  // ---------- KAHVE / BAR ----------
  [/fully automatic coffee|portafilter|coffee grinder|percolator|coffee machine|coffee station|coffee (pot|jug)/i, "coffee", null],
  [/milk refrigerator/i, "coffee", null],
  [/cleaning agents & descaler|cleaner & lime-scale/i, "coffee", null],
  [/samovar|kettle|hot water dispenser|tea station|mulled wine/i, "coffee", null],
  [/drinks dispenser|beverage dispenser|cereal dispenser|juice/i, "coffee", null],
  [/bar mixer|mixers? \/ blender|blender|cocktail/i, "coffee", null],
  [/slush machine|slushice|granita/i, "coffee", null],

  // ---------- SOĞUTMA ----------
  [/saladette|cooling top|refrigerated counter|circulating air cooling table|cold counter/i, "refrigeration", "refrigeration-refrigerated-counters"],
  [/refrigerated display|mini cooler|mini refrigerated|display cabinet.*(cool|refriger)|bottle cooler|wine (cooler|refrigerator)/i, "refrigeration", "refrigeration-display-counters"],
  [/deep freezer|freezer|frysbox|frysskåp/i, "refrigeration", "refrigeration-freezers"],
  [/refrigerator|fridge|kylskåp|glass-doored/i, "refrigeration", "refrigeration-refrigerators"],
  [/ice cube maker|ice maker|ice crusher|ice cream maker|ice production|blast chill|shock freez/i, "refrigeration", null],
  [/buffet trolley,? cold/i, "refrigeration", null],

  // ---------- BULAŞIK ----------
  [/dishwasher basket|rinsing basket|dishwasher rack/i, "dishwashing", null],
  [/dishwasher|warewash|glasswash|cover machine|cutlery polisher|water conditioning/i, "dishwashing", null],
  [/sink|wash basin|drainage table|drainer/i, "dishwashing", "dishwashing-sinks-hand-wash"],
  [/dishwasher base|underbuilt/i, "dishwashing", "dishwashing-dishwasher-bases"],
  [/cover hood/i, "dishwashing", null],
  [/detergent|rinse aid|descal|cleaning agent/i, "dishwashing", null],

  // ---------- HAVALANDIRMA ----------
  [/exhaust hood|extractor hood|extraction hood|cooker hood|ventilation hood|kåpa/i, "ventilation", "ventilation-extraction-hoods"],
  [/grease filter|air (purif|filter)|luftren/i, "ventilation", "ventilation-filters-purification"],
  [/particle filter|oil filter|frying fat filter|deep-fat frying oil filter/i, "ventilation", "ventilation-filters-purification"],
  [/ventilator|controller.*fan/i, "ventilation", "ventilation-fans-controllers"],
  [/air ?box/i, "ventilation", "ventilation-airboxes"],
  [/flue|fireplace|chimney|backsplash|splash back/i, "ventilation", null],

  // ---------- IZGARA ----------
  [/griddle plate|griddle|stekbord|grillplatta/i, "grills", "grills-griddles"],
  [/contact grill|lava (rock|stone) grill|chicken grill|table-top grill|charcoal grill|gyros|kebab|salamander/i, "grills", "grills-grills"],
  [/round bar grid|bar grid|fish grid/i, "grills", "grills-grills"],
  [/grill/i, "grills", "grills-grills"],

  // ---------- FIRIN ----------
  [/combi steamer|combi-steamer|high-speed oven|convection oven|deck oven|bake off/i, "ovens", "ovens-ovens-stands"],
  [/microwave/i, "ovens", null],
  [/oven|ugn/i, "ovens", "ovens-ovens-stands"],

  // ---------- PİŞİRME ----------
  [/deep fat fry|fritös|fryer|pastries deep fat/i, "cooking", "cooking-fryers"],
  [/pasta cooker|boiling kettle|cooking kettle|soup kettle|rice cooker|egg boiler/i, "cooking", "cooking-boiling-pasta"],
  [/induction (cooker|hob|range|wok)|gas (cooker|range|hob)|electric (cooker|range|hob)|ceramic (range|hob)|countertop electric hob|ranges?|cooking station|snackpoint/i, "cooking", "cooking-ranges-hobs"],
  [/stock-pot stove|wok (unit|appliance)|wok/i, "cooking", "cooking-ranges-hobs"],
  [/tilting frying pan|multi pan|paella|crêpe|crepe|waffle|hot-?dog|sausage warmer|toaster|rostmaskin/i, "cooking", null],
  [/steam cooker|steamer|sous-?vide|slow cooker|induction/i, "cooking", null],
  [/popcorn|candy floss|cotton candy|nacho|sugar cone|donut/i, "cooking", null],
  [/dehydrat|torkskåp/i, "cooking", null],

  // ---------- HAMUR VE UN ----------
  [/dough kneading|dough mixer|degblandare|spiral mixer|planetary mixer|kitchen machine|kitchenaid/i, "dough", "dough-dough-mixers"],
  [/dough (roller|sheeter|divider)|flour/i, "dough", null],

  // ---------- PASTANE ----------
  [/baking tray|bakeware|proofing|prover|jässkåp|patisserie|cake|konditori/i, "bakery", null],

  // ---------- ET İŞLEME ----------
  [/meat grinder|mincer|bone saw|sausage filler|meat (slicer|tenderiser|tenderizer)|köttkvarn/i, "meat", null],

  // ---------- HAZIRLIK ----------
  [/vegetable cutter|slicer|vacuum packaging|vacuum (bag|film)|vakuum/i, "preparation", null],
  [/stick mixer|hand blender|stavmixer|food processor|cutter|peeler|potato/i, "preparation", null],
  [/kitchen scale|thermometer|termometer/i, "preparation", null],
  [/salad spinner|salladsslunga/i, "preparation", null],
  [/perforated disk|cutting disk|grinder plate/i, "preparation", null],

  // ---------- SICAK TUTMA ----------
  [/bain-?marie|water bath|vattenbad/i, "warming", "warming-bain-marie"],
  [/chips scuttle|french fries warmer|warming devices for french/i, "warming", "warming-chips-scuttles"],
  [/heated cupboard|heating cabinet|warming cabinet|värmeskåp|plate warmer|cup warmer/i, "warming", "warming-heating-cabinets"],
  [/chafing dish|food warmer|hotpot|soup pot|hot (plate|display|counter|showcase)|warming plate|heat lamp|heated display|buffet trolle|keeping warm|varmhålln/i, "warming", null],
  [/buffet (display|showcase)|buffet equipment/i, "warming", null],

  // ---------- PASLANMAZ MOBİLYA ----------
  [/work ?table|arbetsbänk|drainage bench/i, "furniture", "furniture-worktables"],
  [/wall cabinet|wall cupboard|väggskåp/i, "furniture", "furniture-wall-cabinets"],
  [/wall shelf|wall shelves|vägghyll/i, "furniture", "furniture-wall-shelves"],
  [/top shelf|top shelves|overshelf|overshelves|attached shelf|överhyll/i, "furniture", "furniture-overshelves"],
  [/drawer/i, "furniture", "furniture-drawer-cabinets"],
  [/work cabinet|arbetsskåp/i, "furniture", "furniture-work-cabinets"],
  [/neutral unit|neutral element|work ?element/i, "furniture", "furniture-neutral-units"],
  [/shelf|shelves|shelving|hylla|hyllor/i, "furniture", "furniture-shelf-units"],
  [/cupboard|cabinet|skåp|stainless steel unit|understructure|base unit/i, "furniture", null],

  // ---------- MASA VE SANDALYE ----------
  [/chair|stool|bar table|dining table|patio heater|parasol|outdoor furniture/i, "seating", null],

  // ---------- TEKSTİL ----------
  // Dikkat: "paper towel dispenser" / "glove dispenser" tekstil DEĞİL,
  // hijyen donanımı — onlar aşağıda gereçlere gider.
  [/apron|clothing|workwear|uniform|jacket|förkläde|tablecloth|napkin|linen/i, "textile", null],
  [/(?<!paper )towel(?! dispenser)|(?<!glove )glove(?! dispenser)/i, "textile", null],

  // ---------- TABAK VE ÇATAL ----------
  [/cutlery|porcelain|plate|bowl|serving dish|tableware|glassware|tumbler|display tray/i, "tableware", null],

  // ---------- HİJYEN (otel donanımı) ----------
  [/hand dryer|shoe (polisher|cream)|soap dispenser|disinfect|hygiene|sanitary|toilet|ashtray|askkopp/i, "utensils", null],
  [/barrier (system|wall|tape)|queue|avspärrning/i, "utensils", null],

  // ---------- MODÜLER HAT PARÇALARI ----------
  // Bartscher'in 600/650/700/900 serisi hatlarına ait kapı, tıpa, bağlantı
  // çıtası, sıçrama koruması gibi parçalar — ürün değil, hat bileşeni.
  [/^door \d|door \d{3}|sealing plug|device linking|linking strip|splash guard|support ring|substitute (blade|filter)|blind cover|adapter frame/i, "spare-parts", null],
  [/guiding rail|kitchen rail|swivel castor|castor|intermediate bar|v-?grid|round grid|heating tube|protective cover|guide rail/i, "spare-parts", null],
  [/gas valve|gasventil/i, "spare-parts", "spare-parts-gas-valves"],
  [/spare part|component part|reservdel|replacement/i, "spare-parts", null],

  // ---------- MUTFAK GEREÇLERİ (genel torba, en sonda) ----------
  [/rubbish bin|waste bin|avfallskärl/i, "utensils", "utensils-waste-bins"],
  [/cutting board|chopping board|skärbräda/i, "utensils", "utensils-chopping-blocks"],
  [/combi-?scraper|scraper/i, "utensils", null],
  [/cooking paper|baking paper|greaseproof/i, "utensils", null],
  [/gn container|gastronorm|gn tray|storage container|transport container/i, "utensils", null],
  [/trolley|vagn|transport|clearing|serving trolley/i, "utensils", null],
  [/menu board|poster stand|chalkboard|sign holder/i, "utensils", null],
  [/cooking pot|frying pan|pan|lid|lids|cutlery holder|label holder|insect killer|dispenser|scale|knife|knives/i, "utensils", null],
  [/pasta basket|frying basket|fryer basket|chip basket|substitute basket|basket|food scoop|scoop/i, "utensils", "utensils-accessories"],
  [/accessor|tillbehör|supplementary/i, "utensils", "utensils-accessories"],
];

/**
 * İki aşamalı eşleme — sıra kritik:
 *   1) YAPRAK terimler + ürün adı  (en özgül sinyal)
 *   2) tam kategori yolları        (yalnızca 1. aşama boş dönerse)
 *
 * Neden: Bartscher'in kök adı "Cooking & Steaming & Grilling appliances".
 * Tüm yola bakılsaydı içindeki "Grilling" yüzünden 500+ fritöz/ocak/fırın
 * ızgaraya düşerdi. Yaprak ise gerçek ürün tipini verir ("Deep fat fryers").
 */
export function siniflandir({ yapraklar = [], yollar = [], ad = "" }) {
  const asama1 = [...yapraklar, ad].filter(Boolean).join(" | ");
  for (const [kalip, ana, alt] of KURALLAR) {
    if (kalip.test(asama1)) return { ana, alt, kaynak: "yaprak" };
  }
  const asama2 = yollar.filter(Boolean).join(" | ");
  for (const [kalip, ana, alt] of KURALLAR) {
    if (kalip.test(asama2)) return { ana, alt, kaynak: "yol" };
  }
  return null;
}
