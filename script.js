let currentCalendar = "gregorian"; // default

window.onload = function () {
    const radios = document.querySelectorAll('input[name="calendarType"]');
    if (radios.length) {
        radios.forEach(r => {
            r.addEventListener("change", () => {
                currentCalendar = r.value;
                initSelectsForCurrentCalendar(true);
            });
        });
    }

    initSelectsForCurrentCalendar(false);

    document.getElementById("month").addEventListener("change", updateDays);
    document.getElementById("year").addEventListener("change", updateDays);
};

function initSelectsForCurrentCalendar(resetToDefaults) {
    fillYears(resetToDefaults);
    fillMonths(resetToDefaults);
    updateDays();

    const result = document.getElementById("result");
    const details = document.getElementById("details");
    if (result) result.innerText = "";
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

// Hijri month names (Arabic)
const HIJRI_MONTHS_AR = [
    "محرم","صفر","ربيع الأول","ربيع الآخر",
    "جمادى الأولى","جمادى الآخرة","رجب","شعبان",
    "رمضان","شوال","ذو القعدة","ذو الحجة"
];

const HIJRI_MONTHS_EN = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
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

    if (currentCalendar === "hijri") {
        if (!isUmalquraSupported()) {
            document.getElementById("result").innerText =
                "متصفحك لا يدعم تقويم أم القرى. يُرجى استخدام Chrome/Edge حديث.";
            currentCalendar = "gregorian";
        }
    }

    if (currentCalendar === "gregorian") {
        const currentYear = today.getFullYear();
        for (let y = currentYear; y >= 1900; y--) {
            yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        }
        if (resetToDefaults) yearSel.value = String(currentYear);
    } else {
        const h = getHijriPartsFromGregorian(today);
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
        : getDaysInHijriMonth_Umalqura(month, year);

    for (let d = 1; d <= dim; d++) {
        daySel.innerHTML += `<option value="${d}">${d}</option>`;
    }

    daySel.value = String(Math.min(prev, dim));
}

function getDaysInGregorianMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

/* =============================
   Umm al-Qura (Hijri) via Intl
   ============================= */

function isUmalquraSupported() {
    try {
        new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC" }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function getHijriPartsFromGregorian(gDate) {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        timeZone: "UTC"
    });

    const parts = fmt.formatToParts(gDate);
    const y = parseInt(parts.find(p => p.type === "year").value, 10);
    const m = parseInt(parts.find(p => p.type === "month").value, 10);
    const d = parseInt(parts.find(p => p.type === "day").value, 10);

    return { y, m, d };
}

function hijriToGregorian_Umalqura(hy, hm, hd) {
    if (!isUmalquraSupported()) return null;

    const estimateGy = hy + 579;
    const start = new Date(Date.UTC(estimateGy - 1, 0, 1));

    for (let i = 0; i < 900; i++) {
        const candidate = new Date(start.getTime() + i * 86400000);
        const h = getHijriPartsFromGregorian(candidate);
        if (h.y === hy && h.m === hm && h.d === hd) {
            return candidate; // UTC date
        }
    }
    return null;
}

function getDaysInHijriMonth_Umalqura(hm, hy) {
    const g1 = hijriToGregorian_Umalqura(hy, hm, 1);
    if (!g1) return 30;

    let nextM = hm + 1;
    let nextY = hy;
    if (nextM === 13) { nextM = 1; nextY++; }

    const g2 = hijriToGregorian_Umalqura(nextY, nextM, 1);
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

function formatGregorianDate(dateObj) {
    const lang = document.documentElement.lang;
    const locale = (lang === "ar") ? "ar" : "en";

    const txt = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(dateObj);

    // Add era suffix in Arabic style
    return (lang === "ar") ? (txt + " م") : txt;
}

function formatGregorianFull(dateObj) {
    // Weekday + full date
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

function formatHijriFromGregorian(dateObj) {
    const lang = document.documentElement.lang;

    // English hijri in English words + latin digits
    if (lang === "en") {
        const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
        return fmt.format(dateObj);
    }

    // Arabic hijri (Umm al-Qura)
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    return fmt.format(dateObj);
}

function daysBetweenDatesUTC(dateA, dateB) {
    const a = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
    const b = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
    return Math.round((b - a) / 86400000);
}

function formatHijriManual(parts, lang) {
  const hijriMonthsAr = [
    "محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة",
    "رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"
  ];
  const hijriMonthsEn = [
    "Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani","Jumada al-Ula","Jumada al-Akhirah",
    "Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"
  ];

  const name = (lang === "ar") ? hijriMonthsAr[parts.m - 1] : hijriMonthsEn[parts.m - 1];
  const suffix = (lang === "ar") ? " هـ" : " AH";

  return (lang === "ar")
    ? `${parts.d} ${name} ${parts.y}${suffix}`
    : `${name} ${parts.d}, ${parts.y}${suffix}`;
}


/* =============================
   Age calculation + extra details
   ============================= */

function calculateAge() {
    const d = parseInt(document.getElementById("day").value, 10);
    const m = parseInt(document.getElementById("month").value, 10);
    const y = parseInt(document.getElementById("year").value, 10);

    const result = document.getElementById("result");
    const details = document.getElementById("details");
    const lang = document.documentElement.lang;

    const text = {
        ar: {
            years: "سنة", months: "شهر", days: "يوم",
            detailsHeader: "معلومات إضافية",
            birthWeekday: "يوم الميلاد",
            birthGreg: "تاريخ الميلاد (ميلادي)",
            birthHijri: "تاريخ الميلاد (هجري - أم القرى)",
            nextAnniv: "المتبقي لذكرى الميلاد القادمة",
            annivDate: "تاريخ الذكرى القادمة",
        },
        en: {
            years: "years", months: "months", days: "days",
            detailsHeader: "Additional details",
            birthWeekday: "Birth weekday",
            birthGreg: "Birthdate (Gregorian)",
            birthHijri: "Birthdate (Hijri - Umm al-Qura)",
            nextAnniv: "Days until next birthday",
            annivDate: "Next birthday date",
        }
    };

    // ✅ Separator based on language
    const sep = (lang === "ar") ? "، " : ", ";

    // 1) Convert selected date to a real Gregorian Date object
    let birthGregorian = null;

    if (currentCalendar === "gregorian") {
        birthGregorian = new Date(y, m - 1, d);
    } else {
        const gUTC = hijriToGregorian_Umalqura(y, m, d);
        if (!gUTC) {
            result.innerText = (lang === "ar")
                ? "تعذر تحويل التاريخ الهجري."
                : "Could not convert Hijri date.";
            if (details) { details.style.display = "none"; details.innerHTML = ""; }
            return;
        }
        birthGregorian = new Date(gUTC.getUTCFullYear(), gUTC.getUTCMonth(), gUTC.getUTCDate());
    }

    if (isNaN(birthGregorian.getTime())) {
        result.innerText = (lang === "ar") ? "تاريخ غير صالح." : "Invalid date.";
        if (details) { details.style.display = "none"; details.innerHTML = ""; }
        return;
    }

    const today = new Date();
    if (birthGregorian > today) {
        result.innerText = (lang === "ar") ? "تاريخ الميلاد في المستقبل." : "Birthdate is in the future.";
        if (details) { details.style.display = "none"; details.innerHTML = ""; }
        return;
    }

    // 2) Calculate age (Gregorian parts)
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

    // If Hijri mode: show Hijri age parts (Umm al-Qura) in result line
    if (currentCalendar === "hijri") {
        if (!isUmalquraSupported()) {
            result.innerText = "متصفحك لا يدعم تقويم أم القرى. يُرجى استخدام Chrome/Edge حديث.";
            if (details) { details.style.display = "none"; details.innerHTML = ""; }
            return;
        }

        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        const todayH = getHijriPartsFromGregorian(todayUTC);
        const birthH = { y, m, d };
        const ageH = diffHijriDates_Umalqura(birthH, todayH);

        result.innerText =
            `${ageH.years} ${text[lang].years}${sep}${ageH.months} ${text[lang].months}${sep}${ageH.days} ${text[lang].days}`;
    } else {
        result.innerText =
            `${years} ${text[lang].years}${sep}${months} ${text[lang].months}${sep}${days} ${text[lang].days}`;
    }

    // 3) Extra details
    if (details) {
        const birthWeekdayStr = formatWeekday(birthGregorian);
        const birthGregStr = formatGregorianFull(birthGregorian);
        
        let birthHijriStr = "";

        // نحاول أخذ أجزاء الهجري من Intl إذا كان متاحًا (على أجهزة كثيرة سيعمل)
        const hParts = getHijriPartsFromGregorian(
            new Date(Date.UTC(birthGregorian.getFullYear(), birthGregorian.getMonth(), birthGregorian.getDate()))
        );

        if (hParts) {
            // نعرض الهجري يدويًا + يوم الأسبوع من الميلادي
            birthHijriStr = `${birthWeekdayStr}, ${formatHijriManual(hParts, lang)}`;
        } else {
            // إذا فشل، لا نعرض تاريخًا مضللًا
            birthHijriStr = (lang === "ar") ? "غير متاح على هذا المتصفح" : "Not available on this browser";
        }


        // Next anniversary depending on selected calendar
        let nextAnnivDate = null;

        if (currentCalendar === "gregorian") {
            // next gregorian birthday
            const targetYear = today.getFullYear();
            let cand = new Date(targetYear, birthGregorian.getMonth(), birthGregorian.getDate());

            // Handle Feb 29 birthdays in non-leap years -> use Feb 28 (choice) or Mar 1. We'll choose Feb 28.
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

            let candHY = todayH.y;
            let candUTC = hijriToGregorian_Umalqura(candHY, m, d);

            // if not found (rare) or already passed, go next hijri year
            if (!candUTC || new Date(candUTC.getUTCFullYear(), candUTC.getUTCMonth(), candUTC.getUTCDate()) < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                candHY = todayH.y + 1;
                candUTC = hijriToGregorian_Umalqura(candHY, m, d);
            }

            if (candUTC) {
                nextAnnivDate = new Date(candUTC.getUTCFullYear(), candUTC.getUTCMonth(), candUTC.getUTCDate());
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

function diffHijriDates_Umalqura(birthH, todayH) {
    let years = todayH.y - birthH.y;
    let months = todayH.m - birthH.m;
    let days = todayH.d - birthH.d;

    if (days < 0) {
        months--;
        let prevM = todayH.m - 1;
        let prevY = todayH.y;
        if (prevM === 0) { prevM = 12; prevY--; }
        const dim = getDaysInHijriMonth_Umalqura(prevM, prevY);
        days += dim;
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years < 0) years = 0;
    if (months < 0) months = 0;
    if (days < 0) days = 0;

    return { years, months, days };
}





