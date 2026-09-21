/**
 * English dictionary — the canonical shape. `am.ts` is typed as `Dictionary`,
 * so a missing or misspelled Amharic key is a compile error.
 *
 * Note: deliberately NOT `as const` — literal string types would make every
 * translation in `am.ts` a type error. Structural (widened) types give us
 * key-completeness checking without pinning the English wording.
 */
const en = {
  meta: {
    siteName: "Mosisa Barber Shop",
    tagline: "Classic cuts, honest craft.",
    city: "Harar",
    homeTitle: "Mosisa Barber Shop — Classic Cuts in Harar",
    homeDescription:
      "Classic cuts, honest craft. Book your next appointment at Mosisa Barber Shop — Harar.",
    homeOgDescription:
      "A traditional barbershop with modern service. Pick your barber, pick your time, and your chair is reserved before you arrive.",
    homeTwitterDescription:
      "A traditional barbershop with modern service. Book online in under a minute.",
  },

  nav: {
    home: "Home",
    services: "Services",
    barbers: "Barbers",
    about: "About",
    contact: "Contact",
    bookNow: "Book Now",
    skipToContent: "Skip to main content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
  },

  common: {
    loading: "Loading…",
    tryAgain: "Try again",
    backHome: "Back to home",
    minutes: "min",
    birr: "Br",
    comingSoon: "Coming soon",
    openDailySoon: "Open daily — details soon",
    hours: "Hours",
    allRightsReserved: "All rights reserved.",
    skipToContent: "Skip to content",
  },

  days: {
    long: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },

  home: {
    heroEyebrow: "Harar · Ethiopia",
    heroTitle: "Look sharp. Book in seconds.",
    heroSubtitle:
      "A traditional barbershop with modern service. Pick your barber, pick your time, and your chair is reserved before you arrive.",
    heroPrimaryCta: "Book an appointment",
    heroSecondaryCta: "See our services",
    servicesTitle: "What we do",
    servicesSubtitle: "Straightforward pricing, no surprises.",
    servicesCta: "All services",
    barbersTitle: "Meet the barbers",
    barbersSubtitle: "Skilled hands, no waiting in line.",
    barbersCta: "All barbers",
    howTitle: "How it works",
    howSteps: [
      {
        title: "Choose a service",
        body: "Pick the cut or shave you want — price and duration are shown up front.",
      },
      {
        title: "Pick your barber and time",
        body: "See real availability. Slots already taken are never shown.",
      },
      {
        title: "Show up, sit down",
        body: "Your chair is reserved. You get a confirmation by email and SMS.",
      },
    ],
    ctaTitle: "Ready for a fresh cut?",
    ctaBody: "Booking takes less than a minute.",
    heroEyebrowShort: "Harar · Walk-ins & online booking",
    heroTitleTop: "Classic cuts.",
    heroTitleBottom: "Honest craft.",
    servicesEmpty: "Service menu coming soon.",
    barbersEmpty: "Barber profiles coming soon.",
    hoursTitle: "Opening hours",
    hoursUntil: "until {time}",
  },

  services: {
    title: "Services",
    subtitle: "Every price and duration is fixed before you book.",
    empty: "Our service list is being updated. Please check back shortly.",
    bookThis: "Book this",
    minutes: "min",
    from: "from",
  },

  barbers: {
    title: "Our barbers",
    subtitle: "Choose the person who cuts your hair.",
    empty: "Our team list is being updated. Please check back shortly.",
    viewProfile: "View profile",
    bookWith: "Book with {name}",
    specialties: "Specialties",
    about: "About",
    backToAll: "All barbers",
    notFoundTitle: "Barber not found",
    notFoundBody: "That barber is not on our team, or the link is out of date.",
  },

  about: {
    title: "About us",
    subtitle: "A neighbourhood barbershop in Harar.",
    storyTitle: "Our story",
    storyBody: [
      "Mosisa Barber Shop has been cutting hair in Harar for years. We keep the craft traditional — a sharp blade, a steady hand, and a chair that is ready when you walk in.",
      "What is different is how you get that chair. No phone tag, no guessing whether the shop is busy. You see the real schedule, you book the time that suits you, and we are ready for you.",
    ],
    valuesTitle: "What we stand for",
    values: [
      {
        title: "Honest craft",
        body: "Skilled hands and proper tools. We do not rush a cut.",
      },
      {
        title: "Your time respected",
        body: "Booking means your slot is held — not a rough estimate.",
      },
      {
        title: "Clear pricing",
        body: "Every service has a fixed price and duration, shown before you book.",
      },
    ],
    cityTitle: "Find us",
    cityBody:
      "We are in Harar, Ethiopia. Open six days a week — see our opening hours below.",
  },

  contact: {
    title: "Contact",
    subtitle: "Questions, or want to book by phone?",
    phoneTitle: "Phone",
    phoneBody: "Call us during opening hours.",
    phoneValue: "+251 91 003 4055",
    emailTitle: "Email",
    emailBody: "We reply within one working day.",
    emailValue: "mosisabarber@gmail.com",
    addressTitle: "Address",
    addressBody: "Mosisa Barber Shop, Harar, Ethiopia",
    hoursTitle: "Opening hours",
    hoursEmpty: "Opening hours are being updated. Please check back shortly.",
  },

  book: {
    title: "Book your appointment",
    bookTitle: "Book your visit",
    bookSubtitle:
      "Four quick steps: service, barber, time, and how to reach you. No account needed — you'll get a private link to manage your appointment.",
    subtitle: "Real availability — no waiting to be confirmed.",
    steps: {
      service: "Service",
      barber: "Barber",
      time: "Time",
      details: "Your details",
    },
    chooseService: "Choose a service",
    chooseBarber: "Choose a barber",
    chooseTime: "Choose a time",
    yourDetails: "Your details",
    anyBarber: "Any barber",
    selectDate: "Select a date",
    noSlots: "No times left on this day.",
    pickAnotherDay: "Try another day.",
    loadingSlots: "Checking availability…",
    name: "Full name",
    namePlaceholder: "e.g. Ahmed Yusuf",
    phone: "Phone number",
    phonePlaceholder: "e.g. 0911234567",
    phoneHint: "We send your confirmation by SMS to this number.",
    email: "Email (optional)",
    emailPlaceholder: "e.g. ahmed@example.com",
    emailHint: "Add an email if you want a calendar invite.",
    summary: "Your booking",
    selected: "Selected",
    available: "Available",
    confirm: "Confirm booking",
    booking: "Booking…",
    back: "Back",
    next: "Next",
    change: "Change",
    errors: {
      nameRequired: "Please enter your name.",
      phoneRequired: "Please enter your phone number.",
      phoneInvalid: "That does not look like a valid Ethiopian phone number.",
      emailInvalid: "That does not look like a valid email address.",
      generic: "Something went wrong. Please try again.",
      slotTaken: "Sorry — that slot was just taken. Please pick another time.",
      rateLimitedPhone:
        "You just made a booking — please wait a minute before booking again.",
      rateLimitedIp: "Too many booking attempts. Please try again later.",
      outOfWindow: "That time is outside the bookable window.",
    },
  },

  confirmation: {
    title: "You are booked!",
    body: "Your chair is reserved. We have sent a confirmation to your phone.",
    when: "When",
    with: "With",
    service: "Service",
    price: "Price",
    where: "Where",
    manageTitle: "Need to change it?",
    manageBody:
      "Use the link below to view, reschedule, or cancel your appointment. Keep it private — anyone with the link can manage this booking.",
    manageLink: "Manage this appointment",
    copyLink: "Copy link",
    copied: "Copied",
    addToCalendar: "Add to calendar",
    done: "Done",
  },

  manage: {
    title: "Your appointment",
    subtitle:
      "No account needed — this private link is how you manage your booking.",
    needHelpTitle: "Need to talk to us?",
    needHelpBody:
      "If anything looks wrong, or you're running late, call the shop and we'll sort it out.",
    contactShop: "Contact the shop",
    loading: "Loading your appointment…",
    notFoundTitle: "Appointment not found",
    notFoundBody:
      "That link is not valid, or the appointment has been removed. Please check the link in your confirmation message.",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    when: "When",
    time: "Time",
    customerName: "Name",
    customerPhone: "Phone",
    customerEmail: "Email",
    timesInTimezone: "Times shown in {timezone} ({place}).",
    with: "With",
    service: "Service",
    price: "Price",
    where: "Where",
    dur: "Duration",
    bookAgain: "Book another appointment",
    reschedule: "Reschedule",
    stopRescheduling: "Stop rescheduling",
    rescheduleTitle: "Pick a new time",
    rescheduleBody: "Only genuinely free slots are shown.",
    loadTimesFailed: "Could not load times",
    loadTimesFailedBody: "Could not load available times.",
    networkError: "Network problem — please try again.",
    movedLate: "Your appointment was moved. Note: this was a late change.",
    movedBody: "Your appointment was moved. We've emailed and texted the new time.",
    rescheduleFailed: "Could not reschedule. Please try again.",
    cancelTitle: "Cancel this appointment?",
    cancelAction: "Cancel appointment",
    cancelBody:
      "This frees the slot for someone else. You can book again at any time.",
    rescheduleBody2: "Same barber, same service — choose a different slot.",
    refreshTimes: "Refresh times",
    confirmNewTime: "Confirm new time",
    summaryLine: "{service} with {barber} on {date} at {time}.",
    cancelConfirm: "Yes, cancel it",
    cancelKeep: "Keep it",
    cancelledBody: "Your appointment is cancelled. You can book again any time.",
    cancelFailed: "Could not cancel. Please try again.",
    lateWarningTitle: "This is a late change",
    days: "days",
    hours: "hours",
    minutes: "minutes",
  },

  notFound: {
    title: "Page not found",
    body: "That page does not exist. It may have been moved or renamed.",
  },

  footer: {
    address: "Harar, Ethiopia",
    quickLinks: "Quick links",
    contactTitle: "Get in touch",
    rights: "All rights reserved.",
  },

  langSwitcher: {
    label: "Language",
    switchTo: "Switch to {language}",
  },
};

export type Dictionary = typeof en;
export default en;
