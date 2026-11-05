import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות - Eazyplans",
  description: "מדיניות הפרטיות של מערכת Eazyplans לניהול אולמות אירועים",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function TodoFill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-md bg-warning/15 text-warning-foreground px-2 py-0.5 font-medium">
      [להשלמה: {children}]
    </span>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header className="space-y-2 border-b pb-6">
          <Link href="/login" className="text-sm text-primary hover:underline">
            ← חזרה למערכת
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">מדיניות פרטיות</h1>
          <p className="text-sm text-muted-foreground">
            מדיניות זו מפרטת כיצד Eazyplans אוספת, משתמשת ושומרת על מידע אישי במערכת לניהול אולמות אירועים, לידים והזמנות, בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981.
          </p>
        </header>

        <Section title="1. מי אוסף את המידע">
          <p>
            המידע נאסף ומנוהל על ידי{" "}
            <TodoFill>שם העוסק/החברה המפעילה את Eazyplans (ח.פ./ע.מ, ככל שרלוונטי)</TodoFill>
            {" "}(&quot;אנחנו&quot; או &quot;המערכת&quot;).
          </p>
          <p>
            לפניות בנושא פרטיות, בקשות לעיון, תיקון או מחיקת מידע, ניתן לפנות אל{" "}
            <TodoFill>כתובת פנייה — דוא&quot;ל ו/או טלפון ו/או כתובת דואר</TodoFill>.
          </p>
        </Section>

        <Section title="2. איזה מידע אנחנו אוספים">
          <ul className="list-disc list-outside mr-5 space-y-1">
            <li>פרטי קשר של לקוחות: שם, מספר טלפון (ייתכן יותר מאחד), וכתובת דוא&quot;ל (אופציונלי).</li>
            <li>היסטוריית פניות (לידים): סטטוס הפנייה, הערות, האולם המבוקש ותאריכים.</li>
            <li>היסטוריית הזמנות ורכישות: סוג האירוע, תאריך, אולם, מחיר ומצב תשלום/הנחה, מדיניות ביטול שסוכמה.</li>
            <li>פרטי אנשי צוות (מזכירות, בעלי אולמות, מנהלים): שם מלא וכתובת דוא&quot;ל לצורך גישה למערכת.</li>
            <li>פרטי איש קשר של אולם (ככל שהוזנו): שם וטלפון של נציג האולם.</li>
          </ul>
        </Section>

        <Section title="3. מטרות השימוש במידע">
          <ul className="list-disc list-outside mr-5 space-y-1">
            <li>תיעוד וטיפול בפניות (לידים) ומעקב אחר סטטוס ההתקדמות.</li>
            <li>יצירה, ניהול וביטול של הזמנות אירועים, כולל בדיקת זמינות ומניעת הזמנה כפולה.</li>
            <li>שליחת הודעות ותזכורות הקשורות לפנייה או להזמנה (אישור הזמנה, עדכון על ביטול, תזכורות).</li>
            <li>ניהול גישת צוות למערכת ותיעוד פעולות לצורכי בקרה ואבטחת מידע (יומן ביקורת).</li>
            <li>הצגת מיקום האולם על גבי מפה (באמצעות כתובת האולם בלבד — לא פרטי לקוח).</li>
          </ul>
        </Section>

        <Section title="4. מסירת מידע — חובה או רשות">
          <p>
            מסירת המידע אינה מעוגנת בחובה חוקית, והיא נעשית מרצון. עם זאת, ללא שם וטלפון תקינים לא ניתן להשלים הזמנת אולם או לטפל בפנייה, שכן פרטים אלה נדרשים לתיאום בפועל עם הלקוח. מסירת כתובת דוא&quot;ל היא רשות מלאה — לקוח שלא ימסור כתובת דוא&quot;ל לא יקבל הודעות אישור/עדכון בדוא&quot;ל, אך ההזמנה תיווצר כרגיל.
          </p>
        </Section>

        <Section title="5. למי מועבר המידע">
          <ul className="list-disc list-outside mr-5 space-y-1">
            <li>
              <strong>בעל/ת האולם הרלוונטי</strong> — מקבל/ת את פרטי הלקוח (שם, טלפון, דוא&quot;ל ככל שנמסר) ופרטי ההזמנה הנוגעים לאולם שלו/ה, לצורך תפעול האירוע.
            </li>
            <li>
              <strong>Supabase</strong> — ספק תשתית בסיס הנתונים, האימות (Auth) ואחסון הקבצים של המערכת. המידע מאוחסן ומעובד בשירותיו.
            </li>
            <li>
              <strong>Resend</strong> — ספק שליחת הודעות הדוא&quot;ל (אישורי הזמנה, תזכורות, עדכוני ביטול). מקבל את כתובת הדוא&quot;ל של הנמען ואת תוכן ההודעה הרלוונטי.
            </li>
            <li>
              <strong>Nominatim / OpenStreetMap</strong> — משמש לאיתור קואורדינטות של <strong>כתובת האולם בלבד</strong> לצורך הצגתו על מפה. לא מועברים אליו פרטי לקוח.
            </li>
          </ul>
          <p>
            המידע אינו נמכר ואינו מועבר לצדדים שלישיים נוספים למטרות שיווק.
          </p>
        </Section>

        <Section title="6. העברת מידע אל מחוץ לישראל">
          <p>
            חלק מהספקים המפורטים בסעיף 5 (ובכלל זה שירותי תשתית ודוא&quot;ל) עשויים לאחסן או לעבד מידע בשרתים הממוקמים מחוץ לישראל.
            מיקום השרתים המדויק ומדינות/אזורי האחסון בפועל: <TodoFill>לציין את אזור האחסון שנבחר ב-Supabase ומיקומי השרתים של Resend הרלוונטיים לחשבון</TodoFill>.
          </p>
        </Section>

        <Section title="7. תקופת השמירה">
          <p>
            <TodoFill>לציין מדיניות שמירה/מחיקה בפועל — למשל האם מידע על לידים/הזמנות שלא הבשילו להזמנה או שבוטלו נמחק אחרי פרק זמן מוגדר, ומה קורה למידע של משתמשי צוות שגישתם נחסמה</TodoFill>.
          </p>
        </Section>

        <Section title="8. זכויות נושא המידע">
          <p>
            בהתאם לחוק הגנת הפרטיות, כל אדם שמידע עליו מצוי במערכת זכאי לעיין במידע המוחזק עליו, ולבקש כי מידע שנמצא לא נכון, לא שלם, לא מדויק או לא מעודכן יתוקן או יימחק.
          </p>
          <p>
            לממש זכויות אלה ניתן לפנות אל הגורם המפורט בסעיף 1 לעיל. נשתדל להשיב לכל פנייה בתוך זמן סביר ובהתאם להוראות החוק.
          </p>
        </Section>

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          עדכון אחרון: <TodoFill>תאריך העדכון בפועל כשהמדיניות תאושר ותפורסם</TodoFill>
        </footer>
      </div>
    </main>
  );
}
