/**
 * Arab Hausa Radio TV - Multi-Language (i18n) Engine (v6)
 * Supported Languages:
 *  - ha: Hausa (Default)
 *  - ar: العربية (Arabic, RTL)
 *  - en: English
 *  - fr: Français (French)
 *  - ff: Fulfulde (Pulaar)
 *  - yo: Yorùbá
 *  - sw: Kiswahili (Swahili)
 */

const translations = {
  ha: {
    dir: 'ltr',
    stationName: 'ARAB HAUSA',
    stationSubtitle: 'إذاعة وتلفزيون عرب هوسا',
    tagline: 'Muryar Al\'umma da Hadin Kan Kasashen Larabawa da Hausa',
    // Bottom Nav
    navHome: 'Gida',
    navRadio: 'Rediyo',
    navTv: 'Talabijin',
    navSchedule: 'Tsari',
    navNews: 'Labarai',
    // Home Page
    welcomeTitle: 'Barka da Zuwa Arab Hausa',
    welcomeSubtitle: 'Kafar watsa shirye-shiryen rediyo da talabijin kai tsaye, labaran duniya da koyar da al\'adun kasashen Larabawa da Hausawa.',
    quickListenBtn: '📻 Fara Sauraron Rediyo Kai Tsaye',
    quickWatchBtn: '📺 Kalli Talabijin Kai Tsaye',
    settingsTitle: '⚙️ Saitunan Manhaja (Settings)',
    langSettingLabel: 'Harshen Manhaja (Language)',
    langSettingSub: 'Zabi harshen da kake so manhajar ta rika aiki da shi',
    audioQualityLabel: 'Ingancin Watsa Sauti (Audio Stream)',
    audioQualitySub: 'Zabi low-data don rage shan katin data',
    adminSettingLabel: 'Gudanarwa (Admin Portal)',
    adminSettingSub: 'Shiga shafin masu gudanarwa don sauya tsari',
    adminLinkText: 'Admin Portal →',
    devTitle: '👩‍💻 Bayanin Mai Kirkira (Developer)',
    devSubtitle: 'Duk wata matsala ko neman hadin gwiwa, a tuntubi Amina kai tsaye a WhatsApp:',
    devRole: 'Babban Injiniyan Manhaja (Lead Developer)',
    devWhatsAppBtn: '💬 WhatsApp: 09090809080',
    // Radio Page
    radioPageTitle: 'Rediyon Arab Hausa Kai Tsaye',
    currentShowTitle: 'Shirin Barka da Safe',
    hostTitle: 'Tare da Amina Hausawi',
    culturalQuote: 'صوت الأمة والتواصل الثقافي',
    onAir: 'LIVE ON AIR',
    lowData: '📶 Low-Data (48k)',
    hqAudio: '🎵 HQ Audio (128k)',
    shareText: '💬 Raba (Share)',
    // TV Page
    tvTitle: 'Talabijin na Arab Hausa (Live TV)',
    tvSubtitle: 'Tashar talabijin mai kawo muku shirye-shirye a kowane lokaci.',
    tvBadge: 'بث مباشر بجودة عالية HD',
    // Schedule Page
    scheduleHeader: 'Tsarin Shirye-shiryen Yau (Schedule)',
    scheduleTimezone: 'Lokacin GMT+1',
    // News Page
    newsHeader: 'Labaran Yau da Dumi-duminsu',
    newsArabicHeader: 'أحدث الأخبار والتقارير',
    liveBadge: 'KAI TSAYE',
    footerDesc: 'Kafar sadarwa mai hada kan al\'ummar Hausawa da kasashen Larabawa ta hanyar ingantaccen labari, al\'adu, ilimi, da nishadi.',
    rightsReserved: 'Dukkan hakkoki a kiyaye.',
    // Install Modal
    installTitle: 'Sauke Manhajar Arab Hausa',
    installArabicTitle: 'إذاعة وتلفزيون عرب هوسا في هاتفك',
    installDesc: 'Saurari rediyo 24/7, kalli talabijin kai tsaye, kuma karanta labaran duniya a ko\'ina ba tare da bata data ba.',
    feature1: '⚡ Sauki & Sauri',
    feature2: '📻 Rediyo 24/7',
    feature3: '📺 Talabijin Kai Tsaye',
    installBtn: 'SANYA MANHAJA (INSTALL)',
    continueBrowser: 'Ci gaba a yanar gizo (Continue)',
    chooseLangTitle: 'Zabi Harshenka',
    chooseLangSub: 'Zabi harshen da kake so manhajar ta rika aiki da shi',
    confirmLangBtn: 'Tabbatar da Zabi (Confirm)'
  },

  ar: {
    dir: 'rtl',
    stationName: 'عرب هوسا',
    stationSubtitle: 'إذاعة وتلفزيون عرب هوسا',
    tagline: 'صوت الأمة وجسر التواصل والتآخي بين العرب وشعوب الهوسا',
    // Bottom Nav
    navHome: 'الرئيسية',
    navRadio: 'الراديو',
    navTv: 'التلفزيون',
    navSchedule: 'البرامج',
    navNews: 'الأخبار',
    // Home Page
    welcomeTitle: 'مرحباً بكم في منصة عرب هوسا',
    welcomeSubtitle: 'المنصة الإعلامية الأولى للبث الإذاعي والتلفزيوني المباشر والأخبار الثقافية المشتركة بين العالم العربي وأفريقيا.',
    quickListenBtn: '📻 الاستماع للبث المباشر للراديو',
    quickWatchBtn: '📺 مشاهدة البث التلفزيوني الحي',
    settingsTitle: '⚙️ إعدادات المنصة (Settings)',
    langSettingLabel: 'لغة العرض (Language)',
    langSettingSub: 'اختر اللغة المناسبة لتصفح المنصة بكل سهولة',
    audioQualityLabel: 'جودة البث الصوتي (Audio Quality)',
    audioQualitySub: 'يمكنك اختيار وضع توفير البيانات لتقليل الاستهلاك',
    adminSettingLabel: 'إدارة المنصة (Admin Portal)',
    adminSettingSub: 'الدخول إلى لوحة التحكم الإدارية لتعديل البيانات',
    adminLinkText: 'لوحة التحكم ←',
    devTitle: '👩‍💻 معلومات المطور (Developer)',
    devSubtitle: 'للدعم الفني والاستفسارات أو الشراكات، تواصل مباشرة مع المطور أمينة:',
    devRole: 'مهندسة البرمجيات والأنظمة (Lead Developer)',
    devWhatsAppBtn: '💬 واتساب: 09090809080',
    // Radio Page
    radioPageTitle: 'بث راديو عرب هوسا الحي المباشر',
    currentShowTitle: 'برنامج صباح الخير',
    hostTitle: 'تقديم: أمينة هوساوي',
    culturalQuote: 'صوت الأمة والتواصل الثقافي',
    onAir: 'بث حي ومباشر',
    lowData: '📶 توفير البيانات (48k)',
    hqAudio: '🎵 جودة عالية (128k)',
    shareText: '💬 مشاركة',
    // TV Page
    tvTitle: 'تلفزيون عرب هوسا المباشر',
    tvSubtitle: 'بث فضائي ورقمي مباشر على مدار الساعة بأحدث التقنيات.',
    tvBadge: 'بث حي عالي الدقة HD',
    // Schedule Page
    scheduleHeader: 'جدول برامج اليوم',
    scheduleTimezone: 'توقيت غرينتش +1',
    // News Page
    newsHeader: 'أحدث الأخبار والتقارير الميدانية',
    newsArabicHeader: 'تغطية إخبارية شاملة',
    liveBadge: 'مباشر',
    footerDesc: 'منصة إعلامية رائدة تهدف إلى تعزيز الروابط الثقافية والأخوية بين العالم العربي وأفريقيا عبر إعلام هادف وموثوق.',
    rightsReserved: 'جميع الحقوق محفوظة.',
    // Install Modal
    installTitle: 'تحميل تطبيق عرب هوسا',
    installArabicTitle: 'إذاعة وتلفزيون عرب هوسا في هاتفك',
    installDesc: 'استمع إلى البث الإذاعي وشاهد البث التلفزيوني المباشر في أي وقت وأي مكان بأقل استهلاك للإنترنت.',
    feature1: '⚡ سرعة وسهولة',
    feature2: '📻 راديو 24/7',
    feature3: '📺 تلفزيون مباشر',
    installBtn: 'تثبيت التطبيق الآن',
    continueBrowser: 'المتابعة عبر المتصفح',
    chooseLangTitle: 'اختر لغة التطبيق',
    chooseLangSub: 'حدد اللغة المفضلة لاستخدام التطبيق',
    confirmLangBtn: 'تأكيد المتابعة'
  },

  en: {
    dir: 'ltr',
    stationName: 'ARAB HAUSA',
    stationSubtitle: 'Arab Hausa Radio & Television',
    tagline: 'The Voice of Unity & Cultural Harmony across Arab and Hausa Nations',
    // Bottom Nav
    navHome: 'Home',
    navRadio: 'Radio',
    navTv: 'Live TV',
    navSchedule: 'Schedule',
    navNews: 'News',
    // Home Page
    welcomeTitle: 'Welcome to Arab Hausa Network',
    welcomeSubtitle: 'The premier live broadcasting platform connecting Hausa communities and the Arab world with 24/7 radio, television, and verified news.',
    quickListenBtn: '📻 Start Listening to Live Radio',
    quickWatchBtn: '📺 Watch Live Television HD',
    settingsTitle: '⚙️ App Settings',
    langSettingLabel: 'Display Language',
    langSettingSub: 'Select your preferred language for the application',
    audioQualityLabel: 'Audio Stream Quality',
    audioQualitySub: 'Switch to Low-Data mode to reduce internet bandwidth',
    adminSettingLabel: 'Administration (Admin Portal)',
    adminSettingSub: 'Access broadcast management and content controls',
    adminLinkText: 'Admin Portal →',
    devTitle: '👩‍💻 Lead Developer Contact',
    devSubtitle: 'For platform support or partnership inquiries, contact developer Amina directly on WhatsApp:',
    devRole: 'Lead Software & Systems Engineer',
    devWhatsAppBtn: '💬 WhatsApp: 09090809080',
    // Radio Page
    radioPageTitle: 'Arab Hausa Live Web Radio',
    currentShowTitle: 'Morning Express Show',
    hostTitle: 'Hosted by Amina Hausawi',
    culturalQuote: 'The Voice of Unity & Cultural Bridge',
    onAir: 'LIVE ON AIR',
    lowData: '📶 Low-Data (48k)',
    hqAudio: '🎵 HQ Audio (128k)',
    shareText: '💬 Share',
    // TV Page
    tvTitle: 'Arab Hausa Live TV',
    tvSubtitle: '24/7 Digital Satellite and Web Television stream in High Definition.',
    tvBadge: 'HD LIVE STREAM',
    // Schedule Page
    scheduleHeader: 'Today\'s Broadcast Schedule',
    scheduleTimezone: 'Time: GMT+1',
    // News Page
    newsHeader: 'Latest News & World Headlines',
    newsArabicHeader: 'Breaking News & Reports',
    liveBadge: 'LIVE',
    footerDesc: 'A premier digital broadcasting network connecting Hausa communities and the Arab world through credible journalism, culture, and entertainment.',
    rightsReserved: 'All rights reserved.',
    // Install Modal
    installTitle: 'Install Arab Hausa App',
    installArabicTitle: 'Live Radio & TV on your Mobile',
    installDesc: 'Enjoy 24/7 low-bandwidth live radio, HD television, and breaking updates directly on your home screen.',
    feature1: '⚡ Ultra Fast',
    feature2: '📻 24/7 Radio',
    feature3: '📺 Live Video TV',
    installBtn: 'INSTALL APP NOW',
    continueBrowser: 'Continue in browser',
    chooseLangTitle: 'Choose Your Language',
    chooseLangSub: 'Select the language you want the application to use',
    confirmLangBtn: 'Confirm & Continue'
  },

  fr: {
    dir: 'ltr',
    stationName: 'ARAB HAUSA',
    stationSubtitle: 'Radio & Télévision Arab Hausa',
    tagline: 'La Voix de l\'Unité et de la Fraternité entre le Monde Arabe et les Haoussas',
    // Bottom Nav
    navHome: 'Accueil',
    navRadio: 'Radio',
    navTv: 'Télévision',
    navSchedule: 'Programmes',
    navNews: 'Actualités',
    // Home Page
    welcomeTitle: 'Bienvenue sur Arab Hausa',
    welcomeSubtitle: 'Plateforme multimédia de diffusion en direct de radio, télévision et actualités reliant les communautés haoussas et le monde arabe.',
    quickListenBtn: '📻 Écouter la Radio en Direct',
    quickWatchBtn: '📺 Regarder la Télévision HD',
    settingsTitle: '⚙️ Paramètres de l\'Application',
    langSettingLabel: 'Langue d\'Affichage',
    langSettingSub: 'Choisissez votre langue préférée pour naviguer',
    audioQualityLabel: 'Qualité du Flux Audio',
    audioQualitySub: 'Activez le mode faible consommation pour économiser vos données',
    adminSettingLabel: 'Administration (Portail Admin)',
    adminSettingSub: 'Accéder au portail de gestion et diffusion',
    adminLinkText: 'Portail Admin →',
    devTitle: '👩‍💻 Développeur Principal',
    devSubtitle: 'Pour tout support technique ou partenariat, contactez Amina sur WhatsApp :',
    devRole: 'Ingénieure Logiciel & Systèmes',
    devWhatsAppBtn: '💬 WhatsApp : 09090809080',
    // Radio Page
    radioPageTitle: 'Radio Arab Hausa en Direct',
    currentShowTitle: 'Émission Matinale Express',
    hostTitle: 'Animé par Amina Hausawi',
    culturalQuote: 'La Voix de l\'Unité et du Dialogue Culturel',
    onAir: 'EN DIRECT',
    lowData: '📶 Éco-données (48k)',
    hqAudio: '🎵 Audio HQ (128k)',
    shareText: '💬 Partager',
    // TV Page
    tvTitle: 'Télévision Arab Hausa en Direct',
    tvSubtitle: 'Diffusion satellite et numérique en haute définition 24h/24.',
    tvBadge: 'DIRECT HD',
    // Schedule Page
    scheduleHeader: 'Grille des Programmes d\'Aujourd\'hui',
    scheduleTimezone: 'Heure : GMT+1',
    // News Page
    newsHeader: 'Dernières Nouvelles & Monde',
    newsArabicHeader: 'Flash Infos & Rapports',
    liveBadge: 'EN DIRECT',
    footerDesc: 'Réseau de radiodiffusion reliant les communautés haoussas et le monde arabe par une information rigoureuse et culturelle.',
    rightsReserved: 'Tous droits réservés.',
    // Install Modal
    installTitle: 'Installer l\'Application Arab Hausa',
    installArabicTitle: 'Radio & TV sur votre Téléphone',
    installDesc: 'Profitez de la radio en direct 24/7 et de la télévision HD sans épuiser votre forfait internet.',
    feature1: '⚡ Rapide & Léger',
    feature2: '📻 Radio 24h/24',
    feature3: '📺 TV en Direct',
    installBtn: 'INSTALLER L\'APPLICATION',
    continueBrowser: 'Continuer dans le navigateur',
    chooseLangTitle: 'Choisissez Votre Langue',
    chooseLangSub: 'Sélectionnez la langue d\'affichage de l\'application',
    confirmLangBtn: 'Confirmer la Langue'
  },

  ff: {
    dir: 'ltr',
    stationName: 'ARAB HAUSA',
    stationSubtitle: 'Rajo e Telewisiyon Arab Hausa',
    tagline: 'Sawtu Renndo e Dental Leyɗeele Larabankooɓe e Hausankoore',
    // Bottom Nav
    navHome: 'Galle',
    navRadio: 'Rajo',
    navTv: 'Tele',
    navSchedule: 'Kewol',
    navNews: 'Kabaaruuji',
    // Home Page
    welcomeTitle: 'A Jaɓɓaama to Arab Hausa',
    welcomeSubtitle: 'Nokku caɗeele rajo e telewisiyon e kabaaruuji winndere jokkondirɗi Fulɓe, Hausa e Larabankooɓe.',
    quickListenBtn: '📻 Fuɗɗo Heɗaade Rajo Direct',
    quickWatchBtn: '📺 Ndaar Telewisiyon HD',
    settingsTitle: '⚙️ Teeltagol Manhaja (Settings)',
    langSettingLabel: 'Ɗemngal Manhaja (Language)',
    langSettingSub: 'Suɓo ɗemngal ngal njiɗ-ɗaa manhaja ndee gollirde',
    audioQualityLabel: 'Mbaydi Sawtu Rajo',
    audioQualitySub: 'Suɓo low-data ngam ustude data e katin maa',
    adminSettingLabel: 'Toɓɓere Sarwoowo (Admin)',
    adminSettingSub: 'Naatu to hello ardiiɓe ngam waylude kabaaruuji',
    adminLinkText: 'Hello Sarwoowo →',
    devTitle: '👩‍💻 Mahoowo Manhaja (Developer)',
    devSubtitle: 'So aɗa sokli ballal walla jokkondiral, jokkondir e Amina e WhatsApp:',
    devRole: 'Biyoowo e Mahoowo Manhaja (Lead Developer)',
    devWhatsAppBtn: '💬 WhatsApp: 09090809080',
    // Radio Page
    radioPageTitle: 'Rajo Arab Hausa Direct',
    currentShowTitle: 'Yeewtere Jam e Balɗe',
    hostTitle: 'E gardagol Amina Hausawi',
    culturalQuote: 'Sawtu Renndo e Pinal',
    onAir: 'ƊO E WEEƁA',
    lowData: '📶 Low-Data (48k)',
    hqAudio: '🎵 HQ Audio (128k)',
    shareText: '💬 Yeewnude',
    // TV Page
    tvTitle: 'Tele Arab Hausa Direct',
    tvSubtitle: 'Bannge wideyoo telewisiyon ñalnde kala e jemma.',
    tvBadge: 'BETH DIRECT HD',
    // Schedule Page
    scheduleHeader: 'Kewol Porogaraamuuji Hande',
    scheduleTimezone: 'Waktu: GMT+1',
    // News Page
    newsHeader: 'Kabaaruuji Kesol Hande',
    newsArabicHeader: 'Kabaaruuji Winndere',
    liveBadge: 'DIRECT',
    footerDesc: 'Nokku kabaaruuji jokkondirɗo leƴƴi Hausa e Larabankooɓe e nder jam e pinal.',
    rightsReserved: 'Hakkeeji fof ko reenaaɗi.',
    // Install Modal
    installTitle: 'Aawto Manhaja Arab Hausa',
    installArabicTitle: 'Rajo e Tele e nder cinndel maa',
    installDesc: 'Heɗo rajo 24/7, ndaaru tele to kow e kow tawa data heewaani.',
    feature1: '⚡ Yaawre & Weeɓre',
    feature2: '📻 Rajo 24/7',
    feature3: '📺 Telewisiyon Direct',
    installBtn: 'AAWTO MANHAJA (INSTALL)',
    continueBrowser: 'Jokku e lowre ndee',
    chooseLangTitle: 'Suɓo Ɗemngal Maa',
    chooseLangSub: 'Suɓo ɗemngal ngal njiɗ-ɗaa manhaja ndee gollirde',
    confirmLangBtn: 'Tabitinde Suɓngo'
  },

  yo: {
    dir: 'ltr',
    stationName: 'ARAB HAUSA',
    stationSubtitle: 'Redio ati Tẹlifisiọnu Arab Hausa',
    tagline: 'Ohùn Isọdọkan ati Ibaraṣepọ laarin Larubawa ati Hausa',
    // Bottom Nav
    navHome: 'Ilé',
    navRadio: 'Rédíò',
    navTv: 'Tẹlifíṣọ̀n',
    navSchedule: 'Ètò',
    navNews: 'Ìròyìn',
    // Home Page
    welcomeTitle: 'Ẹ Káàbọ̀ sí Arab Hausa',
    welcomeSubtitle: 'Ibùdó ìgbéròyìn rédíò àti tẹlifíṣọ̀n tààrà, ìròyìn àgbáyé àti àṣà láàárín àwọn Lárúbáwá àti Hausa.',
    quickListenBtn: '📻 Bẹ̀rẹ̀ sí gbọ́ Rédíò Tààrà',
    quickWatchBtn: '📺 Wo Tẹlifíṣọ̀n Tààrà HD',
    settingsTitle: '⚙️ Ètò Manhaja (Settings)',
    langSettingLabel: 'Èdè Ìfihàn (Language)',
    langSettingSub: 'Yan èdè tí o fẹ́ láti fi lo manhaja yìí',
    audioQualityLabel: 'Dídára Ohùn (Audio Stream)',
    audioQualitySub: 'Yan low-data láti dín lílo data rẹ kù',
    adminSettingLabel: 'Àwọn Olùdarí (Admin)',
    adminSettingSub: 'Wọlé sí ibùdó ìṣàkóso láti ṣàtúnṣe',
    adminLinkText: 'Ibùdó Admin →',
    devTitle: '👩‍💻 Olùgbéejáde (Developer)',
    devSubtitle: 'Fún ìbéèrè tàbí àjọṣepọ̀, kàn sí Amina lórí WhatsApp tààrà:',
    devRole: 'Olórí Oníṣẹ́ Àtòjọ Ètò (Lead Developer)',
    devWhatsAppBtn: '💬 WhatsApp: 09090809080',
    // Radio Page
    radioPageTitle: 'Rédíò Arab Hausa Tààrà',
    currentShowTitle: 'Ètò Ìròyìn Òwúrọ̀',
    hostTitle: 'Pẹ̀lú Amina Hausawi',
    culturalQuote: 'Ohùn Isọdọkan ati Asa',
    onAir: 'LÓRÍ AFẸ́FẸ́',
    lowData: '📶 Low-Data (48k)',
    hqAudio: '🎵 HQ Audio (128k)',
    shareText: '💬 Pín (Share)',
    // TV Page
    tvTitle: 'Tẹlifíṣọ̀n Arab Hausa Tààrà',
    tvSubtitle: 'Ìgbéhàn tẹlifíṣọ̀n alárinrin lórí ẹ̀rọ ayélujára ní gbogbo ìgbà.',
    tvBadge: 'BÍ Ó TI Ń LỌ HD',
    // Schedule Page
    scheduleHeader: 'Àkókò Àwọn Ètò Òní',
    scheduleTimezone: 'Àkókò: GMT+1',
    // News Page
    newsHeader: 'Ìròyìn Tuntun Òní',
    newsArabicHeader: 'Ìròyìn Àgbáyé',
    liveBadge: 'TÀÀRÀ',
    footerDesc: 'Nẹtiwọọki ìgbéròyìn tó ń so àwọn ará Hausa àti Lárúbáwá pọ̀ nípasẹ̀ ìròyìn tòótọ́, àṣà àti ẹ̀kọ́.',
    rightsReserved: 'Gbogbo ẹ̀tọ́ ni a kò fàyè gbà láti yípadà.',
    // Install Modal
    installTitle: 'Gba Manhaja Arab Hausa Sí Orí Fóònù',
    installArabicTitle: 'Rédíò àti Tẹlifíṣọ̀n lórí fóònù rẹ',
    installDesc: 'Gbọ́ rédíò 24/7, wo tẹlifíṣọ̀n ní tààrà pẹ̀lú data díẹ̀.',
    feature1: '⚡ Yára & Rọrùn',
    feature2: '📻 Rédíò 24/7',
    feature3: '📺 Tẹlifíṣọ̀n Tààrà',
    installBtn: 'GBA MANHAJA (INSTALL)',
    continueBrowser: 'Tẹ̀síwájú lórí ẹ̀rọ aṣàwárí',
    chooseLangTitle: 'Yan Èdè Rẹ',
    chooseLangSub: 'Yan èdè tí o fẹ́ kí ojú-òpó yìí fi hàn',
    confirmLangBtn: 'Fìdí Èdè Múlẹ̀'
  },

  sw: {
    dir: 'ltr',
    stationName: 'ARAB HAUSA',
    stationSubtitle: 'Redio na Runinga ya Arab Hausa',
    tagline: 'Sauti ya Umoja na Mshikamano wa Kitamaduni kati ya Waarabu na Wahausa',
    // Bottom Nav
    navHome: 'Nyumbani',
    navRadio: 'Redio',
    navTv: 'Runinga',
    navSchedule: 'Ratiba',
    navNews: 'Habari',
    // Home Page
    welcomeTitle: 'Karibu kwenye Arab Hausa Network',
    welcomeSubtitle: 'Jukwaa kuu la matangazo ya moja kwa moja ya redio, televisheni na habari zinazounganisha jamii za Hausa na nchi za Kiarabu.',
    quickListenBtn: '📻 Anza Kusikiliza Redio Moja kwa Moja',
    quickWatchBtn: '📺 Tazama Runinga Moja kwa Moja HD',
    settingsTitle: '⚙️ Mipangilio ya Programu (Settings)',
    langSettingLabel: 'Lugha ya Programu (Language)',
    langSettingSub: 'Chagua lugha unayopendelea kuitumia kwenye programu hii',
    audioQualityLabel: 'Ubora wa Sauti (Audio Stream)',
    audioQualitySub: 'Badilisha hadi hali ya Low-Data ili kuokoa data ya intaneti',
    adminSettingLabel: 'Usimamizi (Admin Portal)',
    adminSettingSub: 'Ingia kwenye ukurasa wa wasimamizi kufanya mabadiliko',
    adminLinkText: 'Mlango wa Admin →',
    devTitle: '👩‍💻 Maelezo ya Msanidi Programu',
    devSubtitle: 'Kwa usaidizi au maswali, wasiliana na msanidi Amina moja kwa moja kupitia WhatsApp:',
    devRole: 'Mhandisi Kiongozi wa Mifumo (Lead Developer)',
    devWhatsAppBtn: '💬 WhatsApp: 09090809080',
    // Radio Page
    radioPageTitle: 'Redio ya Moja kwa Moja ya Arab Hausa',
    currentShowTitle: 'Kipindi cha Asubuhi Njema',
    hostTitle: 'Kinaendeshwa na Amina Hausawi',
    culturalQuote: 'Sauti ya Umoja na Utamaduni',
    onAir: 'HEWANI SASA',
    lowData: '📶 Low-Data (48k)',
    hqAudio: '🎵 HQ Audio (128k)',
    shareText: '💬 Shiriki (Share)',
    // TV Page
    tvTitle: 'Runinga ya Arab Hausa Moja kwa Moja',
    tvSubtitle: 'Matangazo ya kidijitali ya satelaiti ya saa 24 kwa ubora wa juu wa HD.',
    tvBadge: 'MATANGAZO YA MOJA KWA MOJA HD',
    // Schedule Page
    scheduleHeader: 'Ratiba ya Vipindi vya Leo',
    scheduleTimezone: 'Muda: GMT+1',
    // News Page
    newsHeader: 'Habari Mpya na Zinazovuma Leo',
    newsArabicHeader: 'Taarifa za Habari za Kimataifa',
    liveBadge: 'MOJA KWA MOJA',
    footerDesc: 'Mtandao wa utangazaji unaounganisha jamii za Hausa na ulimwengu wa Kiarabu kupitia habari za kuaminika na utamaduni.',
    rightsReserved: 'Haki zote zimehifadhiwa.',
    // Install Modal
    installTitle: 'Sakinisha Programu ya Arab Hausa',
    installArabicTitle: 'Redio na Runinga kwenye Simu Yako',
    installDesc: 'Furahia redio ya saa 24 na televisheni ya HD bila kutumia data nyingi.',
    feature1: '⚡ Haraka & Rahisi',
    feature2: '📻 Redio Saa 24',
    feature3: '📺 Runinga Moja kwa Moja',
    installBtn: 'SAKINISHA PROGRAMU (INSTALL)',
    continueBrowser: 'Endelea kwenye kivinjari',
    chooseLangTitle: 'Chagua Lugha Yako',
    chooseLangSub: 'Chagua lugha unayotaka programu itumie',
    confirmLangBtn: 'Thibitisha Lugha'
  }
};

let currentLang = localStorage.getItem('arab_hausa_lang') || 'ha';

function setLanguage(lang) {
  if (!translations[lang]) lang = 'ha';
  currentLang = lang;
  localStorage.setItem('arab_hausa_lang', lang);

  const t = translations[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = t.dir || 'ltr';

  // Update translatable elements
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });

  // Update language buttons inside Home Settings
  document.querySelectorAll('.lang-btn-option').forEach((btn) => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update language cards inside Install/Selection Modal
  document.querySelectorAll('.lang-card').forEach((card) => {
    if (card.getAttribute('data-lang') === lang) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Hook up language options on Home Settings page
  document.querySelectorAll('.lang-btn-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
    });
  });

  // Hook up language cards in Modal
  document.querySelectorAll('.lang-card').forEach((card) => {
    card.addEventListener('click', () => {
      const lang = card.getAttribute('data-lang');
      setLanguage(lang);
    });
  });

  setLanguage(currentLang);
});

window.setLanguage = setLanguage;
window.currentLang = currentLang;
