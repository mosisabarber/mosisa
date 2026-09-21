/**
 * Amharic dictionary. Typed as `Dictionary`, so TypeScript fails the build if
 * any key is missing or misspelled relative to `en.ts`.
 *
 * Translation notes:
 *  - `Br` (birr) stays as-is — it is the currency symbol in daily use.
 *  - "min" (minutes) stays as-is in tables/tiles where space is tight.
 *  - Template placeholders like `{name}`, `{language}` must be preserved
 *    verbatim so `formatTemplate()` can substitute them.
 */
import type { Dictionary } from "./en";

const am: Dictionary = {
  meta: {
    siteName: "ሞሲሳ የፀጉር ሳሎን",
    tagline: "ጥሩ አሠራር፣ ታማኝ ክህሎት።",
    city: "ሐረር",
    homeTitle: "ሞሲሳ የፀጉር ሳሎን — በሐረር የተለመዱ አሠራሮች",
    homeDescription:
      "ጥሩ አሠራር፣ ታማኝ ክህሎት። ቀጠሮዎን በሞሲሳ የፀጉር ሳሎን — ሐረር ያስይዙ።",
    homeOgDescription:
      "ባህላዊ የፀጉር ሳሎን ከዘመናዊ አገልግሎት ጋር። ባለሙያዎን ይምረጡ፣ ሰዓትዎን ይምረጡ፣ ወንበርዎ ከመድረስዎ በፊት ተይዟል።",
    homeTwitterDescription:
      "ባህላዊ የፀጉር ሳሎን ከዘመናዊ አገልግሎት ጋር። በአንድ ደቂቃ ውስጥ በመስመር ላይ ይያዙ።",
  },

  nav: {
    home: "መግቢያ",
    services: "አገልግሎቶች",
    barbers: "ባለሙያዎች",
    about: "ስለ እኛ",
    contact: "አግኙን",
    bookNow: "ቀጠሮ ያስይዙ",
    skipToContent: "ወደ ዋና ይዘት ዝለል",
    openMenu: "ምናሌ ክፈት",
    closeMenu: "ምናሌ ዝጋ",
    language: "ቋንቋ",
  },

  common: {
    loading: "በመጫን ላይ…",
    tryAgain: "እንደገና ይሞክሩ",
    backHome: "ወደ መግቢያ ተመለስ",
    minutes: "ደቂቃ",
    birr: "ብር",
    comingSoon: "በቅርቡ",
    openDailySoon: "በየቀኑ ክፍት — ዝርዝሩ በቅርቡ",
    hours: "የሥራ ሰዓት",
    allRightsReserved: "መብቱ በህግ የተጠበቀ ነው።",
    skipToContent: "ወደ ዋናው ይዘት ዝለል",
  },

  days: {
    long: ["እሁድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"],
    short: ["እሁድ", "ሰኞ", "ማክሰ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"],
  },

  home: {
    heroEyebrow: "ሐረር · ኢትዮጵያ",
    heroTitle: "ጥሩ ተመልከት። በሰከንዶች ያስይዙ።",
    heroSubtitle:
      "ባህላዊ የፀጉር ሳሎን ከዘመናዊ አገልግሎት ጋር። ባለሙያዎን ይምረጡ፣ ሰዓትዎን ይምረጡ፣ ወንበርዎ ከመድረስዎ በፊት ተይዟል።",
    heroPrimaryCta: "ቀጠሮ ያስይዙ",
    heroSecondaryCta: "አገልግሎቶቻችንን ይመልከቱ",
    servicesTitle: "ምን እናደርጋለን",
    servicesSubtitle: "ግልጽ ዋጋ፣ ያለ ድንገተኛ ወጪ።",
    servicesCta: "ሁሉም አገልግሎቶች",
    barbersTitle: "ባለሙያዎቹን ያውቁ",
    barbersSubtitle: "የሰለጠኑ እጆች፣ ያለ ሰልፍ መጠበቅ።",
    barbersCta: "ሁሉም ባለሙያዎች",
    howTitle: "እንዴት እንደሚሠራ",
    howSteps: [
      {
        title: "አገልግሎት ይምረጡ",
        body: "የሚፈልጉትን አሠራር ይምረጡ — ዋጋውና የሚወስደው ጊዜ ከዚህ በፊት ይታያል።",
      },
      {
        title: "ባለሙያዎንና ሰዓትዎን ይምረጡ",
        body: "እውነተኛውን ነፃ ጊዜ ያያሉ። ተይዘው ያሉ ሰዓቶች በፍጹም አይታዩም።",
      },
      {
        title: "ይምጡ፣ ይቀመጡ",
        body: "ወንበርዎ ተይዟል። ማረጋገጫ በኢሜይልና በSMS ይደርስዎታል።",
      },
    ],
    ctaTitle: "ለአዲስ አሠራር ተዘጋጅተዋል?",
    ctaBody: "ቀጠሮ መያዝ ከአንድ ደቂቃ ያነሰ ጊዜ ይወስዳል።",
    heroEyebrowShort: "ሐረር · ያለቀጠሮ እና በመስመር ላይ ቀጠሮ",
    heroTitleTop: "ጥሩ ተመልከት።",
    heroTitleBottom: "ታማኝ ሥራ።",
    servicesEmpty: "የአገልግሎት ዝርዝሩ በቅርቡ ይመጣል።",
    barbersEmpty: "የባለሙያዎች መግለጫ በቅርቡ ይመጣል።",
    hoursTitle: "የሥራ ሰዓት",
    hoursUntil: "እስከ {time}",
  },

  services: {
    title: "አገልግሎቶች",
    subtitle: "እያንዳንዱ ዋጋና ጊዜ ከመያዝዎ በፊት ተወስኗል።",
    empty: "የአገልግሎት ዝርዝራችን በመዘመን ላይ ነው። እባክዎ በኋላ ይመልከቱ።",
    bookThis: "ይህን ያስይዙ",
    minutes: "ደቂቃ",
    from: "ከ",
  },

  barbers: {
    title: "ባለሙያዎቻችን",
    subtitle: "ፀጉርዎን የሚቀርጽልዎትን ሰው ይምረጡ።",
    empty: "የቡድናችን ዝርዝር በመዘመን ላይ ነው። እባክዎ በኋላ ይመልከቱ።",
    viewProfile: "መገለጫ ይመልከቱ",
    bookWith: "ከ{name} ጋር ያስይዙ",
    specialties: "ልዩ ክህሎቶች",
    about: "ስለ እሱ",
    backToAll: "ሁሉም ባለሙያዎች",
    notFoundTitle: "ባለሙያው አልተገኘም",
    notFoundBody: "ያ ባለሙያ በቡድናችን ውስጥ የለም፣ ወይም አገናኙ ትክክል አይደለም።",
  },

  about: {
    title: "ስለ ሞሲሳ",
    subtitle: "በሐረር የፀጉር አሠራር።",
    storyTitle: "ታሪካችን",
    storyBody: [
      "ሞሲሳ የፀጉር ሳሎን በሐረር ከተማ ውስጥ ይገኛል። ከመጀመሪያው ቀን ጀምሮ አንድ ነገር ብቻ አላማችን ነው — ጥሩ አሠራር፣ ያለ መጣደፍ።",
      "ብዙ ደንበኞች ስለ ሰዓት መጠበቅ ሲያማርሩ እንሰማለን። ይህን ለመፍታት ቀጠሮ በመስመር ላይ እንዲይዙ አዘጋጅተናል። ሳሎኑ ተጠርቶ እንደሆነ ያያሉ። እውነተኛውን መርሐግብር ያያሉ፣ የሚመችዎን ሰዓት ያስይዛሉ፣ እኛም ዝግጁ ነን።",
    ],
    valuesTitle: "ምን እናምናለን",
    values: [
      {
        title: "ታማኝ ክህሎት",
        body: "የሰለጠኑ እጆችና ትክክለኛ መሣሪያ። አሠራርን አንጣድፍም።",
      },
      {
        title: "ጊዜዎን እናከብራለን",
        body: "ቀጠሮ ማለት ሰዓትዎ ተይዟል ማለት ነው — ግምት አይደለም።",
      },
      {
        title: "ግልጽ ዋጋ",
        body: "እያንዳንዱ አገልግሎት ቋሚ ዋጋና ጊዜ አለው፣ ከመያዝዎ በፊት ይታያል።",
      },
    ],
    cityTitle: "ያግኙን",
    cityBody:
      "እኛ በሐረር፣ ኢትዮጵያ እንገኛለን። በሳምንት ስድስት ቀናት ክፍት ነን — የሥራ ሰዓታችንን ከታች ይመልከቱ።",
  },

  contact: {
    title: "አግኙን",
    subtitle: "ጥያቄ አለዎት፣ ወይም በስልክ ቀጠሮ መያዝ ይፈልጋሉ?",
    phoneTitle: "ስልክ",
    phoneBody: "በሥራ ሰዓት ውስጥ ይደውሉልን።",
    phoneValue: "+251 91 003 4055",
    emailTitle: "ኢሜይል",
    emailBody: "በአንድ የሥራ ቀን ውስጥ እንመልሳለን።",
    emailValue: "mosisabarber@gmail.com",
    addressTitle: "አድራሻ",
    addressBody: "ሞሲሳ የፀጉር ሳሎን፣ ሐረር፣ ኢትዮጵያ",
    hoursTitle: "የሥራ ሰዓት",
    hoursEmpty: "የሥራ ሰዓት በመዘመን ላይ ነው። እባክዎ በኋላ ይመልከቱ።",
  },

  book: {
    title: "ቀጠሮዎን ያስይዙ",
    bookTitle: "ጉብኝትዎን ያስይዙ",
    bookSubtitle:
      "አራት አጭር ደረጃዎች፦ አገልግሎት፣ ባለሙያ፣ ሰዓት እና እንዴት እንደምናገኝዎ። መገለጫ አያስፈልግም — ቀጠሮዎን ለማስተዳደር የግል አገናኝ ያገኛሉ።",
    subtitle: "እውነተኛ ነፃ ጊዜ — ማረጋገጫ መጠበቅ አያስፈልግም።",
    steps: {
      service: "አገልግሎት",
      barber: "ባለሙያ",
      time: "ሰዓት",
      details: "ዝርዝሮዎ",
    },
    chooseService: "አገልግሎት ይምረጡ",
    chooseBarber: "ባለሙያ ይምረጡ",
    chooseTime: "ሰዓት ይምረጡ",
    yourDetails: "ዝርዝሮዎ",
    anyBarber: "ማንኛውም ባለሙያ",
    selectDate: "ቀን ይምረጡ",
    noSlots: "በዚህ ቀን ምንም ሰዓት አልቀረም።",
    pickAnotherDay: "ሌላ ቀን ይሞክሩ።",
    loadingSlots: "ነፃ ጊዜ በመፈተሽ ላይ…",
    name: "ሙሉ ስም",
    namePlaceholder: "ለምሳሌ አህመድ ዩሱፍ",
    phone: "የስልክ ቁጥር",
    phonePlaceholder: "ለምሳሌ 0911234567",
    phoneHint: "ማረጋገጫውን በዚህ ቁጥር በSMS እንልካለን።",
    email: "ኢሜይል (አማራጭ)",
    emailPlaceholder: "ለምሳሌ ahmed@example.com",
    emailHint: "የቀን መርሐግብር ግብዣ ከፈለጉ ኢሜይል ያክሉ።",
    summary: "ቀጠሮዎ",
    selected: "የተመረጠ",
    available: "ይገኛል",
    confirm: "ቀጠሮውን አረጋግጥ",
    booking: "በማስያዝ ላይ…",
    back: "ተመለስ",
    next: "ቀጥል",
    change: "ቀይር",
    errors: {
      nameRequired: "እባክዎ ስምዎን ያስገቡ።",
      phoneRequired: "እባክዎ የስልክ ቁጥርዎን ያስገቡ።",
      phoneInvalid: "ይህ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር አይመስልም።",
      emailInvalid: "ይህ ትክክለኛ የኢሜይል አድራሻ አይመስልም።",
      generic: "የሆነ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
      slotTaken: "ይቅርታ — ያ ሰዓት አሁን ተይዟል። እባክዎ ሌላ ሰዓት ይምረጡ።",
      rateLimitedPhone:
        "አሁን ቀጠሮ ይዘዋል — እባክዎ ከአንድ ደቂቃ በኋላ እንደገና ይሞክሩ።",
      rateLimitedIp: "በጣም ብዙ ሙከራዎች። እባክዎ በኋላ ይሞክሩ።",
      outOfWindow: "ያ ሰዓት ከሚያስይዙበት ጊዜ ውጭ ነው።",
    },
  },

  confirmation: {
    title: "ቀጠሮዎ ተይዟል!",
    body: "ወንበርዎ ተይዟል። ማረጋገጫ ወደ ስልክዎ ልከናል።",
    when: "መቼ",
    with: "ከ",
    service: "አገልግሎት",
    price: "ዋጋ",
    where: "የት",
    manageTitle: "መቀየር ይፈልጋሉ?",
    manageBody:
      "ቀጠሮዎን ለማየት፣ ለመቀየር ወይም ለመሰረዝ ከታች ያለውን አገናኝ ይጠቀሙ። ሚስጥር አድርጉት — አገናኙ ያለው ማንኛውም ሰው ቀጠሮውን ማስተዳደር ይችላል።",
    manageLink: "ይህን ቀጠሮ አስተዳድር",
    copyLink: "አገናኝ ቅዳ",
    copied: "ተቀድቷል",
    addToCalendar: "ወደ ቀን መርሐግብር ጨምር",
    done: "ተጠናቅቋል",
  },

  manage: {
    title: "ቀጠሮዎ",
    subtitle: "መገለጫ አያስፈልግም — ይህ የግል አገናኝ ቀጠሮዎን የሚያስተዳድሩበት መንገድ ነው።",
    needHelpTitle: "ማነጋገር ይፈልጋሉ?",
    needHelpBody:
      "የሆነ ነገር የተሳሳተ ከሆነ፣ ወይም ሊዘገዩ ከሆነ፣ ሳሎኑን ይደውሉና እናስተካክለዋለን።",
    contactShop: "ሳሎኑን ያግኙ",
    loading: "ቀጠሮዎን በመጫን ላይ…",
    notFoundTitle: "ቀጠሮው አልተገኘም",
    notFoundBody:
      "ያ አገናኝ ትክክል አይደለም፣ ወይም ቀጠሮው ተሰርዟል። እባክዎ በማረጋገጫ መልእክትዎ ውስጥ ያለውን አገናኝ ይመልከቱ።",
    confirmed: "ተረጋግጧል",
    cancelled: "ተሰርዟል",
    when: "መቼ",
    time: "ሰዓት",
    customerName: "ስም",
    customerPhone: "ስልክ",
    customerEmail: "ኢሜይል",
    timesInTimezone: "ሰዓታት በ{timezone} ({place}) ተመልክቷል።",
    with: "ከ",
    service: "አገልግሎት",
    price: "ዋጋ",
    where: "የት",
    dur: "የሚወስደው ጊዜ",
    bookAgain: "ሌላ ቀጠሮ ያስይዙ",
    reschedule: "ቀን ቀይር",
    stopRescheduling: "መቀየር አቁም",
    rescheduleTitle: "አዲስ ሰዓት ይምረጡ",
    rescheduleBody: "እውነተኛ ነፃ የሆኑ ሰዓቶች ብቻ ይታያሉ።",
    loadTimesFailed: "ሰዓቶችን መጫን አልተቻለም",
    loadTimesFailedBody: "ነፃ ሰዓቶችን መጫን አልተቻለም።",
    networkError: "የኔትወርክ ችግር — እባክዎ እንደገና ይሞክሩ።",
    movedLate: "ቀጠሮዎ ተቀይሯል። ማሳሰቢያ፦ ይህ ዘግይቶ የተደረገ ለውጥ ነው።",
    movedBody: "ቀጠሮዎ ተቀይሯል። አዲሱን ሰዓት በኢሜይልና በSMS ልከንልዎታል።",
    rescheduleFailed: "ቀን መቀየር አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    cancelTitle: "ይህን ቀጠሮ ይሰረዝ?",
    cancelBody:
      "ይህ ሰዓቱን ለሌላ ሰው ነፃ ያደርገዋል። በማንኛውም ጊዜ እንደገና ማስያዝ ይችላሉ።",
    cancelAction: "ቀጠሮ ሰርዝ",
    rescheduleBody2: "ተመሳሳይ ባለሙያ፣ ተመሳሳይ አገልግሎት — ሌላ ሰዓት ይምረጡ።",
    refreshTimes: "ሰዓታትን አድስ",
    confirmNewTime: "አዲሱን ሰዓት አረጋግጥ",
    summaryLine: "{service} ከ{barber} ጋር በ{date} ሰዓት {time}።",
    cancelConfirm: "አዎ፣ ሰርዘው",
    cancelKeep: "ይቆይ",
    cancelledBody: "ቀጠሮዎ ተሰርዟል። በማንኛውም ጊዜ እንደገና ማስያዝ ይችላሉ።",
    cancelFailed: "መሰረዝ አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    lateWarningTitle: "ይህ ዘግይቶ የተደረገ ለውጥ ነው",
    days: "ቀናት",
    hours: "ሰዓታት",
    minutes: "ደቂቃዎች",
  },

  notFound: {
    title: "ገጹ አልተገኘም",
    body: "ያ ገጽ የለም። ተዛውሮ ወይም ስሙ ተቀይሮ ሊሆን ይችላል።",
  },

  footer: {
    address: "ሐረር፣ ኢትዮጵያ",
    quickLinks: "ፈጣን አገናኞች",
    contactTitle: "ያግኙን",
    rights: "መብቱ በህግ የተጠበቀ ነው።",
  },

  langSwitcher: {
    label: "ቋንቋ",
    switchTo: "ወደ {language} ቀይር",
  },
};

export default am;
