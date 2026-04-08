/**
 * seed-organizations.ts
 * מחליף את כל הארגונים ב-110 ישובים מהאקסל.
 * שיוכים מיוחדים: אילות → רבדים, אורים → כפר מנחם
 *
 * הרצה: npx tsx prisma/seed-organizations.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_ORGS: { name: string; parentOrg: string }[] = [
  // משקי הנגב (52)
  { name: "אור הנר",       parentOrg: "משקי הנגב" },
  { name: "אורים",         parentOrg: "משקי הנגב" },
  { name: "אילות",         parentOrg: "משקי הנגב" },
  { name: "אליפז",         parentOrg: "משקי הנגב" },
  { name: "ארז",           parentOrg: "משקי הנגב" },
  { name: "בארי",          parentOrg: "משקי הנגב" },
  { name: "בית קמה",       parentOrg: "משקי הנגב" },
  { name: "ברור חיל",      parentOrg: "משקי הנגב" },
  { name: "גבולות",        parentOrg: "משקי הנגב" },
  { name: "גבים",          parentOrg: "משקי הנגב" },
  { name: "גרופית",        parentOrg: "משקי הנגב" },
  { name: "דביר",          parentOrg: "משקי הנגב" },
  { name: "דורות",         parentOrg: "משקי הנגב" },
  { name: "הר עמשא",       parentOrg: "משקי הנגב" },
  { name: "חולית",         parentOrg: "משקי הנגב" },
  { name: "חצרים",         parentOrg: "משקי הנגב" },
  { name: "טללים",         parentOrg: "משקי הנגב" },
  { name: "יד מרדכי",      parentOrg: "משקי הנגב" },
  { name: "יהל",           parentOrg: "משקי הנגב" },
  { name: "יטבתה",         parentOrg: "משקי הנגב" },
  { name: "כיסופים",       parentOrg: "משקי הנגב" },
  { name: "כפר עזה",       parentOrg: "משקי הנגב" },
  { name: "כרם שלום",      parentOrg: "משקי הנגב" },
  { name: "כרמים",         parentOrg: "משקי הנגב" },
  { name: "להב",           parentOrg: "משקי הנגב" },
  { name: "לוטן",          parentOrg: "משקי הנגב" },
  { name: "מגן",           parentOrg: "משקי הנגב" },
  { name: "מפלסים",        parentOrg: "משקי הנגב" },
  { name: "מצפה שלום",     parentOrg: "משקי הנגב" },
  { name: "משאבי שדה",     parentOrg: "משקי הנגב" },
  { name: "משמר הנגב",     parentOrg: "משקי הנגב" },
  { name: "נאות סמדר",     parentOrg: "משקי הנגב" },
  { name: "נווה חריף",     parentOrg: "משקי הנגב" },
  { name: "נחל עוז",       parentOrg: "משקי הנגב" },
  { name: "ניר יצחק",      parentOrg: "משקי הנגב" },
  { name: "ניר עוז",       parentOrg: "משקי הנגב" },
  { name: "ניר עם",        parentOrg: "משקי הנגב" },
  { name: "נירים",         parentOrg: "משקי הנגב" },
  { name: "סופה",          parentOrg: "משקי הנגב" },
  { name: "סמר",           parentOrg: "משקי הנגב" },
  { name: "סעד",           parentOrg: "משקי הנגב" },
  { name: "עין גדי",       parentOrg: "משקי הנגב" },
  { name: "עין השלושה",    parentOrg: "משקי הנגב" },
  { name: "עלומים",        parentOrg: "משקי הנגב" },
  { name: "צאלים",         parentOrg: "משקי הנגב" },
  { name: "קטורה",         parentOrg: "משקי הנגב" },
  { name: "רביבים",        parentOrg: "משקי הנגב" },
  { name: "רוחמה",         parentOrg: "משקי הנגב" },
  { name: "רעים",          parentOrg: "משקי הנגב" },
  { name: "שדה בוקר",      parentOrg: "משקי הנגב" },
  { name: "שובל",          parentOrg: "משקי הנגב" },
  { name: "שומריה",        parentOrg: "משקי הנגב" },

  // משקי הדרום (58)
  { name: "הראל",          parentOrg: "משקי הדרום" },
  { name: "מעלה החמישה",   parentOrg: "משקי הדרום" },
  { name: "נחשון",         parentOrg: "משקי הדרום" },
  { name: 'נתיב הל"ה',     parentOrg: "משקי הדרום" },
  { name: "צובה",          parentOrg: "משקי הדרום" },
  { name: "צרעה",          parentOrg: "משקי הדרום" },
  { name: "קריית ענבים",   parentOrg: "משקי הדרום" },
  { name: "רמת רחל",       parentOrg: "משקי הדרום" },
  { name: "גלגל",          parentOrg: "משקי הדרום" },
  { name: "ייטב",          parentOrg: "משקי הדרום" },
  { name: "נערן",          parentOrg: "משקי הדרום" },
  { name: "אלמוג",         parentOrg: "משקי הדרום" },
  { name: "בית הערבה",     parentOrg: "משקי הדרום" },
  { name: "קליה",          parentOrg: "משקי הדרום" },
  { name: "בית גוברין",    parentOrg: "משקי הדרום" },
  { name: "בית ניר",       parentOrg: "משקי הדרום" },
  { name: "גלאון",         parentOrg: "משקי הדרום" },
  { name: "גת",            parentOrg: "משקי הדרום" },
  { name: "כפר מנחם",      parentOrg: "משקי הדרום" },
  { name: "נגבה",          parentOrg: "משקי הדרום" },
  { name: "רבדים",         parentOrg: "משקי הדרום" },
  { name: "שדה יואב",      parentOrg: "משקי הדרום" },
  { name: "גזר",           parentOrg: "משקי הדרום" },
  { name: "חולדה",         parentOrg: "משקי הדרום" },
  { name: "נען",           parentOrg: "משקי הדרום" },
  { name: "נצר סירני",     parentOrg: "משקי הדרום" },
  { name: "גבעת ברנר",     parentOrg: "משקי הדרום" },
  { name: "קבוצת שילר",    parentOrg: "משקי הדרום" },
  { name: "פלמחים",        parentOrg: "משקי הדרום" },
  { name: "חצור אשדוד",    parentOrg: "משקי הדרום" },
  { name: "גברעם",         parentOrg: "משקי הדרום" },
  { name: "כרמיה",         parentOrg: "משקי הדרום" },
  { name: "ניצנים",        parentOrg: "משקי הדרום" },
  { name: "זיקים",         parentOrg: "משקי הדרום" },
  { name: "קבוצת יבנה",    parentOrg: "משקי הדרום" },
  { name: "בארות יצחק",    parentOrg: "משקי הדרום" },
  { name: "ראש צורים",     parentOrg: "משקי הדרום" },
  { name: "כפר עציון",     parentOrg: "משקי הדרום" },
  { name: "חפץ חיים",      parentOrg: "משקי הדרום" },
  { name: "עין צורים",     parentOrg: "משקי הדרום" },
  { name: "משואות יצחק",   parentOrg: "משקי הדרום" },
  { name: "נווה אילן",     parentOrg: "משקי הדרום" },
  { name: "משמר דוד",      parentOrg: "משקי הדרום" },
  { name: "שעלבים",        parentOrg: "משקי הדרום" },
  { name: "כפר דניאל",     parentOrg: "משקי הדרום" },
  { name: "כרמל",          parentOrg: "משקי הדרום" },
  { name: "מעון",          parentOrg: "משקי הדרום" },
  { name: "בית יתיר",      parentOrg: "משקי הדרום" },
  { name: "יסודות",        parentOrg: "משקי הדרום" },
  { name: "מבוא חורון",    parentOrg: "משקי הדרום" },
  { name: "בית חלקיה",     parentOrg: "משקי הדרום" },
  { name: "יד בנימין",     parentOrg: "משקי הדרום" },
  { name: "בני דרום",      parentOrg: "משקי הדרום" },
  { name: "ניר גלים",      parentOrg: "משקי הדרום" },
  { name: "תימורים",       parentOrg: "משקי הדרום" },
  { name: "מבקיעים",       parentOrg: "משקי הדרום" },
  { name: "שורש",          parentOrg: "משקי הדרום" },
  { name: "תלמי יפה",      parentOrg: "משקי הדרום" },
];

// שיוכים מיוחדים: שם ישן → שם חדש
const REASSIGNMENTS: Record<string, string> = {
  "אילות": "רבדים",
  "אורים": "כפר מנחם",
};

async function main() {
  console.log("🚀 מתחיל מיגרציית ישובים...\n");

  // 1. שמור מיפוי של ישובים קיימים (שם → id)
  const existingOrgs = await prisma.organization.findMany();
  const existingByName = new Map(existingOrgs.map((o) => [o.name, o]));
  console.log(`📋 ישובים קיימים: ${existingOrgs.length}`);

  // 2. הוסף/עדכן את 110 הישובים החדשים
  const newOrgIds = new Map<string, string>(); // שם → id חדש

  for (const org of NEW_ORGS) {
    const existing = existingByName.get(org.name);
    if (existing) {
      // עדכן parentOrg אם כבר קיים
      const updated = await prisma.organization.update({
        where: { id: existing.id },
        data: { parentOrg: org.parentOrg, isActive: true },
      });
      newOrgIds.set(org.name, updated.id);
    } else {
      // צור חדש
      const created = await prisma.organization.create({
        data: { name: org.name, parentOrg: org.parentOrg },
      });
      newOrgIds.set(org.name, created.id);
    }
  }
  console.log(`✅ ${NEW_ORGS.length} ישובים עודכנו/נוצרו\n`);

  // 3. שיוך מחדש של משתמשים והזמנות
  for (const oldOrg of existingOrgs) {
    const targetName = REASSIGNMENTS[oldOrg.name] ?? oldOrg.name;
    const newId = newOrgIds.get(targetName);

    if (!newId) {
      console.log(`⚠️  "${oldOrg.name}" — אין מיפוי, מדלג`);
      continue;
    }

    if (newId === oldOrg.id) continue; // אותו רשומה, לא צריך להזיז

    const label = REASSIGNMENTS[oldOrg.name]
      ? `"${oldOrg.name}" → "${targetName}" (שיוך מיוחד)`
      : `"${oldOrg.name}" (עדכון id)`;

    const users = await prisma.user.updateMany({
      where: { organizationId: oldOrg.id },
      data: { organizationId: newId },
    });
    const orders = await prisma.order.updateMany({
      where: { organizationId: oldOrg.id },
      data: { organizationId: newId },
    });

    if (users.count > 0 || orders.count > 0) {
      console.log(`🔄 ${label}: ${users.count} משתמשים, ${orders.count} הזמנות הועברו`);
    }
  }

  // 4. מחק ישובים ישנים שאינם ב-110 ואין להם יותר משתמשים/הזמנות
  const newNames = new Set(NEW_ORGS.map((o) => o.name));
  let deleted = 0;
  for (const old of existingOrgs) {
    if (newNames.has(old.name)) continue; // נמצא ברשימה החדשה
    const userCount = await prisma.user.count({ where: { organizationId: old.id } });
    const orderCount = await prisma.order.count({ where: { organizationId: old.id } });
    if (userCount === 0 && orderCount === 0) {
      await prisma.organization.delete({ where: { id: old.id } });
      console.log(`🗑️  נמחק: "${old.name}"`);
      deleted++;
    } else {
      console.log(`⚠️  "${old.name}" לא נמחק — עדיין יש ${userCount} משתמשים / ${orderCount} הזמנות`);
    }
  }

  const total = await prisma.organization.count();
  console.log(`\n✅ סיום! סה"כ ישובים בDB: ${total} | נמחקו: ${deleted}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
