import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות - Eazyplans",
  description: "מדיניות הפרטיות של מערכת Eazyplans לניהול אולמות אירועים",
};

const SECTIONS = [
  { id: "general", label: "1. כללי" },
  { id: "definitions", label: "2. הגדרות" },
  { id: "collected", label: "3. המידע הנאסף" },
  { id: "purposes", label: "4. מטרות השימוש במידע" },
  { id: "voluntary", label: "5. מסירת מידע — חובה או רשות" },
  { id: "disclosure", label: "6. מסירת מידע לצדדים שלישיים" },
  { id: "security", label: "7. אבטחת מידע" },
  { id: "transfer", label: "8. העברת מידע אל מחוץ לישראל" },
  { id: "retention", label: "9. תקופת שמירת המידע" },
  { id: "rights", label: "10. זכויות נושא המידע" },
  { id: "contact", label: "11. יצירת קשר בנושאי פרטיות" },
  { id: "amendments", label: "12. שינויים במדיניות זו" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-6">
      <h2 className="text-lg font-semibold tracking-tight border-b border-border/70 pb-2">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

/** A single numbered legal clause, e.g. "3.1   ...". */
function Clause({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="font-medium text-foreground shrink-0">{n}</span>
      <span>{children}</span>
    </p>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link href="/login" className="text-sm text-primary hover:underline">
          ← חזרה למערכת
        </Link>

        <header className="mt-4 space-y-3 border-b pb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">מדיניות פרטיות</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            מדיניות פרטיות זו (&quot;המדיניות&quot;) חלה על מערכת Eazyplans לניהול אולמות אירועים, פניות לקוחות (לידים) והזמנות (&quot;השירות&quot;), ומפרטת את אופן איסוף המידע האישי, השימוש בו, שמירתו והעברתו, בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, ולתקנותיו.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            המשך השימוש בשירות, וכן מסירת מידע אישי במסגרתו, מהווים הסכמה לתנאי מדיניות זו. ככל שאינך מסכים/ה לתנאים המפורטים להלן, אנא הימנע/י ממסירת מידע אישי במסגרת השירות ופנה/י אלינו בפרטי הקשר שבסעיף 11.
          </p>
        </header>

        <nav aria-label="תוכן העניינים" className="my-6 rounded-lg border bg-muted/40 p-4">
          <h2 className="text-sm font-semibold mb-2">תוכן העניינים</h2>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-8">
          <Section id="general" title="1. כללי">
            <Clause n="1.1">
              מדיניות זו נועדה ליידע את מי שמוסר מידע אישי במסגרת השירות — לקוחות, פונים (לידים), אנשי קשר של אולמות וחברי/ות צוות — באשר לאופן הטיפול במידע זה.
            </Clause>
            <Clause n="1.2">
              המידע נאסף ומנוהל על ידי{" "}
              <TodoFill>שם התאגיד/העוסק המפעיל את Eazyplans, לרבות מספר ח.פ./ע.מ ככל שרלוונטי</TodoFill>
              {" "}(להלן: &quot;החברה&quot;).
            </Clause>
            <Clause n="1.3">
              החברה רשאית לעדכן מדיניות זו מעת לעת, כמפורט בסעיף 12 להלן.
            </Clause>
          </Section>

          <Section id="definitions" title="2. הגדרות">
            <Clause n="2.1"><strong>&quot;החברה&quot;</strong> — הגורם המפעיל את השירות, כהגדרתו בסעיף 1.2 לעיל.</Clause>
            <Clause n="2.2"><strong>&quot;השירות&quot;</strong> — מערכת Eazyplans לניהול אולמות אירועים, פניות לקוחות (לידים) והזמנות, על כלל רכיביה.</Clause>
            <Clause n="2.3"><strong>&quot;נושא המידע&quot;</strong> — אדם שמידע אישי לגביו נאסף או מעובד במסגרת השירות, לרבות לקוח, פונה, איש קשר של אולם, או איש/אשת צוות.</Clause>
            <Clause n="2.4"><strong>&quot;מידע אישי&quot;</strong> — כל מידע הנוגע לאדם מזוהה או ניתן לזיהוי, כמפורט בסעיף 3 להלן.</Clause>
          </Section>

          <Section id="collected" title="3. המידע הנאסף">
            <p>במסגרת השירות נאסף ומעובד מידע אישי מהסוגים הבאים:</p>
            <ul className="list-disc list-outside mr-5 space-y-1.5">
              <li><strong>פרטי קשר של לקוחות</strong> — שם מלא, מספר טלפון (וניתן לרשום יותר ממספר אחד), וכתובת דואר אלקטרוני (מסירתה רשות).</li>
              <li><strong>היסטוריית פניות (לידים)</strong> — סטטוס הפנייה, הערות שהוזנו, האולם המבוקש ותאריכי האירוע המבוקשים.</li>
              <li><strong>היסטוריית הזמנות ורכישות</strong> — סוג האירוע ומהותו, תאריך, האולם שהוזמן, מחיר, הנחה ומצב תשלום, ומדיניות הביטול שסוכמה.</li>
              <li><strong>פרטי אנשי צוות</strong> (מזכירות, בעלי/ות אולמות, מנהלים/ות) — שם מלא וכתובת דואר אלקטרוני, לצורך ניהול גישה לשירות.</li>
              <li><strong>פרטי איש קשר של אולם</strong>, ככל שהוזנו — שם וטלפון של נציג/ת האולם.</li>
            </ul>
          </Section>

          <Section id="purposes" title="4. מטרות השימוש במידע">
            <p>המידע האישי האמור בסעיף 3 משמש את החברה למטרות הבאות בלבד:</p>
            <ul className="list-disc list-outside mr-5 space-y-1.5">
              <li>תיעוד וטיפול בפניות (לידים) ומעקב אחר התקדמותן.</li>
              <li>יצירה, ניהול, שינוי וביטול של הזמנות אירועים, לרבות בדיקת זמינות ומניעת הזמנה כפולה באותו מועד.</li>
              <li>משלוח הודעות ותזכורות הקשורות לפנייה או להזמנה (לרבות אישור הזמנה, עדכון על ביטול, ותזכורות מועד).</li>
              <li>ניהול גישת צוות לשירות ותיעוד פעולות לצורכי בקרה ואבטחת מידע (יומן ביקורת).</li>
              <li>הצגת מיקום האולם על גבי מפה, באמצעות כתובת האולם בלבד — לא באמצעות פרטי לקוח.</li>
            </ul>
          </Section>

          <Section id="voluntary" title="5. מסירת מידע — חובה או רשות">
            <Clause n="5.1">מסירת מידע אישי לחברה אינה מעוגנת בחובה שבדין, והיא נעשית מרצונו/ה החופשי של נושא המידע.</Clause>
            <Clause n="5.2">
              עם זאת, מסירת שם וטלפון תקינים מהווה תנאי הכרחי להשלמת הזמנת אולם ולטיפול בפנייה, שכן פרטים אלה נדרשים לצורך יצירת קשר בפועל ותיאום האירוע. פונה שלא ימסור פרטים אלה — לא ניתן יהיה לטפל בפנייתו/ה.
            </Clause>
            <Clause n="5.3">
              מסירת כתובת דואר אלקטרוני הינה רשות מלאה ואינה תנאי לביצוע הזמנה. פונה שלא ימסור כתובת דואר אלקטרוני לא יקבל הודעות אישור ועדכון הנשלחות בערוץ זה, וההזמנה תתועד ותטופל כרגיל בכל שאר ההיבטים.
            </Clause>
          </Section>

          <Section id="disclosure" title="6. מסירת מידע לצדדים שלישיים">
            <p>החברה אינה מוכרת מידע אישי ואינה מעבירה אותו לצדדים שלישיים למטרות שיווק. המידע האישי מועבר לגורמים הבאים, במידה הנדרשת לצורך תפעול השירות בלבד:</p>
            <ul className="list-disc list-outside mr-5 space-y-1.5">
              <li><strong>בעל/ת האולם הרלוונטי</strong> — מקבל/ת את פרטי נושא המידע (שם, טלפון, וכתובת דואר אלקטרוני ככל שנמסרה) ואת פרטי ההזמנה הנוגעים לאולם שבבעלותו/ה, לצורך תפעול האירוע בפועל.</li>
              <li><strong>Supabase</strong> — ספק שירותי תשתית (בסיס נתונים, אימות משתמשים ואחסון קבצים) המשמש להפעלת השירות. המידע האישי מאוחסן ומעובד באמצעות שירותיו.</li>
              <li><strong>Resend</strong> — ספק שירותי דיוור אלקטרוני, המשמש למשלוח הודעות אישור הזמנה, תזכורות ועדכוני ביטול. ספק זה מקבל את כתובת הדואר האלקטרוני של הנמען ואת תוכן ההודעה הרלוונטית בלבד.</li>
              <li><strong>Nominatim / OpenStreetMap</strong> — שירות מיפוי המשמש לאיתור קואורדינטות על בסיס כתובת האולם בלבד, לצורך הצגתו על גבי מפה. לא מועבר לשירות זה מידע אישי של לקוחות.</li>
            </ul>
            <p>מעבר לאמור לעיל, החברה עשויה למסור מידע אישי במקרים נוספים הנדרשים על פי דין, לרבות לפי צו שיפוטי או דרישה של רשות מוסמכת.</p>
          </Section>

          <Section id="security" title="7. אבטחת מידע">
            <p>
              החברה נוקטת אמצעים סבירים להגנה על המידע האישי המוחזק אצלה, לרבות שימוש בספקי תשתית (כאמור בסעיף 6) המיישמים בקרות אבטחה מקובלות. עם זאת, לא ניתן להבטיח הגנה מוחלטת מפני כל פגיעה או חדירה בלתי מורשית, והשימוש בשירות כרוך בסיכונים הכרוכים בהעברת מידע ואחסונו באמצעים דיגיטליים.
            </p>
          </Section>

          <Section id="transfer" title="8. העברת מידע אל מחוץ לישראל">
            <p>
              חלק מהספקים המפורטים בסעיף 6 (ובכלל זה שירותי התשתית והדואר האלקטרוני) עשויים לאחסן או לעבד מידע אישי בשרתים הממוקמים מחוץ לגבולות מדינת ישראל. מיקום השרתים בפועל ומדינות/אזורי האחסון הרלוונטיים לחשבון החברה:{" "}
              <TodoFill>לציין את אזור האחסון שנבחר בחשבון Supabase ואת מיקומי השרתים הרלוונטיים של Resend</TodoFill>.
            </p>
          </Section>

          <Section id="retention" title="9. תקופת שמירת המידע">
            <p>
              <TodoFill>
                לציין את מדיניות השמירה והמחיקה בפועל — לרבות האם מידע על פניות (לידים) או הזמנות שלא הבשילו לכדי עסקה, או שבוטלו, נמחק לאחר פרק זמן מוגדר; ומה נעשה במידע של אנשי צוות שגישתם לשירות נחסמה
              </TodoFill>.
            </p>
          </Section>

          <Section id="rights" title="10. זכויות נושא המידע">
            <Clause n="10.1">
              בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, כל נושא מידע זכאי לעיין במידע האישי המוחזק לגביו במאגרי החברה.
            </Clause>
            <Clause n="10.2">
              נושא מידע הסבור כי מידע המוחזק לגביו אינו נכון, אינו שלם, אינו ברור או אינו מעודכן, רשאי לפנות לחברה בבקשה לתיקון המידע או למחיקתו, בהתאם להוראות הדין.
            </Clause>
            <Clause n="10.3">
              מימוש הזכויות האמורות ייעשה באמצעות פנייה לחברה בפרטי הקשר המפורטים בסעיף 11 להלן. החברה תשיב לכל פנייה כאמור בתוך זמן סביר ובהתאם להוראות הדין.
            </Clause>
          </Section>

          <Section id="contact" title="11. יצירת קשר בנושאי פרטיות">
            <p>
              פניות בנושא מדיניות זו, לרבות בקשות לעיון, תיקון או מחיקת מידע אישי, ניתן להפנות אל כתובת הדואר האלקטרוני{" "}
              <a href="mailto:ezpl2026@gmail.com" dir="ltr" className="text-primary hover:underline">ezpl2026@gmail.com</a>.
            </p>
          </Section>

          <Section id="amendments" title="12. שינויים במדיניות זו">
            <p>
              החברה רשאית לעדכן מדיניות זו מעת לעת, לרבות בעקבות שינויים בשירות או בדין החל. נוסחה המעודכן של המדיניות יפורסם בעמוד זה, ותחילת תוקפו ממועד פרסומו.
            </p>
          </Section>
        </div>

        <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">
          עדכון אחרון: <TodoFill>תאריך העדכון בפועל, לעדכן כשהמדיניות תאושר ותפורסם</TodoFill>
        </footer>
      </div>
    </main>
  );
}
