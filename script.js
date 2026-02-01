/* =============================
   Globals
   ============================= */

let currentCalendar = "gregorian"; // default

// moment-hijri detection (added)
function hasMomentHijri() {
  return (typeof moment === "function") && (typeof moment().iYear === "function");
}

// Decide which Hijri calendar we can actually use on this browser (Intl path only)
function detectHijriCalendar() {
  try {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { year: "numeric", timeZone: "UTC" });
    const cal = fmt.resolvedOptions().calendar;
    if (cal === "islamic-umalqura") return "islamic-umalqura";
  } catch {}
  // Fallback that works on iPhone Safari (but it's NOT Umm al-Qura)
  return "islamic-civil";
}

const HIJRI_CAL = detectHijriCalendar(); // "islamic-umalqura" or "islamic-civil"

/* =============================
   Init
   ============================= */

window.addEventListener("load", () => {
  // Ensure currentCalendar matches the checked radio on load (important on mobile browsers)
  const checked = document.querySelector('input[name="calendarType"]:checked');
  if (checked) currentCalendar = checked.value;

  // Radio change
  const radios = document.querySelectorAll('input[name="calendarType"]');
  radios.forEach(r => {
    r.addEventListener("change", () => {
      currentCalendar = r.value;
      initSelectsForCurrentCalendar(true);
    });
  });

  initSelectsForCurrentCalendar(false);

  document.getElementById("month").addEventListener("change", updateDays);
  document.getElementById("year").addEventListener("change", updateDays);
});

function initSelectsForCurrentCalendar(resetToDefaults) {
  fillYears(resetToDefaults);
  fillMonths(resetToDefaults);
  updateDays();

  const result = document.getElementById("result");
  const details = document.getElementById("details");
  if (result) result.textContent = "";
  if (details) { details.style.display = "none"; details.innerHTML = ""; }
}

/* =============================
   Month names
   ============================= */

const GREG_MONTHS_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const GREG_MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
];

const HIJRI_MONTHS_AR = [
  "محرم","صفر","ربيع الأول","ربيع الآخر",
  "جمادى الأولى","جمادى الآخرة","رجب","شعبان",
  "رمضان","شوال","ذو القعدة","ذو الحجة"
];

const HIJRI_MONTHS_EN = [
  "Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani",
  "Jumada al-Ula","Jumada al-Akhirah","Rajab","Sha'ban",
  "Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"
];

function getMonthLabel(monthNumber) {
  const lang = document.documentElement.lang;

  if (currentCalendar === "hijri") {
    const name = (lang === "ar")
      ? HIJRI_MONTHS_AR[monthNumber - 1]
      : HIJRI_MONTHS_EN[monthNumber - 1];
    return `${monthNumber} - ${name}`;
  } else {
    const name = (lang === "ar")
      ? GREG_MONTHS_AR[monthNumber - 1]
      : GREG_MONTHS_EN[monthNumber - 1];
    return `${monthNumber} - ${name}`;
  }
}

/* =============================
   Select fills
   ============================= */

function fillYears(resetToDefaults) {
  const yearSel = document.getElementById("year");
  yearSel.innerHTML = "";

  const today = new Date();

  if (currentCalendar === "gregorian") {
    const currentYear = today.getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
      yearSel.innerHTML += `<option value="${y}">${y}</option>`;
    }
    if (resetToDefaults) yearSel.value = String(currentYear);
  } else {
    // Hijri year range from today's hijri (prefer moment-hijri for iPhone)
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const h = getHijriPartsFromGregorian(todayUTC);

    // Safety: if for any reason hijri parts unavailable, fallback to gregorian list
    if (!h || !Number.isFinite(h.y)) {
      const currentYear = today.getFullYear();
      for (let y = currentYear; y >= 1900; y--) {
        yearSel.innerHTML += `<option value="${y}">${y}</option>`;
      }
      if (resetToDefaults) yearSel.value = String(currentYear);
      return;
    }

    const currentHijriYear = h.y;

    for (let y = currentHijriYear; y >= 1300; y--) {
      yearSel.innerHTML += `<option value="${y}">${y}</option>`;
    }
    if (resetToDefaults) yearSel.value = String(currentHijriYear);
  }
}

function fillMonths(resetToDefaults) {
  const monthSel = document.getElementById("month");
  monthSel.innerHTML = "";

  for (let m = 1; m <= 12; m++) {
    monthSel.innerHTML += `<option value="${m}">${getMonthLabel(m)}</option>`;
  }

  if (resetToDefaults) monthSel.value = "1";
}

function updateDays() {
  const daySel = document.getElementById("day");
  const month = parseInt(document.getElementById("month").value, 10);
  const year = parseInt(document.getElementById("year").value, 10);

  const prev = parseInt(daySel.value || "1", 10);
  daySel.innerHTML = "";

  const dim = (currentCalendar === "gregorian")
    ? getDaysInGregorianMonth(month, year)
    : getDaysInHijriMonth(month, year);

  for (let d = 1; d <= dim; d++) {
    daySel.innerHTML += `<option value="${d}">${d}</option>`;
  }

  daySel.value = String(Math.min(prev, dim));
}

function getDaysInGregorianMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/* =============================
   Hijri conversion
   - Prefer moment-hijri (Umm al-Qura) when available (fixes iPhone Safari)
   - Otherwise Intl:
       Umm al-Qura if available
       else islamic-civil (works on iPhone but not Umm al-Qura)
   ============================= */

function getHijriPartsFromGregorian(gDateUTC) {
  // 1) Best path: moment-hijri (Umm al-Qura)
  if (hasMomentHijri()) {
    // moment uses local time; gDateUTC is at UTC midnight in our usage.
    // Using moment(gDateUTC) is fine; we only read iYear/iMonth/iDate.
    const mm = moment(gDateUTC);
    return { y: mm.iYear(), m: mm.iMonth() + 1, d: mm.iDate() };
  }

  // 2) Fallback path: Intl
  const locale = `ar-SA-u-ca-${HIJRI_CAL}-nu-latn`;
  const fmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC"
  });

  const parts = fmt.formatToParts(gDateUTC);
  const y = parseInt(parts.find(p => p.type === "year")?.value, 10);
  const m = parseInt(parts.find(p => p.type === "month")?.value, 10);
  const d = parseInt(parts.find(p => p.type === "day")?.value, 10);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

// Convert Hijri y/m/d -> Gregorian UTC Date
function hijriToGregorian(hy, hm, hd) {
  // 1) Best path: moment-hijri (Umm al-Qura)
  if (hasMomentHijri()) {
    // Strict parse: iYYYY-iM-iD
    const mm = moment(`${hy}-${hm}-${hd}`, "iYYYY-iM-iD", true);
    if (!mm.isValid()) return null;

    const g = mm.toDate(); // local Date
    // Return UTC midnight to avoid timezone shifts
    return new Date(Date.UTC(g.getFullYear(), g.getMonth(), g.getDate()));
  }

  // 2) Intl brute force (uses HIJRI_CAL)
  const estimateGy = hy + 579;
  const start = new Date(Date.UTC(estimateGy - 1, 0, 1));

  for (let i = 0; i < 1100; i++) { // widen a bit for safety
    const candidate = new Date(start.getTime() + i * 86400000);
    const h = getHijriPartsFromGregorian(candidate);
    if (h && h.y === hy && h.m === hm && h.d === hd) {
      return candidate; // UTC date
    }
  }
  return null;
}

function getDaysInHijriMonth(hm, hy) {
  // 1) Best: moment-hijri
  if (hasMomentHijri()) {
    const start = moment(`${hy}-${hm}-1`, "iYYYY-iM-iD", true);
    if (!start.isValid()) return 30;
    const next = start.clone().add(1, "iMonth");
    // difference in days
    return next.diff(start, "days");
  }

  // 2) Intl fallback
  const g1 = hijriToGregorian(hy, hm, 1);
  if (!g1) return 30;

  let nextM = hm + 1;
  let nextY = hy;
  if (nextM === 13) { nextM = 1; nextY++; }

  const g2 = hijriToGregorian(nextY, nextM, 1);
  if (!g2) return 30;

  return Math.round((g2.getTime() - g1.getTime()) / 86400000);
}

/* =============================
   Formatting helpers
   ============================= */

function formatWeekday(dateObj) {
  const lang = document.documentElement.lang;
  const locale = (lang === "ar") ? "ar" : "en";
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(dateObj);
}

function formatGregorianFull(dateObj) {
  const lang = document.documentElement.lang;
  const locale = (lang === "ar") ? "ar" : "en";

  const txt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(dateObj);

  return (lang === "ar") ? (txt + " م") : txt;
}

function formatHijriManual(parts, lang) {
  // safety against any weird values
  const mIdx = Number.isFinite(parts?.m) ? (parts.m - 1) : -1;
  const name = (mIdx >= 0 && mIdx < 12)
    ? ((lang === "ar") ? HIJRI_MONTHS_AR[mIdx] : HIJRI_MONTHS_EN[mIdx])
    : ((lang === "ar") ? "شهر" : "Month");

  const suffix = (lang === "ar") ? " هـ" : " AH";

  return (lang === "ar")
    ? `${parts.d} ${name} ${parts.y}${suffix}`
    : `${name} ${parts.d}, ${parts.y}${suffix}`;
}

function daysBetweenDatesUTC(dateA, dateB) {
  const a = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const b = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((b - a) / 86400000);
}

/* =============================
   Age calculation + extra details
   ============================= */

function calculateAge() {
  // Always re-sync with radio (mobile browsers sometimes desync globals)
  const checked = document.querySelector('input[name="calendarType"]:checked');
  if (checked) currentCalendar = checked.value;

  const d = parseInt(document.getElementById("day").value, 10);
  const m = parseInt(document.getElementById("month").value, 10);
  const y = parseInt(document.getElementById("year").value, 10);

  const result = document.getElementById("result");
  const details = document.getElementById("details");
  const lang = document.documentElement.lang;

  const hijriLabel = hasMomentHijri()
    ? ((lang === "ar") ? "أم القرى" : "Umm al-Qura")
    : ((HIJRI_CAL === "islamic-umalqura")
        ? ((lang === "ar") ? "أم القرى" : "Umm al-Qura")
        : ((lang === "ar") ? "مدني" : "Civil"));

  const text = {
    ar: {
      years: "سنة", months: "شهر", days: "يوم",
      detailsHeader: "معلومات إضافية",
      birthWeekday: "يوم الميلاد",
      birthGreg: "تاريخ الميلاد (ميلادي)",
      birthHijri: `تاريخ الميلاد (هجري - ${hijriLabel})`,
      nextAnniv: "المتبقي لذكرى الميلاد القادمة",
      annivDate: "تاريخ الذكرى القادمة",
    },
    en: {
      years: "years", months: "months", days: "days",
      detailsHeader: "Additional details",
      birthWeekday: "Birth weekday",
      birthGreg: "Birthdate (Gregorian)",
      birthHijri: `Birthdate (Hijri - ${hijriLabel})`,
      nextAnniv: "Days until next birthday",
      annivDate: "Next birthday date",
    }
  };

  const sep = (lang === "ar") ? "، " : ", ";

  // 1) Convert selected date to Gregorian Date (local)
  let birthGregorian = null;

  if (currentCalendar === "gregorian") {
    birthGregorian = new Date(y, m - 1, d);
  } else {
    const gUTC = hijriToGregorian(y, m, d);
    if (!gUTC) {
      result.textContent = (lang === "ar") ? "تعذر تحويل التاريخ الهجري." : "Could not convert Hijri date.";
      if (details) { details.style.display = "none"; details.innerHTML = ""; }
      return;
    }
    birthGregorian = new Date(gUTC.getUTCFullYear(), gUTC.getUTCMonth(), gUTC.getUTCDate());
  }

  if (isNaN(birthGregorian.getTime())) {
    result.textContent = (lang === "ar") ? "تاريخ غير صالح." : "Invalid date.";
    if (details) { details.style.display = "none"; details.innerHTML = ""; }
    return;
  }

  const today = new Date();
  if (birthGregorian > today) {
    result.textContent = (lang === "ar") ? "تاريخ الميلاد في المستقبل." : "Birthdate is in the future.";
    if (details) { details.style.display = "none"; details.innerHTML = ""; }
    return;
  }

  // 2) Gregorian age parts
  let years = today.getFullYear() - birthGregorian.getFullYear();
  let months = today.getMonth() - birthGregorian.getMonth();
  let days = today.getDate() - birthGregorian.getDate();

  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  // If Hijri mode: show Hijri age parts
  if (currentCalendar === "hijri") {
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const birthUTC = new Date(Date.UTC(birthGregorian.getFullYear(), birthGregorian.getMonth(), birthGregorian.getDate()));

    const todayH = getHijriPartsFromGregorian(todayUTC);
    const birthH = getHijriPartsFromGregorian(birthUTC);

    if (!todayH || !birthH) {
      result.textContent = (lang === "ar") ? "تعذر حساب التاريخ الهجري على هذا المتصفح." : "Could not compute Hijri on this browser.";
      if (details) { details.style.display = "none"; details.innerHTML = ""; }
      return;
    }

    const ageH = diffHijriDates(birthH, todayH);
    result.textContent = `${ageH.years} ${text[lang].years}${sep}${ageH.months} ${text[lang].months}${sep}${ageH.days} ${text[lang].days}`;
  } else {
    result.textContent = `${years} ${text[lang].years}${sep}${months} ${text[lang].months}${sep}${days} ${text[lang].days}`;
  }

  // 3) Extra details table
  if (details) {
    const birthWeekdayStr = formatWeekday(birthGregorian);
    const birthGregStr = formatGregorianFull(birthGregorian);

    const birthUTC = new Date(Date.UTC(birthGregorian.getFullYear(), birthGregorian.getMonth(), birthGregorian.getDate()));
    const hParts = getHijriPartsFromGregorian(birthUTC);

    const birthHijriStr = hParts
      ? `${birthWeekdayStr}, ${formatHijriManual(hParts, lang)}`
      : ((lang === "ar") ? "غير متاح على هذا المتصفح" : "Not available on this browser");

    // Next anniversary (Gregorian or Hijri)
    let nextAnnivDate = null;

    if (currentCalendar === "gregorian") {
      const targetYear = today.getFullYear();
      let cand = new Date(targetYear, birthGregorian.getMonth(), birthGregorian.getDate());

      // Feb 29 -> Feb 28 in non-leap years
      if (birthGregorian.getMonth() === 1 && birthGregorian.getDate() === 29 && getDaysInGregorianMonth(2, targetYear) === 28) {
        cand = new Date(targetYear, 1, 28);
      }

      if (cand < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        const y2 = targetYear + 1;
        cand = new Date(y2, birthGregorian.getMonth(), birthGregorian.getDate());
        if (birthGregorian.getMonth() === 1 && birthGregorian.getDate() === 29 && getDaysInGregorianMonth(2, y2) === 28) {
          cand = new Date(y2, 1, 28);
        }
      }
      nextAnnivDate = cand;
    } else {
      // next hijri anniversary: same hijri month/day in current hijri year (or next)
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const todayH = getHijriPartsFromGregorian(todayUTC);

      if (todayH) {
        let candHY = todayH.y;
        let candUTC = hijriToGregorian(candHY, m, d);

        // if not found or already passed, go next hijri year
        if (!candUTC || new Date(candUTC.getUTCFullYear(), candUTC.getUTCMonth(), candUTC.getUTCDate()) < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
          candHY = todayH.y + 1;
          candUTC = hijriToGregorian(candHY, m, d);
        }

        if (candUTC) nextAnnivDate = new Date(candUTC.getUTCFullYear(), candUTC.getUTCMonth(), candUTC.getUTCDate());
      }
    }

    let daysLeft = "";
    let annivStr = "";

    if (nextAnnivDate) {
      const daysLeftNumber = daysBetweenDatesUTC(today, nextAnnivDate);
      daysLeft = (lang === "ar") ? `${daysLeftNumber} يومًا` : `${daysLeftNumber} Days`;
      annivStr = formatGregorianFull(nextAnnivDate);
    } else {
      daysLeft = (lang === "ar") ? "غير متاح" : "N/A";
      annivStr = (lang === "ar") ? "غير متاح" : "N/A";
    }

    details.innerHTML = `
      <div class="details-header">${text[lang].detailsHeader}</div>
      <table>
        <tr><td class="key">${text[lang].birthWeekday}</td><td class="val">${birthWeekdayStr}</td></tr>
        <tr><td class="key">${text[lang].birthGreg}</td><td class="val">${birthGregStr}</td></tr>
        <tr><td class="key">${text[lang].birthHijri}</td><td class="val">${birthHijriStr}</td></tr>
        <tr><td class="key">${text[lang].nextAnniv}</td><td class="val">${daysLeft}</td></tr>
        <tr><td class="key">${text[lang].annivDate}</td><td class="val">${annivStr}</td></tr>
      </table>
    `;
    details.style.display = "block";
  }
}

function diffHijriDates(birthH, todayH) {
  let years = todayH.y - birthH.y;
  let months = todayH.m - birthH.m;
  let days = todayH.d - birthH.d;

  if (days < 0) {
    months--;
    let prevM = todayH.m - 1;
    let prevY = todayH.y;
    if (prevM === 0) { prevM = 12; prevY--; }
    const dim = getDaysInHijriMonth(prevM, prevY);
    days += dim;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}
