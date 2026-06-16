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
  'intake.lang.label':     { en: 'Speaking language',       ur: 'بولنے کی زبان' },
  'intake.lang.ur':        { en: 'Urdu',                    ur: 'اردو' },
  'intake.lang.ps':        { en: 'Pashto',                  ur: 'پشتو' },
  'intake.lang.pa':        { en: 'Punjabi',                 ur: 'پنجابی' },
  'intake.lang.sd':        { en: 'Sindhi',                  ur: 'سندھی' },
  'intake.lang.en':        { en: 'English',                 ur: 'انگریزی' },
  'intake.emergencyCall':  { en: 'For emergencies call 1122 or 115.',
                             ur: 'ہنگامی صورتحال میں 1122 یا 115 پر کال کریں۔' },
  'intake.mode.speak':     { en: 'Speak',                   ur: 'بولیں' },
  'intake.mode.speakSub':  { en: 'Urdu یا English',          ur: 'اردو یا انگریزی' },
  'intake.mode.type':      { en: 'Type',                    ur: 'ٹائپ کریں' },
  'intake.mode.typeSub':   { en: 'Write symptoms',          ur: 'علامات لکھیں' },
  'intake.mode.typeOffline': { en: 'Works offline',         ur: 'آف لائن کام کرتا ہے' },
  'intake.textPlaceholder': { en: "e.g. I've had a severe headache for 2 days with nausea and sensitivity to light…",
                              ur: 'مثال: مجھے 2 دن سے شدید سر درد ہے، متلی اور روشنی سے حساسیت…' },
  'intake.textPlaceholderUr': { en: "e.g. I've had a severe headache…",
                                ur: 'مثال: مجھے 2 دن سے شدید سر درد…' },
  'intake.analyzeBtn':     { en: 'Analyze symptoms',        ur: 'علامات کا تجزیہ کریں' },
  'intake.analyzingBtn':   { en: 'Analyzing…',              ur: 'تجزیہ ہو رہا ہے…' },
  'intake.transcribing':   { en: 'Transcribing your audio…', ur: 'آڈیو لکھی جا رہی ہے…' },
  'intake.analyzing':      { en: 'Analyzing your symptoms…', ur: 'علامات کا تجزیہ…' },
  'intake.matching':       { en: 'Finding the best doctors…', ur: 'بہترین ڈاکٹر تلاش کیے جا رہے ہیں…' },
  'intake.followup':       { en: 'Preparing follow-up questions…', ur: 'اضافی سوالات تیار کیے جا رہے ہیں…' },
  'intake.noConnection':   { en: 'No internet connection',  ur: 'انٹرنیٹ کنکشن نہیں' },
  'intake.offlineMsg':     { en: 'You can record and type symptoms — they\'ll upload automatically when you reconnect.',
                             ur: 'آپ علامات ریکارڈ یا ٹائپ کر سکتے ہیں — دوبارہ کنیکٹ ہونے پر خودکار اپ لوڈ ہو جائیں گے۔' },
  'intake.queued':         { en: '{n} recording(s) saved — will upload when connected.',
                             ur: '{n} ریکارڈنگ محفوظ — کنیکٹ ہونے پر اپ لوڈ ہو گی۔' },
  'intake.uploading':      { en: 'Uploading your saved recording…',
                             ur: 'محفوظ ریکارڈنگ اپ لوڈ ہو رہی ہے…' },
  'intake.voice.label':    { en: 'Voice recording',         ur: 'آواز کی ریکارڈنگ' },
  'intake.text.label':     { en: 'Describe your symptoms',  ur: 'اپنی علامات بیان کریں' },
  'intake.followup.title': { en: 'A few more details',      ur: 'کچھ مزید تفصیلات' },
  'intake.followup.round': { en: 'Round {n}/{max} — help us refine the assessment',
                             ur: 'مرحلہ {n}/{max} — تشخیص بہتر بنانے میں مدد کریں' },
  'intake.followup.placeholder': { en: 'Your answer…',      ur: 'آپ کا جواب…' },
  'intake.followup.submit':{ en: 'Submit answers',          ur: 'جوابات جمع کروائیں' },
  'intake.followup.reanalyzing': { en: 'Re-analyzing…',     ur: 'دوبارہ تجزیہ…' },
  'intake.describe.heading': { en: 'How are you feeling?',  ur: 'آپ کیسا محسوس کر رہے ہیں؟' },
  'intake.describe.sub':   { en: 'Describe your symptoms — we\'ll find the right doctor for you.',
                             ur: 'اپنی علامات بتائیں — ہم آپ کے لیے صحیح ڈاکٹر تلاش کریں گے۔' },
  'intake.describe.subAlt': { en: 'Speak or type naturally — our AI understands Urdu, Pashto, Punjabi, Sindhi, and English',
                              ur: 'قدرتی طور پر بولیں یا ٹائپ کریں — ہماری AI اردو، پشتو، پنجابی، سندھی اور انگریزی سمجھتی ہے' },
  'intake.step.describe':  { en: 'Describe',                ur: 'بیان کریں' },
  'intake.step.review':    { en: 'Review',                  ur: 'جائزہ لیں' },
  'intake.step.doctor':    { en: 'Doctor',                  ur: 'ڈاکٹر' },
  'intake.step1':          { en: 'Step 1',                  ur: 'مرحلہ ۱' },
  'intake.step2':          { en: 'Step 2',                  ur: 'مرحلہ ۲' },
  'intake.doctor.title':   { en: 'Best {dept} doctors',     ur: 'بہترین {dept} ڈاکٹر' },
  'intake.doctor.sub':     { en: 'KYD-verified specialists ranked by match score.',
                             ur: 'KYD تصدیق شدہ ماہرین میچ اسکور کے مطابق۔' },
  'intake.doctor.empty':   { en: 'No verified {dept} specialists found yet.',
                             ur: 'ابھی تک تصدیق شدہ {dept} ماہرین نہیں ملے۔' },
  'intake.doctor.emptySub': { en: 'Try browsing all doctors or visit a nearby clinic instead.',
                              ur: 'تمام ڈاکٹر دیکھیں یا قریبی کلینک جائیں۔' },
  'intake.doctor.seeAll':  { en: 'See all {dept} doctors',  ur: 'تمام {dept} ڈاکٹر دیکھیں' },
  'intake.hospital.title': { en: 'Nearest hospital or clinic', ur: 'قریب ترین ہسپتال یا کلینک' },
  'intake.hospital.sub':   { en: 'In-person care near you, in case you\'d rather walk in.',
                             ur: 'آپ کے قریب ذاتی نگہداشت، اگر آپ خود جانا چاہیں۔' },
  'intake.clear':          { en: 'Clear this session',      ur: 'یہ سیشن صاف کریں' },
  'intake.startOver':      { en: 'Start over',              ur: 'دوبارہ شروع کریں' },
  'intake.nextDoctor':     { en: 'Next: Find doctors',      ur: 'آگے: ڈاکٹر تلاش کریں' },
  'intake.backReview':     { en: 'Back to review',          ur: 'جائزے پر واپس جائیں' },

  // Navbar
  'nav.consult':    { en: 'Consult',             ur: 'مشورہ' },
  'nav.onlineNow':  { en: 'Online now',          ur: 'اب آن لائن' },
  'nav.history':    { en: 'History',             ur: 'ہسٹری' },
  'nav.resources':  { en: 'Resources',           ur: 'وسائل' },
  'nav.dashboard':  { en: 'Dashboard',           ur: 'ڈیش بورڈ' },
  'nav.patients':   { en: 'Patients',            ur: 'مریض' },
  'nav.analytics':  { en: 'Analytics',           ur: 'تجزیات' },
  'nav.settings':   { en: 'Settings',            ur: 'سیٹنگز' },
  'nav.overview':   { en: 'Overview',            ur: 'جائزہ' },
  'nav.metrics':    { en: 'Metrics',             ur: 'میٹرکس' },
  'nav.research':   { en: 'Research',            ur: 'تحقیق' },
  'nav.doctors':    { en: 'Doctors',             ur: 'ڈاکٹر' },
  'nav.audit':      { en: 'Audit',               ur: 'آڈٹ' },
  'nav.signOut':    { en: 'Sign out',            ur: 'لاگ آؤٹ' },
  'nav.signIn':     { en: 'Sign in',             ur: 'لاگ ان' },
  'nav.getStarted': { en: 'Get started',         ur: 'شروع کریں' },
  'nav.profile':    { en: 'Profile',             ur: 'پروفائل' },

  // Online now
  'online.kicker':   { en: 'Consult Now',                   ur: 'اب مشورہ کریں' },
  'online.title':    { en: 'Doctors available right now',   ur: 'اس وقت دستیاب ڈاکٹر' },
  'online.sub':      { en: 'Pick a doctor, pay, and start a video call within minutes.',
                        ur: 'ڈاکٹر منتخب کریں، ادائیگی کریں، اور منٹوں میں ویڈیو کال شروع کریں۔' },
  'online.empty':    { en: 'No doctors online right now. Try scheduling instead.',
                        ur: 'اس وقت کوئی ڈاکٹر آن لائن نہیں۔ شیڈول کرنے کی کوشش کریں۔' },
  'online.doctor':   { en: 'Doctor',             ur: 'ڈاکٹر' },
  'online.verified': { en: 'Verified',           ur: 'تصدیق شدہ' },
  'online.yExp':     { en: '{y}y exp',           ur: '{y} سال کا تجربہ' },
  'online.consultBtn': { en: 'Consult Now',      ur: 'اب مشورہ کریں' },
  'online.bookingBtn': { en: 'Booking…',         ur: 'بکنگ ہو رہی ہے…' },
  'online.failLoad': { en: 'Failed to load',     ur: 'لوڈ نہیں ہو سکا' },
  'online.failBook': { en: 'Failed to book',     ur: 'بکنگ نہیں ہو سکی' },

  // History
  'history.kicker':  { en: 'Medical vault',             ur: 'میڈیکل والٹ' },
  'history.title':   { en: 'My medical history',        ur: 'میری طبی تاریخ' },
  'history.recordsCount': { en: '{n} records in your vault', ur: '{n} ریکارڈ آپ کے والٹ میں' },
  'history.cancel':  { en: 'Cancel',                    ur: 'منسوخ' },
  'history.addRecord': { en: 'Add record',              ur: 'ریکارڈ شامل کریں' },
  'history.past':    { en: 'Past consultations',        ur: 'گزشتہ مشاورتیں' },
  'history.rx':      { en: 'Rx',                        ur: 'نسخہ' },
  'history.claim':   { en: 'Claim',                     ur: 'دعوی' },
  'history.reschedule': { en: 'Reschedule',              ur: 'دوبارہ شیڈول' },
  'history.cancelAppt': { en: 'Cancel',                  ur: 'منسوخ' },
  'history.yourRating': { en: 'Your rating:',            ur: 'آپ کی درجہ بندی:' },
  'history.confirm': { en: 'Confirm',                    ur: 'تصدیق' },
  'history.loadMore': { en: 'Load more',                 ur: 'مزید لوڈ کریں' },
  'history.typeAll':  { en: 'All',                       ur: 'تمام' },
  'history.typePrescriptions': { en: 'Prescriptions',    ur: 'نسخے' },
  'history.typeLabReports': { en: 'Lab reports',         ur: 'لیب رپورٹس' },
  'history.typeSurgeries': { en: 'Surgeries',            ur: 'سرجریاں' },
  'history.typeAllergies': { en: 'Allergies',            ur: 'الرجیاں' },
  'history.typeChronicMeds': { en: 'Chronic meds',       ur: 'دائمی ادویات' },
  'history.cancelConfirm': { en: 'Cancel this appointment? Held payment is refunded automatically.',
                             ur: 'یہ اپوائنٹمنٹ منسوخ کریں؟ ادائیگی خودکار واپس ہو جائے گی۔' },
  'history.cancelReason': { en: 'Reason for cancellation (optional, helps us improve):',
                           ur: 'منسوخی کی وجہ (اختیاری، بہتری میں مدد ملتی ہے):' },
  'history.consultation': { en: 'Consultation',          ur: 'مشاورت' },

  // Medical Timeline
  'timeline.empty':   { en: 'No records yet',            ur: 'ابھی کوئی ریکارڈ نہیں' },
  'timeline.emptySub': { en: 'Upload your first medical document to get started',
                         ur: 'شروع کرنے کے لیے اپنی پہلی میڈیکل دستاویز اپ لوڈ کریں' },
  'timeline.prescription': { en: 'Prescription',          ur: 'نسخہ' },
  'timeline.labReport': { en: 'Lab Report',              ur: 'لیب رپورٹ' },
  'timeline.surgery': { en: 'Surgery',                   ur: 'سرجری' },
  'timeline.allergy': { en: 'Allergy',                   ur: 'الرجی' },
  'timeline.chronicMed': { en: 'Chronic Med',            ur: 'دائمی دوا' },
  'timeline.note':    { en: 'Note',                      ur: 'نوٹ' },

  // Record Uploader
  'upload.title':       { en: 'Upload Medical Document',     ur: 'میڈیکل دستاویز اپ لوڈ کریں' },
  'upload.docType':     { en: 'Document Type',               ur: 'دستاویز کی قسم' },
  'upload.titleLabel':  { en: 'Title / Description',         ur: 'عنوان / تفصیل' },
  'upload.titlePlaceholder': { en: 'e.g. Blood Pressure Prescription 2024',
                               ur: 'مثال: بلڈ پریشر کا نسخہ 2024' },
  'upload.fileLabel':   { en: 'Document Photo or PDF',       ur: 'دستاویز کی تصویر یا PDF' },
  'upload.fileHint':    { en: 'JPG, PNG, WEBP or PDF — max 10MB',
                          ur: 'JPG, PNG, WEBP یا PDF — زیادہ سے زیادہ 10MB' },
  'upload.submit':      { en: 'Upload to vault',             ur: 'والٹ میں اپ لوڈ کریں' },
  'upload.uploading':   { en: 'Uploading document…',         ur: 'دستاویز اپ لوڈ ہو رہی ہے…' },
  'upload.saved':       { en: '✓ Document saved to your medical vault.',
                          ur: '✓ دستاویز آپ کے میڈیکل والٹ میں محفوظ ہو گئی۔' },
  'upload.typePrescription': { en: 'Prescription',           ur: 'نسخہ' },
  'upload.typeLabReport': { en: 'Lab Report',                ur: 'لیب رپورٹ' },
  'upload.typeSurgery': { en: 'Surgery Record',              ur: 'سرجری ریکارڈ' },
  'upload.typeAllergy': { en: 'Allergy',                     ur: 'الرجی' },
  'upload.typeChronicMed': { en: 'Chronic Medication',       ur: 'دائمی دوا' },

  // Resources
  'resources.kicker': { en: 'Nearby help',               ur: 'قریبی مدد' },
  'resources.title':  { en: 'Medical resources',          ur: 'طبی وسائل' },
  'resources.sub':    { en: 'Find the nearest hospitals, pharmacies, oxygen cylinders, and emergency equipment near you.',
                        ur: 'اپنے قریب ہسپتال، فارمیسی، آکسیجن سلنڈر اور ہنگامی سامان تلاش کریں۔' },

  // Resource Finder
  'finder.all':        { en: 'All Resources',             ur: 'تمام وسائل' },
  'finder.hospitals':  { en: 'Hospitals',                 ur: 'ہسپتال' },
  'finder.pharmacies': { en: 'Pharmacies',                ur: 'فارمیسیاں' },
  'finder.oxygen':     { en: 'Oxygen Cylinders',          ur: 'آکسیجن سلنڈر' },
  'finder.ventilators': { en: 'Ventilators',              ur: 'وینٹی لیٹر' },
  'finder.bloodBanks': { en: 'Blood Banks',               ur: 'بلڈ بینک' },
  'finder.ambulances': { en: 'Ambulances',                ur: 'ایمبولینسز' },
  'finder.locDenied':  { en: 'Location access denied — showing all resources',
                         ur: 'مقام کی اجازت نہیں دی گئی — تمام وسائل دکھائے جا رہے ہیں' },
  'finder.locUnsupported': { en: 'Geolocation not supported', ur: 'جیولوکیشن معاون نہیں' },
  'finder.loading':    { en: 'Finding resources near you…', ur: 'آپ کے قریب وسائل تلاش کیے جا رہے ہیں…' },
  'finder.empty':      { en: 'No resources found. Try a different filter or expand your area.',
                         ur: 'کوئی وسائل نہیں ملے۔ مختلف فلٹر آزمائیں یا علاقہ بڑھائیں۔' },
  'finder.available':  { en: 'Available',                 ur: 'دستیاب' },
  'finder.unavailable': { en: 'Unavailable',              ur: 'غیر دستیاب' },
  'finder.directions': { en: 'Get Directions',            ur: 'ہدایات حاصل کریں' },

  // Nearby Hospitals
  'nearby.geoUnavailable': { en: 'Geolocation not available on this device.',
                             ur: 'اس ڈیوائس پر جیولوکیشن دستیاب نہیں۔' },
  'nearby.permDenied': { en: 'Location permission denied. We can\'t show nearby places without it.',
                         ur: 'مقام کی اجازت سے انکار۔ اس کے بغیر قریبی مقامات نہیں دکھائے جا سکتے۔' },
  'nearby.unableLocate': { en: 'Could not get your location.',
                           ur: 'آپ کا مقام حاصل نہیں کیا جا سکا۔' },
  'nearby.withinKm':  { en: 'Within {n} km of {coords} · OpenStreetMap',
                        ur: '{n} کلومیٹر کے اندر {coords} · OpenStreetMap' },
  'nearby.locating':  { en: 'Locating you…',              ur: 'آپ کا مقام معلوم کیا جا رہا ہے…' },
  'nearby.finding':   { en: 'Finding places…',            ur: 'مقامات تلاش کیے جا رہے ہیں…' },
  'nearby.gettingLoc': { en: 'Getting your location…',    ur: 'آپ کا مقام حاصل کیا جا رہا ہے…' },
  'nearby.notFound':  { en: 'No hospitals, clinics, or pharmacies found within {n} km of {coords}.',
                        ur: '{n} کلومیٹر کے اندر {coords} کوئی ہسپتال، کلینک یا فارمیسی نہیں ملا۔' },
  'nearby.coarseEstimate': { en: 'If that location looks wrong, your browser may have used a coarse IP-based estimate (common on desktop or VPN). Try opening this page on your phone with location services enabled.',
                             ur: 'اگر وہ مقام غلط لگتا ہے تو آپ کے براؤزر نے IP-based تخمینہ استعمال کیا ہو سکتا ہے۔ اپنے فون پر لوکیشن سروسز کے ساتھ یہ صفحہ کھولنے کی کوشش کریں۔' },
  'nearby.directions': { en: 'Directions',                ur: 'ہدایات' },

  // Nearby Dialog
  'nearby.dialogTrigger': { en: 'Find nearest hospital or clinic',
                           ur: 'قریب ترین ہسپتال یا کلینک تلاش کریں' },
  'nearby.dialogTitle': { en: 'Nearby hospitals & clinics',
                          ur: 'قریبی ہسپتال اور کلینک' },
  'nearby.dialogDesc': { en: 'Real-time results within 5 km of your current location, from OpenStreetMap.',
                         ur: 'آپ کے موجودہ مقام سے 5 کلومیٹر کے اندر حقیقی وقت کے نتائج، OpenStreetMap سے۔' },
  'nearby.youAreHere': { en: 'You are here',               ur: 'آپ یہاں ہیں' },

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
