import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KIBBUTZIM = [
  "אבן יצחק", "אורים", "אילות", "אירוס", "אל-רום",
  "אלומות", "אלומים", "אלונים", "אמיר", "אפיקים",
  "בארי", "בחן", "בית אורן", "בית גוברין", "בית השיטה",
  "בית זרע", "בית עמק", "בית קשת", "ברעם", "גבת",
  "גזר", "גלאון", "גן שמואל", "גנוסר", "גניגר",
  "גורן", "גשר", "גשר הזיו", "דברת", "דן",
  "דפנה", "דרום", "הגושרים", "הזורעים", "המעפיל",
  "הסוללים", "העוגן", "הר גילה", "הראל", "הרדוף",
  "זיקים", "זיק", "חולדה", "חנמת", "חצור",
  "טירת צבי", "כברי", "כפר בלום", "כפר גלעדי", "כפר המכבי",
  "כפר מסריק", "כפר רופין", "לביא", "לוחמי הגטאות", "מאיר שפיה",
  "מגל", "מגן", "מגן מיכאל", "מחניים", "מנרה",
  "מענית", "מפלסים", "מרחביה", "משמר דוד", "משמר העמק",
  "משמר הנגב", "משמר השרון", "נאות מרדכי", "נגבה", "נווה אור",
  "נווה אטיב", "נחל עוז", "נחשון", "ניר דוד", "ניר עוז",
  "ניר יצחק", "ניר עם", "עובדיה", "עין גב", "עין גדי",
  "עין דור", "עין הנציב", "עין חרוד", "עין כרמל", "עין שמר",
  "עין שריד", "עין קינייה", "עינת", "עיר שמש", "עמיר",
  "עפולה עילית", "פלמחים", "קדמה", "קיבוץ גבע", "קלחים",
  "ראש הנקרה", "רביד", "רמות מנשה", "רמות נפתלי", "רמת דוד",
  "רמת יוחנן", "רמת רחל", "שדה אליהו", "שדה נחום", "שדמות דבורה",
  "שומרת", "שפיים", "שמיר", "שרונה", "תל יוסף",
  "תל קציר", "תמרת", "תירוש", "תל עמל", "חפציבה",
];

async function main() {
  console.log("🌱 Seeding database...");

  // Seed card types
  await prisma.cardType.upsert({
    where: { id: "ct-isracard-giftcard" },
    update: {},
    create: {
      id: "ct-isracard-giftcard",
      name: "Isracard GiftCard",
      nameHe: "ישרכארט GiftCard",
      discountPct: 2.0,
      minLoadAmount: 100,
      maxLoadAmount: 1500,
      displayOrder: 1,
    },
  });

  await prisma.cardType.upsert({
    where: { id: "ct-shopping-giftcard" },
    update: {},
    create: {
      id: "ct-shopping-giftcard",
      name: "Shopping GiftCard",
      nameHe: "Shopping GiftCard",
      discountPct: 5.5,
      minLoadAmount: 100,
      maxLoadAmount: 1500,
      displayOrder: 2,
    },
  });

  console.log("✅ Card types seeded");

  // Seed default branding
  await prisma.systemSetting.upsert({
    where: { key: "branding" },
    update: {},
    create: {
      key: "branding",
      value: {
        primaryColor: "#1a73e8",
        secondaryColor: "#fbbc04",
        welcomeText: "ברוכים הבאים למערכת הזמנות תווי השי של מישקי דן",
        logoUrl: null,
      },
      description: "הגדרות מיתוג המערכת",
    },
  });

  // Seed order window for Rosh Hashana 2025
  await prisma.orderWindow.upsert({
    where: { id: "ow-rh-2025" },
    update: {},
    create: {
      id: "ow-rh-2025",
      name: "ראש השנה תשפ״ו – 2025",
      holiday: "rosh_hashana",
      orderOpenAt: new Date("2025-07-01T00:00:00Z"),
      orderCloseAt: new Date("2025-08-24T23:59:59Z"),
      deliveryDate: new Date("2025-09-09"),
      minOrderTotal: 2000,
      isActive: false, // historical
    },
  });

  console.log("✅ Order windows seeded");

  // Seed kibbutzim organizations
  let orgCount = 0;
  for (const name of KIBBUTZIM) {
    const existing = await prisma.organization.findFirst({ where: { name } });
    if (!existing) {
      await prisma.organization.create({ data: { name, isActive: true } });
      orgCount++;
    }
  }
  console.log(`✅ ${orgCount} new organizations seeded (${KIBBUTZIM.length} total)`);

  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@mishkei-dan.co.il";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: "מנהל מערכת",
      role: "admin",
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${adminEmail}`);

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
