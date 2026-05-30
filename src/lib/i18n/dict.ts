/**
 * Tiny translation dictionary — keys are stable English shorthand, values are
 * { en, ur } strings. No external lib: we ship strings, a cookie, and a
 * `useT()` hook. Full next-intl migration is a follow-up; this gets us a
 * demo-able RTL Urdu toggle today.
 *
 * Convention:
 *   - Keys grouped by surface (landing.*, auth.*, intake.*, common.*).
 *   - Each value: { en: string; ur: string }.
 *   - Missing key → fall back to the key itself.
 *
 * Other supported transcribe languages (ps/pa/sd) inherit `en` strings until
 * they're translated — the UI still works, the transcript still goes through
 * Whisper in the user's chosen language.
 */

export type Locale = 'en' | 'ur'

export const DEFAULT_LOCALE: Locale = 'en'

export type Phrase = { en: string; ur: string }

export const DICT = {
  // shared chrome
  'common.signIn':         { en: 'Sign in',                 ur: 'لاگ ان کریں' },
  'common.signOut':        { en: 'Sign out',                ur: 'لاگ آؤٹ' },
  'common.signUp':         { en: 'Sign up',                 ur: 'اکاؤنٹ بنائیں' },
  'common.continue':       { en: 'Continue',                ur: 'جاری رکھیں' },
  'common.cancel':         { en: 'Cancel',                  ur: 'منسوخ' },
  'common.next':           { en: 'Next',                    ur: 'آگے' },
  'common.back':           { en: 'Back',                    ur: 'واپس' },
  'common.email':          { en: 'Email',                   ur: 'ای میل' },
  'common.password':       { en: 'Password',                ur: 'پاس ورڈ' },
  'common.phone':          { en: 'Phone',                   ur: 'فون' },
  'common.save':           { en: 'Save',                    ur: 'محفوظ کریں' },
  'common.loading':        { en: 'Loading…',                ur: 'لوڈ ہو رہا ہے…' },
  'common.error':          { en: 'Something went wrong',    ur: 'کچھ غلط ہو گیا' },
  'common.retry':          { en: 'Try again',               ur: 'دوبارہ کوشش کریں' },
  'common.langToggle':     { en: 'اردو',                    ur: 'English' },

  // landing
  'landing.hero.title':    { en: 'Voice-first telemedicine for Pakistan',
                             ur: 'پاکستان کے لیے آواز سے چلنے والی ٹیلی میڈیسن' },
  'landing.hero.sub':      { en: 'Describe your symptoms in Urdu, Pashto, Punjabi, Sindhi, or English. We route you to the right specialist within minutes.',
                             ur: 'اپنے علامات اردو، پشتو، پنجابی، سندھی یا انگریزی میں بتائیں۔ چند منٹوں میں مناسب ماہر سے رابطہ کرائیں گے۔' },
  'landing.cta.start':     { en: 'Start a consultation',    ur: 'مشاورت شروع کریں' },
  'landing.cta.doctor':    { en: "I'm a doctor",            ur: 'میں ڈاکٹر ہوں' },

  // auth
  'auth.login.title':      { en: 'Sign in to MedIntel',     ur: 'میڈ انٹیل میں لاگ ان' },
  'auth.login.kicker':     { en: 'Welcome back',            ur: 'خوش آمدید' },
  'auth.login.sub':        { en: 'Use the email and password from your account.',
                             ur: 'اپنے اکاؤنٹ کا ای میل اور پاس ورڈ استعمال کریں۔' },
  'auth.login.forgot':     { en: 'Forgot password?',        ur: 'پاس ورڈ بھول گئے؟' },
  'auth.login.noAccount':  { en: 'No account?',             ur: 'اکاؤنٹ نہیں ہے؟' },
  'auth.login.createOne':  { en: 'Create one',              ur: 'بنائیں' },

  // intake
  'intake.title':          { en: 'Tell us what is wrong',   ur: 'اپنی تکلیف بتائیں' },
  'intake.sub':            { en: 'You can speak in Urdu or type. Our AI triages and finds the right doctor.',
                             ur: 'آپ اردو میں بول سکتے ہیں یا ٹائپ کر سکتے ہیں۔ ہماری AI آپ کی تکلیف کا اندازہ لگا کر مناسب ڈاکٹر تجویز کرے گی۔' },
  'intake.record':         { en: 'Hold to record',          ur: 'ریکارڈ کرنے کے لیے دبا کر رکھیں' },
  'intake.typeInstead':    { en: 'Or type instead',         ur: 'یا ٹائپ کریں' },
  'intake.analyze':        { en: 'Analyze',                 ur: 'تجزیہ کریں' },
  'intake.analyzing':      { en: 'Analyzing…',              ur: 'تجزیہ ہو رہا ہے…' },
  'intake.lang.label':     { en: 'Speaking language',       ur: 'بولنے کی زبان' },
  'intake.lang.ur':        { en: 'Urdu',                    ur: 'اردو' },
  'intake.lang.ps':        { en: 'Pashto',                  ur: 'پشتو' },
  'intake.lang.pa':        { en: 'Punjabi',                 ur: 'پنجابی' },
  'intake.lang.sd':        { en: 'Sindhi',                  ur: 'سندھی' },
  'intake.lang.en':        { en: 'English',                 ur: 'انگریزی' },
  'intake.emergencyCall':  { en: 'For emergencies call 1122 or 115.',
                             ur: 'ہنگامی صورتحال میں 1122 یا 115 پر کال کریں۔' },

  // booking
  'booking.title':         { en: 'Choose a doctor',         ur: 'ڈاکٹر منتخب کریں' },
  'booking.fee':           { en: 'Fee',                     ur: 'فیس' },
  'booking.book':          { en: 'Book',                    ur: 'بک کریں' },
  'booking.payNow':        { en: 'Pay to confirm',          ur: 'تصدیق کے لیے ادائیگی' },
  'booking.scheduledFor':  { en: 'Scheduled for',           ur: 'وقت' },
  'booking.cancel':        { en: 'Cancel booking',          ur: 'بکنگ منسوخ' },
  'booking.reschedule':    { en: 'Reschedule',              ur: 'وقت تبدیل' },

  // consultation
  'consult.join':          { en: 'Join consultation',       ur: 'مشاورت میں شامل ہوں' },
  'consult.consent':       { en: 'I consent to this session being recorded for safety and quality.',
                             ur: 'میں اس بات سے متفق ہوں کہ یہ سیشن حفاظت اور معیار کے لیے ریکارڈ کیا جائے۔' },
  'consult.muted':         { en: 'Muted',                   ur: 'خاموش' },
  'consult.endCall':       { en: 'End call',                ur: 'کال ختم' },

  // records / history
  'history.title':         { en: 'Your medical history',    ur: 'آپ کی طبی تاریخ' },
  'history.empty':         { en: 'No records yet',          ur: 'ابھی کوئی ریکارڈ نہیں' },
  'history.upload':        { en: 'Upload a record',         ur: 'ریکارڈ اپ لوڈ کریں' },
  'history.download':      { en: 'Download',                ur: 'ڈاؤن لوڈ' },

  // notifications
  'notif.title':           { en: 'Notifications',           ur: 'اطلاعات' },
  'notif.empty':           { en: "You're all caught up",    ur: 'سب کچھ پڑھ لیا' },
  'notif.markAllRead':     { en: 'Mark all read',           ur: 'سب پڑھا ہوا نشان زد کریں' },

  // install prompt
  'install.title':         { en: 'Install MedIntel',        ur: 'میڈ انٹیل انسٹال کریں' },
  'install.body':          { en: 'Add to your home screen for one-tap access and offline support.',
                             ur: 'ایک ٹیپ سے کھولنے اور آف لائن استعمال کے لیے ہوم سکرین میں شامل کریں۔' },
  'install.install':       { en: 'Install',                 ur: 'انسٹال' },
  'install.dismiss':       { en: 'Not now',                 ur: 'ابھی نہیں' },
} satisfies Record<string, Phrase>

export type DictKey = keyof typeof DICT

/** Pure lookup — server-safe, no React. */
export function t(key: DictKey | string, locale: Locale): string {
  const phrase = (DICT as Record<string, Phrase | undefined>)[key]
  if (!phrase) return key
  return phrase[locale] ?? phrase.en
}
