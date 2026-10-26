/* =====================================================================
   Sri R.V. PU College website: settings and content the college controls
   ---------------------------------------------------------------------
   Everything the college may want to change without touching the pages
   lives here. Items marked  CONFIRM  were found online (Instagram,
   Justdial, Google Maps, the old website) and must be checked by the
   college before the site goes live.
   ===================================================================== */
(function () {
  'use strict';
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  window.RV = {
    /* Admission portal that receives every enquiry form on this site.
       On a local computer the portal is expected at http://127.0.0.1:8000. */
    portal: local ? 'http://127.0.0.1:8000' : 'https://rv-admission-portal.vercel.app',
    /* Change to https://admissionportal.srirvpucollege.com once that address is connected. */
    staffPortal: 'https://rv-admission-portal.vercel.app',

    name: 'Sri R.V. PU College',
    legalName: 'Sri R.V. Pre-University College',
    trust: 'Sri R.V. Educational Trust',
    puCode: 'MM0283',                       // CONFIRM: Dept. of PU Education code shown on posters
    intake: '2027–29',                      // batch the site is advertising
    intakeShort: '2027',

    /* Phones. "admissions" is used for every Call button. CONFIRM all four. */
    phones: {
      admissions: { display: '79866 70493', tel: '+917986670493' },
      admissions2: { display: '77959 76868', tel: '+917795976868' },
      office: { display: '91411 96063', tel: '+919141196063' },
      office2: { display: '89713 16868', tel: '+918971316868' }
    },
    /* WhatsApp number (digits only, with 91). CONFIRM which number has WhatsApp. */
    whatsapp: '917986670493',
    whatsappText: 'Hello, I would like PU admission details for 2027–29 at Sri R.V. PU College.',
    email: 'srirvschool_12@yahoo.co.in',    // CONFIRM: a college address (e.g. admissions@srirvpucollege.com) is better

    address: {
      line1: 'RV Gardens, NH-75 Bypass',
      line2: 'PC Halli, Kolar 563101, Karnataka',
      landmark: 'Beside the Yamaha showroom'   // CONFIRM
    },
    geo: { lat: 13.119963, lng: 78.1308761 },
    mapsUrl: 'https://maps.google.com/?cid=14675288093548612363',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=13.119963,78.1308761',
    officeHours: '',                         // CONFIRM, e.g. 'Mon–Sat, 9:00 am – 4:30 pm'. Left empty = hidden.

    /* Google rating of the shared campus listing ("R.V. International School"). CONFIRM before launch. */
    rating: { value: '4.3', count: 193, source: 'Google' },

    social: {
      instagram: 'https://www.instagram.com/sri.r.v.school_and_pucollege/',
      facebook: 'https://www.facebook.com/RVISKL'
    },

    /* Promise shown after a form is sent. Make sure the office can keep it. */
    callbackPromise: 'Our admissions team will call you today.',

    /* Concession slabs by 10th percentage. Leave empty until the college
       publishes them; the concession check then gives a general answer.
       Example: [{ min: 95, text: 'Up to 50% tuition concession' }, { min: 90, text: '...' }] */
    concessionSlabs: [],

    /* Verified results only, with each student's (and parent's) consent. Empty = "to be published" slot.
       Example: { name: 'STUDENT NAME', detail: 'II PUC 2026', score: '98.6%', photo: 'assets/img/results/name.jpg' } */
    results: [],

    /* Answers that depend on the college. null = "please ask us". */
    facts: {
      hostel: null,
      transport: null,
      otherStreams: null,
      fees: null
    }
  };
})();
