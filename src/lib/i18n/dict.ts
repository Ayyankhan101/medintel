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
} satisfies Record<string, Phrase>

export type DictKey = keyof typeof DICT

/** Pure lookup — server-safe, no React. */
export function t(key: DictKey | string, locale: Locale): string {
  const phrase = (DICT as Record<string, Phrase | undefined>)[key]
  if (!phrase) return key
  return phrase[locale] ?? phrase.en
}
