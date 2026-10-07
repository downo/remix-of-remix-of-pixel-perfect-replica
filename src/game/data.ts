import { TEKSTID, PARDI_JUTUD } from "./tekstid";
// Game content definitions. Add new items/enemies/regions/recipes here.

export type ItemType = "resource" | "food" | "drink" | "medicine" | "weapon" | "armor" | "tool" | "rare";
export interface Item {
  id: string; name: string; icon: string; type: ItemType; desc: string;
  food?: number; water?: number; heal?: number; rad?: number;
  dmg?: number; def?: number; gather?: number;
}

export const ITEMS: Record<string, Item> = {
  trap: { id: "trap", name: "Baasilõks", icon: "🪤", type: "rare", desc: "Ühekordne lõks. Kui mutandid öösel ründavad, nõrgendab see rünnakut (−8 jõudu)." },
  wood: { id: "wood", name: "Puit", icon: "🪵", type: "resource", desc: "Kuiv puit ehitamiseks ja lõkkeks." },
  stone: { id: "stone", name: "Kivi", icon: "🪨", type: "resource", desc: "Tavaline kivi." },
  scrap: { id: "scrap", name: "Vanametall", icon: "🔩", type: "resource", desc: "Roostes metallitükid." },
  cloth: { id: "cloth", name: "Riie", icon: "🧵", type: "resource", desc: "Rebenenud kangas." },
  herb: { id: "herb", name: "Ravimtaim", icon: "🌿", type: "resource", desc: "Muteerunud, kuid kasulik taim." },
  ore: { id: "ore", name: "Rauamaak", icon: "⛰️", type: "resource", desc: "Sulatatav maak." },
  wire: { id: "wire", name: "Juhe", icon: "🧶", type: "resource", desc: "Vana elektrijuhe." },
  hide: { id: "hide", name: "Nahk", icon: "🟫", type: "resource", desc: "Mutandi nahk." },
  crystal: { id: "crystal", name: "Kristall", icon: "💎", type: "rare", desc: "Kumab rohelist valgust. Sumiseb." },
  core: { id: "core", name: "Energiatuum", icon: "🔋", type: "rare", desc: "Vana tehnoloogia südamik." },
  rune: { id: "rune", name: "Ruunikild", icon: "🔮", type: "rare", desc: "Kild tundmatu kirjaga." },
  berries: { id: "berries", name: "Marjad", icon: "🫐", type: "food", desc: "Tõenäoliselt söödavad.", food: 12, rad: 2 },
  meat: { id: "meat", name: "Toores liha", icon: "🥩", type: "food", desc: "Parem oleks küpsetada.", food: 15, hp: 0, rad: 5 } as Item,
  cooked: { id: "cooked", name: "Küpsetatud liha", icon: "🍖", type: "food", desc: "Toitev ja ohutu.", food: 35 },
  can: { id: "can", name: "Konserv", icon: "🥫", type: "food", desc: "Vana maailma toit.", food: 30 },
  dirtywater: { id: "dirtywater", name: "Must vesi", icon: "🟤", type: "drink", desc: "Joo omal vastutusel.", water: 25, rad: 6 },
  water: { id: "water", name: "Puhas vesi", icon: "💧", type: "drink", desc: "Keedetud vesi.", water: 45 },
  bandage: { id: "bandage", name: "Side", icon: "🩹", type: "medicine", desc: "Taastab 25 HP.", heal: 25 },
  salve: { id: "salve", name: "Taimesalv", icon: "🧪", type: "medicine", desc: "Taastab 45 HP.", heal: 45 },
  antirad: { id: "antirad", name: "Kiirgusvastane", icon: "💊", type: "medicine", desc: "Vähendab kiirgust 40.", rad: -40 },
  knife: { id: "knife", name: "Roostes nuga", icon: "🔪", type: "weapon", desc: "Väga nõrk relv.", dmg: 4 },
  club: { id: "club", name: "Naeltega nui", icon: "🏏", type: "weapon", desc: "Lihtne, kuid valus.", dmg: 8 },
  spear: { id: "spear", name: "Metallots oda", icon: "🔱", type: "weapon", desc: "Hea ulatus.", dmg: 12 },
  machete: { id: "machete", name: "Sepistatud mačeete", icon: "🗡️", type: "weapon", desc: "Terav ja kiire.", dmg: 18 },
  crystalblade: { id: "crystalblade", name: "Kristallitera", icon: "⚔️", type: "weapon", desc: "Maagia ja teras.", dmg: 30 },
  rags: { id: "rags", name: "Kaltsud", icon: "👕", type: "armor", desc: "Peaaegu mitte midagi.", def: 1 },
  leather: { id: "leather", name: "Nahkrüü", icon: "🦺", type: "armor", desc: "Õmmeldud mutandinahast.", def: 4 },
  plate: { id: "plate", name: "Romuplaatrüü", icon: "🛡️", type: "armor", desc: "Raske, kuid kindel.", def: 8 },
  runearmor: { id: "runearmor", name: "Ruunirüü", icon: "🧥", type: "armor", desc: "Kumab pimedas.", def: 13 },
  stonetool: { id: "stonetool", name: "Kivikirves", icon: "🪓", type: "tool", desc: "Algeline tööriist.", gather: 1 },
  irontool: { id: "irontool", name: "Rauast kirka", icon: "⛏️", type: "tool", desc: "Kogub kiiremini ja rohkem.", gather: 2 },
  drill: { id: "drill", name: "Kristallpuur", icon: "🔧", type: "tool", desc: "Vana tehnoloogia + maagia.", gather: 3 },
  fish: { id: "fish", name: "Kalaporss", icon: "🐟", type: "food", desc: "Soomustatud kalade järeltulu. Süüa võib — arvatavasti.", food: 22, rad: 1 } as Item,
  roach: { id: "roach", name: "Prussakas", icon: "🪳", type: "food", desc: "Krõmpsuv ja kõhn. Parem röstida.", food: 5, rad: 3 },
  frog: { id: "frog", name: "Kolmesilmne konn", icon: "🐸", type: "food", desc: "Väike, aga lihav.", food: 9, rad: 2 },
  bigmeat: { id: "bigmeat", name: "Suurulukiliha", icon: "🍖", type: "food", desc: "Suure looma liha. Toores on raske seedida — küpseta!", food: 25, rad: 4 },
  roastroach: { id: "roastroach", name: "Röstitud putukad", icon: "🍢", type: "food", desc: "Vardas röstitud. Üllatavalt hea.", food: 16 },
  steak: { id: "steak", name: "Uluki praad", icon: "🥩", type: "food", desc: "Mahlane praad. Täidab kõhu ja annab jõudu.", food: 65, heal: 8 },
  stew: { id: "stew", name: "Jahimehe hautis", icon: "🍲", type: "food", desc: "Liha, ürdid ja vesi. Toidab ja kustutab janu.", food: 55, water: 20, heal: 5 },
  medkit: { id: "medkit", name: "Esmaabikomplekt", icon: "💼", type: "medicine", desc: "Haigla tasemel ravi. Taastab 80 HP ja vähendab kiirgust.", heal: 80, rad: -15 },
  voidshard: { id: "voidshard", name: "Lõhe kild", icon: "💠", type: "rare", desc: "Kild Lõhe südamikust. Sumiseb värvides, mida ei ole." },
  cash: { id: "cash", name: "Korgid", icon: "🪙", type: "rare", desc: "Pudelikorgid — tuhamaailma raha. Kasuta Varemete baaris «Roostes Kruus». Ei võta seljakotis ruumi." },
  sealer: { id: "sealer", name: "Lõhe Pitseerija", icon: "🌀", type: "rare", desc: "Seade, mis suleb Lõhe igaveseks. Võta kaasa Maagilisesse tsooni." },
};

export interface Region {
  id: string; name: string; icon: string; danger: number; desc: string;
  loot: [string, number, number][]; // item, chance, max
  enemies: string[]; neighbors: string[]; travel: number; rad: number;
}

export const REGIONS: Record<string, Region> = {
  camp: { id: "camp", name: "Laagriplats", icon: "🏕️", danger: 0, desc: "Väike lagendik vana raudteesilla all. Siin võib alustada.", loot: [["wood", .6, 2], ["stone", .6, 2], ["berries", .3, 1]], enemies: [], neighbors: ["forest", "ruins"], travel: 0, rad: 0 },
  forest: { id: "forest", name: "Muteerunud mets", icon: "🌲", danger: 1, desc: "Puud on liiga kõrged ja lehed liiga tumedad.", loot: [["wood", .9, 4], ["herb", .5, 2], ["berries", .5, 2], ["meat", .2, 1], ["dirtywater", .4, 1]], enemies: ["ratdog", "wolf"], neighbors: ["camp", "mine", "mountains", "flooded"], travel: 40, rad: 0 },
  ruins: { id: "ruins", name: "Varemed", icon: "🏚️", danger: 1, desc: "Kunagise küla jäänused. Tuul ulub akendes.", loot: [["scrap", .8, 3], ["cloth", .6, 2], ["can", .25, 1], ["stone", .5, 2], ["wire", .3, 1], ["dirtywater", .35, 1]], enemies: ["ratdog", "raider"], neighbors: ["camp", "city", "desert"], travel: 40, rad: 1 },
  city: { id: "city", name: "Mahajäetud linn", icon: "🏙️", danger: 2, desc: "Pilvelõhkujate luustikud, kristallid kasvamas läbi asfaldi.", loot: [["scrap", .9, 4], ["wire", .6, 2], ["can", .4, 1], ["bandage", .2, 1], ["core", .06, 1], ["dirtywater", .3, 1]], enemies: ["raider", "shade", "ghoul"], neighbors: ["ruins", "industrial", "flooded"], travel: 70, rad: 2 },
  mine: { id: "mine", name: "Kaevandus", icon: "⛏️", danger: 2, desc: "Pime šaht, mille seintes helendavad kristallid.", loot: [["ore", .8, 3], ["stone", .9, 4], ["crystal", .15, 1]], enemies: ["crawler", "golem"], neighbors: ["forest", "mountains", "depths1"], travel: 60, rad: 1 },
  industrial: { id: "industrial", name: "Tööstusala", icon: "🏭", danger: 3, desc: "Roostes tehased. Midagi siin veel töötab.", loot: [["scrap", .9, 5], ["wire", .7, 3], ["core", .15, 1], ["ore", .4, 2]], enemies: ["raider", "drone", "ghoul"], neighbors: ["city", "radiation"], travel: 80, rad: 3 },
  radiation: { id: "radiation", name: "Kiirgusala", icon: "☢️", danger: 4, desc: "Õhk virvendab. Geigerloendur karjub.", loot: [["core", .3, 1], ["crystal", .3, 1], ["scrap", .6, 3], ["antirad", .15, 1]], enemies: ["ghoul", "behemoth"], neighbors: ["industrial", "magic"], travel: 90, rad: 12 },
  desert: { id: "desert", name: "Tuhakõrb", icon: "🏜️", danger: 3, desc: "Hall tuhk nii kaugele kui silm ulatub.", loot: [["scrap", .5, 2], ["stone", .6, 3], ["rune", .1, 1], ["can", .2, 1]], enemies: ["raider", "scorpion"], neighbors: ["ruins", "magic"], travel: 90, rad: 4 },
  mountains: { id: "mountains", name: "Mäed", icon: "🏔️", danger: 3, desc: "Külmad kaljud ja vana observatoorium tipus.", loot: [["stone", .9, 4], ["ore", .6, 3], ["crystal", .2, 1], ["herb", .3, 1]], enemies: ["wolf", "golem"], neighbors: ["forest", "mine"], travel: 90, rad: 0 },
  flooded: { id: "flooded", name: "Üleujutatud ala", icon: "🌊", danger: 2, desc: "Vesi on uputanud terve linnaosa.", loot: [["dirtywater", .9, 3], ["scrap", .5, 2], ["herb", .4, 2], ["meat", .3, 1]], enemies: ["crawler", "shade"], neighbors: ["forest", "city"], travel: 70, rad: 2 },
  magic: { id: "magic", name: "Maagiline tsoon", icon: "🌀", danger: 5, desc: "Siit see kõik algas. Taevas on rebenenud.", loot: [["crystal", .6, 2], ["rune", .4, 1], ["core", .2, 1]], enemies: ["shade", "wraith"], neighbors: ["radiation", "desert"], travel: 120, rad: 8 },
  depths1: { id: "depths1", name: "Kaevanduse šaht", icon: "🕳️", danger: 3, desc: "Kaevanduse sügavam kata. Kivistunud näod seintel vaatavad sind järele.", loot: [["ore", .7, 3], ["stone", .6, 3], ["crystal", .3, 1], ["core", .08, 1]], enemies: ["crawler", "golem", "lurker"], neighbors: ["mine", "depths2"], travel: 60, rad: 1 },
  depths2: { id: "depths2", name: "Sügavik", icon: "🌑", danger: 4, desc: "Siin all on kristallid suuremad kui inimene. Ja need on soojad.", loot: [["crystal", .5, 2], ["ore", .5, 2], ["core", .15, 1], ["rune", .15, 1]], enemies: ["lurker", "hollow", "golem"], neighbors: ["depths1", "depths3"], travel: 80, rad: 2 },
  depths3: { id: "depths3", name: "Lõhe äär", icon: "🌌", danger: 5, desc: "Õhk virvendab. Kusagil all peegeldub taevas — isegi siin all.", loot: [["crystal", .7, 2], ["rune", .4, 1], ["core", .2, 1], ["voidshard", .05, 1]], enemies: ["hollow", "wraith", "heart"], neighbors: ["depths2"], travel: 100, rad: 4 },
};

export interface Enemy { id: string; name: string; icon: string; hp: number; dmg: number; xp: number; loot: [string, number, number][]; desc: string }
export const ENEMIES: Record<string, Enemy> = {
  ratdog: { id: "ratdog", name: "Mutantne röövlikoer", icon: "🐕", hp: 22, dmg: 4, xp: 10, loot: [["meat", .8, 1], ["hide", .5, 1]], desc: "Kõhn, kaks rida hambaid." },
  wolf: { id: "wolf", name: "Kristallhunt", icon: "🐺", hp: 35, dmg: 7, xp: 18, loot: [["meat", .9, 2], ["hide", .7, 1], ["crystal", .1, 1]], desc: "Seljal kasvavad kristallid." },
  raider: { id: "raider", name: "Rüüstaja", icon: "🥷", hp: 40, dmg: 8, xp: 22, loot: [["scrap", .7, 2], ["can", .4, 1], ["bandage", .3, 1]], desc: "Näljane ja relvastatud." },
  crawler: { id: "crawler", name: "Šahtiroomaja", icon: "🦂", hp: 30, dmg: 6, xp: 15, loot: [["hide", .5, 1], ["ore", .4, 1]], desc: "Liigub seintel." },
  shade: { id: "shade", name: "Vari", icon: "👤", hp: 45, dmg: 10, xp: 30, loot: [["rune", .25, 1], ["crystal", .3, 1]], desc: "Ilmub ainult pimedas." },
  ghoul: { id: "ghoul", name: "Kiirgusghoul", icon: "🧟", hp: 55, dmg: 11, xp: 32, loot: [["scrap", .5, 2], ["antirad", .2, 1]], desc: "Kunagi oli see inimene." },
  golem: { id: "golem", name: "Kristallgolem", icon: "🗿", hp: 80, dmg: 12, xp: 50, loot: [["crystal", .8, 2], ["stone", 1, 3]], desc: "Aeglane, kuid kohutav." },
  drone: { id: "drone", name: "Valvurdroon", icon: "🛸", hp: 50, dmg: 13, xp: 40, loot: [["core", .3, 1], ["wire", .8, 2]], desc: "Vana maailma masin, käsud ammu kadunud." },
  scorpion: { id: "scorpion", name: "Tuhaskorpion", icon: "🦂", hp: 60, dmg: 12, xp: 38, loot: [["hide", .7, 1], ["rune", .1, 1]], desc: "Tuhast peaaegu eristamatu." },
  behemoth: { id: "behemoth", name: "Kiirgusbehemot", icon: "🦣", hp: 140, dmg: 18, xp: 120, loot: [["core", .8, 1], ["crystal", .8, 2]], desc: "HARULDANE. Maa väriseb." },
  wraith: { id: "wraith", name: "Lõhe Vaim", icon: "👻", hp: 180, dmg: 22, xp: 200, loot: [["rune", 1, 2], ["crystal", 1, 3]], desc: "HARULDANE. See vaatab sind läbi aja." },
  lurker: { id: "lurker", name: "Šahtivaatleja", icon: "👁️", hp: 70, dmg: 14, xp: 55, loot: [["ore", .5, 2], ["crystal", .3, 1]], desc: "Liigub ainult siis, kui sa just ei vaata." },
  hollow: { id: "hollow", name: "Tühjus", icon: "🫥", hp: 110, dmg: 18, xp: 90, loot: [["rune", .3, 1], ["crystal", .5, 1]], desc: "Inimene, kellest Lõhe võttis kõik peale kuju." },
  boar: { id: "boar", name: "Kiirgusmetssiga", icon: "🐗", hp: 45, dmg: 8, xp: 25, loot: [["bigmeat", 1, 2], ["hide", .8, 1]], desc: "Jahisaak. Kihvad nagu nuga." },
  elk: { id: "elk", name: "Kahepäine põder", icon: "🫎", hp: 75, dmg: 11, xp: 45, loot: [["bigmeat", 1, 3], ["hide", 1, 2]], desc: "Jahisaak. Mõlemad pead vaatavad sind." },
  bear: { id: "bear", name: "Tuhakaru", icon: "🐻", hp: 120, dmg: 16, xp: 80, loot: [["bigmeat", 1, 5], ["hide", 1, 3]], desc: "Jahisaak. Suurim liha — ja suurim oht." },
  heart: { id: "heart", name: "LÕHE SÜDA", icon: "💠", hp: 420, dmg: 24, xp: 600, loot: [["voidshard", 1, 1], ["crystal", 1, 3], ["core", .8, 1]], desc: "BOSS. Haruldane. See peegeldab taevasid. See peegeldab sind." },
  ratking: { id: "ratking", name: "Rotikuningas", icon: "🐀", hp: 110, dmg: 9, xp: 120, loot: [["cash", 1, 15], ["hide", 1, 4], ["bigmeat", .6, 2], ["medkit", .3, 1]], desc: "MINIBOSS. Sada rotti, sabad sõlmes, üks kroon. Ta on oma riigi üle väga uhke." },
  ironcrab: { id: "ironcrab", name: "Raudkrabi", icon: "🦀", hp: 170, dmg: 13, xp: 200, loot: [["cash", 1, 25], ["scrap", 1, 10], ["ore", .8, 4], ["medkit", .4, 1]], desc: "MINIBOSS. Kest on kokku keevitatud vanadest autouksest. Klõpsutab ähvardavalt." },
  ashgiant: { id: "ashgiant", name: "Tuhahiid", icon: "🗿", hp: 240, dmg: 17, xp: 320, loot: [["cash", 1, 40], ["stone", 1, 15], ["crystal", .8, 3], ["core", .3, 1]], desc: "MINIBOSS. Tuhast ja vihast kokku kleebitud. Kui ta kõnnib, kukub temalt mägesid." },
  radmother: { id: "radmother", name: "Kiirgusema", icon: "🕷️", hp: 320, dmg: 21, xp: 480, loot: [["cash", 1, 60], ["crystal", 1, 4], ["core", .6, 1], ["rune", .5, 2]], desc: "MINIBOSS. Helendav ämblik, kelle võrk sumiseb nagu vana televiisor." },
};

export interface Structure { id: string; name: string; icon: string; desc: string; cost: Record<string, number>; time: number; maxLevel: number; requires?: string }
export const STRUCTURES: Record<string, Structure> = {
  campfire: { id: "campfire", name: "Lõkkeplats", icon: "🔥", desc: "Võimaldab süüa teha ja vett keeta.", cost: { wood: 5, stone: 3 }, time: 30, maxLevel: 1 },
  kennel: { id: "kennel", name: "Kennel", icon: "🏠", desc: "Koht lemmikutele. Iga tase = 2 kohta. Võimaldab lemmikuid aretada.", cost: { wood: 10, hide: 3, scrap: 4 }, time: 60, maxLevel: 3, requires: "campfire" },
  shelter: { id: "shelter", name: "Varjualune", icon: "⛺", desc: "Puhka turvaliselt. Iga tase taastab rohkem.", cost: { wood: 10, cloth: 3 }, time: 60, maxLevel: 3, requires: "campfire" },
  workbench: { id: "workbench", name: "Töölaud", icon: "🛠️", desc: "Paremad tööriistad ja relvad.", cost: { wood: 12, scrap: 6 }, time: 90, maxLevel: 1, requires: "campfire" },
  collector: { id: "collector", name: "Vihmakoguja", icon: "🪣", desc: "Kogub aja jooksul puhast vett.", cost: { scrap: 6, cloth: 2 }, time: 60, maxLevel: 5, requires: "campfire" },
  well: { id: "well", name: "Kaev", icon: "🕳️", desc: "Annab iga 2 minuti tagant puhast vett. Iga tase = rohkem vett.", cost: { stone: 15, wood: 5, scrap: 4 }, time: 120, maxLevel: 3, requires: "campfire" },
  garden: { id: "garden", name: "Peenar", icon: "🌱", desc: "Kasvatab aja jooksul toitu.", cost: { wood: 6, herb: 3 }, time: 60, maxLevel: 5, requires: "shelter" },
  wall: { id: "wall", name: "Kaitsesein", icon: "🧱", desc: "Kaitseb öiste rünnakute eest.", cost: { wood: 15, stone: 10, scrap: 4 }, time: 120, maxLevel: 5, requires: "workbench" },
  storage: { id: "storage", name: "Ladu", icon: "📦", desc: "Suurendab kandevõimet.", cost: { wood: 15, scrap: 5 }, time: 60, maxLevel: 5, requires: "workbench" },
  chest: { id: "chest", name: "Kast", icon: "🧰", desc: "Hoia laagris asju, mis seljakotis ruumi ei võta (150 kohta/tase). Ehitades ja meisterdades laagris võetakse materjale ka kastist.", cost: { wood: 10, scrap: 2 }, time: 40, maxLevel: 5, requires: "shelter" },
  forge: { id: "forge", name: "Sepikoda", icon: "⚒️", desc: "Sulata maaki, sepista terast.", cost: { stone: 20, ore: 6, scrap: 10 }, time: 120, maxLevel: 1, requires: "workbench" },
  tower: { id: "tower", name: "Vahitorn", icon: "🗼", desc: "Hoiatab rünnakute eest, lihtsustab avastamist.", cost: { wood: 20, scrap: 10, wire: 3 }, time: 120, maxLevel: 2, requires: "wall" },
  lab: { id: "lab", name: "Labor", icon: "⚗️", desc: "Uuri kristalle ja vana tehnoloogiat.", cost: { scrap: 20, wire: 8, core: 1 }, time: 180, maxLevel: 1, requires: "forge" },
  smokehouse: { id: "smokehouse", name: "Suitsuahi", icon: "🏚️", desc: "Küpsetab aja jooksul toorest liha (1/taseme kohta).", cost: { wood: 14, stone: 8 }, time: 90, maxLevel: 3, requires: "campfire" },
  infirmary: { id: "infirmary", name: "Välihaigla", icon: "🏥", desc: "Laagris taastub HP kiiremini, puhkus ravib rohkem.", cost: { wood: 12, cloth: 6, herb: 4 }, time: 120, maxLevel: 3, requires: "shelter" },
  bed: { id: "bed", name: "Voodi", icon: "🛏️", desc: "Pehme ase. Puhkamine taastab rohkem energiat ja HP-d (+tase).", cost: { wood: 8, cloth: 4, hide: 2 }, time: 60, maxLevel: 3, requires: "shelter" },
  hospital: { id: "hospital", name: "Haigla", icon: "🏨", desc: "Täisravi laagris (taastab HP, vähendab kiirgust) ja esmaabikomplektid.", cost: { wood: 20, scrap: 12, cloth: 10, herb: 6 }, time: 180, maxLevel: 1, requires: "infirmary" },
  turret: { id: "turret", name: "Kahur", icon: "🎯", desc: "Tugev kaitse öiste rünnakute vastu (+7/tase).", cost: { scrap: 18, wire: 6, ore: 4 }, time: 150, maxLevel: 3, requires: "tower" },
  generator: { id: "generator", name: "Generaator", icon: "⚡", desc: "Laagris taastub energia kiiremini, toodab vanametalli.", cost: { scrap: 25, wire: 10, core: 1 }, time: 180, maxLevel: 2, requires: "forge" },
};

export interface Recipe { id: string; out: string; qty: number; cost: Record<string, number>; time: number; station?: string; skill: SkillId }
export const RECIPES: Recipe[] = [
  { id: "r_stonetool", out: "stonetool", qty: 1, cost: { wood: 3, stone: 3 }, time: 30, skill: "crafting" },
  { id: "r_bandage", out: "bandage", qty: 2, cost: { cloth: 2 }, time: 20, skill: "medicine" },
  { id: "r_club", out: "club", qty: 1, cost: { wood: 4, scrap: 2 }, time: 45, skill: "crafting" },
  { id: "r_cooked", out: "cooked", qty: 1, cost: { meat: 1, wood: 1 }, time: 20, station: "campfire", skill: "survival" },
  { id: "r_water", out: "water", qty: 1, cost: { dirtywater: 1, wood: 1 }, time: 20, station: "campfire", skill: "survival" },
  { id: "r_salve", out: "salve", qty: 1, cost: { herb: 3, cloth: 1 }, time: 30, station: "campfire", skill: "medicine" },
  { id: "r_roastroach", out: "roastroach", qty: 1, cost: { roach: 3, wood: 1 }, time: 15, station: "campfire", skill: "survival" },
  { id: "r_frog", out: "roastroach", qty: 1, cost: { frog: 2, wood: 1 }, time: 15, station: "campfire", skill: "survival" },
  { id: "r_steak", out: "steak", qty: 1, cost: { bigmeat: 1, wood: 1 }, time: 30, station: "campfire", skill: "survival" },
  { id: "r_stew", out: "stew", qty: 2, cost: { bigmeat: 1, herb: 1, water: 1, wood: 1 }, time: 45, station: "campfire", skill: "survival" },
  { id: "r_medkit", out: "medkit", qty: 1, cost: { bandage: 2, salve: 1, herb: 2 }, time: 60, station: "hospital", skill: "medicine" },
  { id: "r_leather", out: "leather", qty: 1, cost: { hide: 4, cloth: 2 }, time: 90, station: "workbench", skill: "crafting" },
  { id: "r_trap", out: "trap", qty: 1, cost: { wood: 3, scrap: 3, wire: 1 }, time: 45, station: "workbench", skill: "crafting" },
  { id: "r_spear", out: "spear", qty: 1, cost: { wood: 4, scrap: 5, wire: 1 }, time: 90, station: "workbench", skill: "crafting" },
  { id: "r_irontool", out: "irontool", qty: 1, cost: { wood: 3, ore: 4 }, time: 120, station: "forge", skill: "engineering" },
  { id: "r_machete", out: "machete", qty: 1, cost: { ore: 6, hide: 1 }, time: 120, station: "forge", skill: "crafting" },
  { id: "r_plate", out: "plate", qty: 1, cost: { ore: 8, scrap: 10, hide: 2 }, time: 150, station: "forge", skill: "crafting" },
  { id: "r_antirad", out: "antirad", qty: 1, cost: { herb: 4, crystal: 1 }, time: 60, station: "lab", skill: "medicine" },
  { id: "r_drill", out: "drill", qty: 1, cost: { core: 1, crystal: 3, ore: 5 }, time: 180, station: "lab", skill: "engineering" },
  { id: "r_blade", out: "crystalblade", qty: 1, cost: { crystal: 5, ore: 6, rune: 1 }, time: 180, station: "lab", skill: "crafting" },
  { id: "r_runearmor", out: "runearmor", qty: 1, cost: { rune: 3, hide: 4, crystal: 3 }, time: 180, station: "lab", skill: "crafting" },
  { id: "r_sealer", out: "sealer", qty: 1, cost: { core: 2, crystal: 8, rune: 3, voidshard: 1 }, time: 240, station: "lab", skill: "engineering" },
];

export type SkillId = "survival" | "combat" | "crafting" | "medicine" | "exploration" | "engineering";
export const SKILLS: Record<SkillId, { name: string; icon: string; desc: string }> = {
  survival: { name: "Ellujäämine", icon: "🏕️", desc: "Kogud rohkem, nälg ja janu kahanevad aeglasemalt." },
  combat: { name: "Võitlus", icon: "⚔️", desc: "Suurem kahju ja täpsus." },
  crafting: { name: "Meisterdamine", icon: "🔨", desc: "Kiirem valmistamine." },
  medicine: { name: "Meditsiin", icon: "🩺", desc: "Ravimid taastavad rohkem." },
  exploration: { name: "Avastamine", icon: "🧭", desc: "Leiad uusi kohti ja saladusi sagedamini." },
  engineering: { name: "Insenerindus", icon: "⚙️", desc: "Kiirem ehitamine." },
};

export interface GameEvent { id: string; text: string; choices: { label: string; id: string }[] }
export const EVENTS: GameEvent[] = [
  { id: "cry", text: "Kuuled kaugelt appihüüdu. Hääl kõlab nagu laps... või miski, mis teeb lapse häält järele.", choices: [{ label: "Mine appi", id: "help" }, { label: "Ignoreeri", id: "ignore" }, { label: "Jälgi häält kaugemalt", id: "watch" }] },
  { id: "cache", text: "Leiad maasse kaevatud metallkasti, mille kaanel on vana sõjaväe sümbol.", choices: [{ label: "Kangutan lahti", id: "open" }, { label: "Jätan rahule", id: "ignore" }] },
  { id: "trader", text: "Rändkaupmees Mirko tõmbab kärutäie kraami. \"Vahetame, sõber?\"", choices: [{ label: "Anna 5 vanametalli → konserv + side", id: "trade" }, { label: "Kõnni edasi", id: "ignore" }] },
  { id: "storm", text: "Taevas muutub roheliseks. Kristallitorm läheneb!", choices: [{ label: "Otsi varju", id: "hide" }, { label: "Korja tormi ajal kristalle", id: "risk" }] },
  { id: "wounded", text: "Teeveerel lamab haavatud naine Settlersite märgiga. \"Palun... vett.\"", choices: [{ label: "Anna vett", id: "give" }, { label: "Otsi tema taskud läbi", id: "rob" }, { label: "Lahku", id: "ignore" }] },
  { id: "terminal", text: "Varemete all vilgub vana arvutiterminal. Ekraanil: PROJEKT KOIDIK — LOGI 7.", choices: [{ label: "Loe logi", id: "read" }, { label: "Võta osadeks", id: "salvage" }] },
];

export const NPCS: Record<string, { name: string; icon: string; faction: string; desc: string }> = {
  mirko: { name: "Mirko", icon: "🧔", faction: "The Wanderers", desc: "Rändkaupmees. Teab kõiki teid." },
  liis: { name: "Liis", icon: "👩‍⚕️", faction: "The Settlers", desc: "Ravitseja, keda sa päästsid." },
  kid: { name: "Väike Tom", icon: "🧒", faction: "—", desc: "Orb, kelle leidsid metsast." },
  archivist: { name: "Arhivaar", icon: "🤖", faction: "The Order", desc: "Vana masin, mis mäletab PROJEKT KOIDIKut." },
};

export const LORE = [
  "LOGI 1: Kristallid on stabiilsed. Energiatoodang ületab ootusi 400%.",
  "LOGI 3: Katsealused räägivad unes keeles, mida keegi ei tunne.",
  "LOGI 7: Lõhe avanes. See ei olnud õnnetus. Keegi avas selle teiselt poolt.",
  "LOGI 9: Kui loed seda — ära lase neil lõhet uuesti avada. Tuum tuleb hävitada või ohjeldada.",
];

// ---------- KOIDIK codex: one fragment per region, found by exploring there ----------
export interface Fragment { id: string; region: string; title: string; text: string }
export const CODEX: Fragment[] = [
  { id: "k_camp", region: "camp", title: "Raudteesilla graffiti", text: "Kriidiga kirjutatud: \"KOIDIK VALETAS. RONG EI TULNUD.\" Allkirjaks väike päike, mille kiired on lõigatud." },
  { id: "k_forest", region: "forest", title: "Puusse kasvanud ID-kaart", text: "Dr. Elo Tamm, PROJEKT KOIDIK, bioloogia osakond. Kaardi tagaküljel: \"Puud ei kasva valguse poole. Nad kasvavad Lõhe poole.\"" },
  { id: "k_ruins", region: "ruins", title: "Lapse päevik", text: "\"Isa ütles, et uus elektrijaam teeb kõik tasuta. Täna oli taevas roheline ja koerad ei lõpetanud haukumist.\"" },
  { id: "k_city", region: "city", title: "Viimane uudistesaade", text: "\"...valitsus kinnitab, et Koidiku jaam töötab normaalselt. Palume elanikel mitte vaadata otse taevasse...\" Lint katkeb karjega." },
  { id: "k_mine", region: "mine", title: "Kaevuri lindistus", text: "\"Me ei kaevanud kristalle. Me kaevasime NEID välja. Nad olid seal juba enne meid — ootasid.\"" },
  { id: "k_flooded", region: "flooded", title: "Uppunud seif", text: "Lepingu koopia: KOIDIK rahastati eraannetajalt nimega \"VAATLEJA\". Allkirja asemel on joonistatud silm." },
  { id: "k_industrial", region: "industrial", title: "Jahutussüsteemi logi", text: "Kõik 6 reaktorit välja lülitatud 03:14. Energiatoodang jätkus. Allikas: teadmata. Suund: allapoole." },
  { id: "k_mountains", region: "mountains", title: "Observatooriumi märkmed", text: "Tähtkujud on nihkunud 0,3 kraadi. Mitte meie. Taevas ise liigub — nagu keegi kohandaks objektiivi." },
  { id: "k_desert", region: "desert", title: "Evakuatsioonikäsk", text: "\"Kategooria OMEGA. Tsiviilisikud jäävad maha. Uurimisgrupp B jätkab tööd sügavikus. Lõhet EI TOHI sulgeda enne ülekannet.\"" },
  { id: "k_radiation", region: "radiation", title: "Kiirgusülikonnas kiri", text: "\"Elo, kui sa seda loed — ülekanne ei olnud energia. Me saatsime NEILE signaali. Me kutsusime nad ise.\"" },
  { id: "k_depths1", region: "depths1", title: "Šahti seinakiri", text: "Sajad käejäljed kivis, kõik suunaga alla. Nende vahel: \"Grupp B läks edasi. Keegi ei tulnud tagasi.\"" },
  { id: "k_depths2", region: "depths2", title: "Grupp B juhi märkmik", text: "\"Süda lööb. Iga löögiga avaneb Lõhe natuke rohkem. VAATLEJA ütles, et see on 'uks koju'. Kelle koju?\"" },
  { id: "k_depths3", region: "depths3", title: "Dr. Tamme viimane sõnum", text: "\"Ma olen selle ehitanud. Pitseerija. Kui sa oled siin, siis sa oled see, keda ma ootasin. Ma ei suutnud. Sina suudad.\"" },
  { id: "k_magic", region: "magic", title: "VAATLEJA hääl", text: "Õhk räägib sinu häälega: \"Sa arvad, et Koidik oli inimeste projekt? Me lihtsalt laenasime nende käsi.\"" },
];
export const CODEX_FINAL = "KOIDIKU TÕDE: Projekt Koidik ei olnud elektrijaam, vaid majakas. Keegi — VAATLEJA — kasutas inimesi, et avada uks teiselt poolt. Dr. Elo Tamm mõistis seda viimasena ja ehitas Pitseerija. Lõhe sulgemine ei ole lihtsalt võit. See on vastus.";

// ---------- pets / tamed mutts ----------
export interface PetKind { id: string; name: string; icon: string; desc: string; perk: string }
export const PET_KINDS: Record<string, PetKind> = {
  ratdog: { id: "ratdog", name: "Taltsutatud krants", icon: "🐕", desc: "Lojaalne ja nuhkiv.", perk: "Kogumisel +15% saaki, mõnikord leiab lisaeseme." },
  wolf: { id: "wolf", name: "Kristallhunt", icon: "🐺", desc: "Uhke ja ohtlik.", perk: "Ründab võitluses sageli kaasa." },
  crawler: { id: "crawler", name: "Šahtiroomaja", icon: "🦂", desc: "Tunneb maaki lõhna järgi.", perk: "Kogumisel leiab maaki ja kristalle." },
  scorpion: { id: "scorpion", name: "Tuhaskorpion", icon: "🦂", desc: "Kõva kilbiga valvur.", perk: "+2 kaitset ja +3 baasi kaitset." },
};

export interface Quest { id: string; name: string; desc: string; done: (s: import("./engine").GameState) => boolean }

// ---------- bar «Roostes Kruus» (in the ruins) ----------
export const BAR_REGION = "ruins";
export const BAR_BUY: Record<string, number> = { dirtywater: 1, water: 4, can: 6, cooked: 8, bandage: 6, stew: 15, salve: 12, antirad: 25, cloth: 3, wire: 5, meat: 4 };
// item -> [units per sale, caps paid]
export const BAR_SELL: Record<string, [number, number]> = {
  scrap: [2, 1], wood: [3, 1], stone: [3, 1], cloth: [1, 1], wire: [1, 2], hide: [1, 2], ore: [1, 2], herb: [2, 1],
  roach: [3, 1], frog: [2, 1], meat: [1, 2], bigmeat: [1, 4], fish: [1, 2], berries: [3, 1], dirtywater: [3, 1],
  crystal: [1, 12], core: [1, 20], rune: [1, 15], knife: [1, 2], rags: [1, 1], club: [1, 5], stonetool: [1, 4],
};
export interface Contract { id: string; name: string; icon: string; kind: "deliver" | "stat"; item?: string; stat?: "kills" | "gathered" | "explored" | "fished" | "crafted"; n: number; cash: number; xp: number }
export const CONTRACT_POOL: Contract[] = [
  { id: "c_wood", name: "Baarmen vajab küttepuid", icon: "🪵", kind: "deliver", item: "wood", n: 10, cash: 6, xp: 15 },
  { id: "c_meat", name: "Köök tahab liha", icon: "🥩", kind: "deliver", item: "meat", n: 3, cash: 9, xp: 20 },
  { id: "c_fish", name: "Kalapäev baaris", icon: "🐟", kind: "deliver", item: "fish", n: 3, cash: 9, xp: 20 },
  { id: "c_herb", name: "Ravitseja Liis vajab taimi", icon: "🌿", kind: "deliver", item: "herb", n: 5, cash: 8, xp: 20 },
  { id: "c_wire", name: "Raadio parandus", icon: "🧶", kind: "deliver", item: "wire", n: 4, cash: 10, xp: 25 },
  { id: "c_hide", name: "Nahkur otsib nahku", icon: "🟫", kind: "deliver", item: "hide", n: 3, cash: 10, xp: 25 },
  { id: "c_crystal", name: "Salapärane klient", icon: "💎", kind: "deliver", item: "crystal", n: 2, cash: 30, xp: 40 },
  { id: "c_kill", name: "Pearaha: mutandid", icon: "⚔️", kind: "stat", stat: "kills", n: 4, cash: 14, xp: 35 },
  { id: "c_explore", name: "Luuretöö", icon: "🧭", kind: "stat", stat: "explored", n: 3, cash: 10, xp: 30 },
  { id: "c_gather", name: "Varustaja", icon: "🪓", kind: "stat", stat: "gathered", n: 8, cash: 8, xp: 20 },
  { id: "c_fishing", name: "Õngitseja", icon: "🎣", kind: "stat", stat: "fished", n: 3, cash: 10, xp: 25 },
];

// ---------- editable texts (tekstid.ts, or tekstid.json next to the self-hosted game) ----------
type TextPack = Partial<Record<keyof typeof TEKSTID, Record<string, Record<string, string>>>> & { pardi_jutud?: string[] };
export function applyTekstid(t: TextPack) {
  const targets: Record<string, Record<string, Record<string, unknown>>> = {
    esemed: ITEMS as never, piirkonnad: REGIONS as never, vaenlased: ENEMIES as never, ehitised: STRUCTURES as never, tegelased: NPCS as never, lemmikud: PET_KINDS as never,
  };
  for (const [group, entries] of Object.entries(t)) {
    const target = targets[group]; if (!target || !entries || Array.isArray(entries)) continue;
    for (const [id, fields] of Object.entries(entries)) {
      if (!target[id]) continue;
      for (const [f, v] of Object.entries(fields)) if (typeof v === "string" && v) target[id][f] = v;
    }
  }
  if (Array.isArray(t.pardi_jutud) && t.pardi_jutud.length) PARDI_JUTUD.splice(0, PARDI_JUTUD.length, ...t.pardi_jutud.filter((x) => typeof x === "string"));
}
applyTekstid(TEKSTID);
