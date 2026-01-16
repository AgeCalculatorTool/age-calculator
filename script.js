let currentCalendar = "gregorian"; // default

window.onload = function () {
    // Detect calendar switch only if it exists (Arabic page)
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

    // Clear result when switching calendar for clarity
    const result = document.getElementById("result");
    if (result) result.innerText = "";
}

function fillYears(resetToDefaults) {
    const yearSel = document.getElementById("year");
    yearSel.innerHTML = "";

    const today = new Date();

    if (currentCalendar === "hijri") {
        if (!isUmalquraSupported()) {
            // Fallback message (Arabic only realistically)
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

        // نطاق معقول للهجري
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
        monthSel.innerHTML += `<option value="${m}">${m}</option>`;
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

    // Preserve previous selection if still valid
    daySel.value = String(Math.min(prev, dim));
}

function getDaysInGregorianMonth(month, year) {
    // month: 1..12
    return new Date(year, month, 0).getDate();
}

/* =============================
   Umm al-Qura (Hijri) helpers
   ============================= */

function isUmalquraSupported() {
    try {
        // Some engines throw RangeError if unsupported
        new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { timeZone: "UTC" }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function getHijriPartsFromGregorian(gDate) {
    // Returns hijri year/month/day using Umm al-Qura
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
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
    // Exact match search using Umm al-Qura:
    // We search around an estimated Gregorian year for the exact Hijri date.
    // This is not "approximation"; it is matching the official calendar output.

    if (!isUmalquraSupported()) return null;

    const estimateGy = hy + 579; // rough mapping: 1447~2025/26
    const start = new Date(Date.UTC(estimateGy - 1, 0, 1)); // Jan 1 of previous year UTC

    // Search within 900 days (covers drift comfortably)
    for (let i = 0; i < 900; i++) {
        const candidate = new Date(start.getTime() + i * 86400000);
        const h = getHijriPartsFromGregorian(candidate);
        if (h.y === hy && h.m === hm && h.d === hd) {
            return candidate;
        }
    }
    return null; // not found (shouldn't happen in normal ranges)
}

function getDaysInHijriMonth_Umalqura(hm, hy) {
    // Days in Hijri month = difference between (1st of this month) and (1st of next month)
    const g1 = hijriToGregorian_Umalqura(hy, hm, 1);
    if (!g1) return 30; // fallback

    let nextM = hm + 1;
    let nextY = hy;
    if (nextM === 13) { nextM = 1; nextY++; }

    const g2 = hijriToGregorian_Umalqura(nextY, nextM, 1);
    if (!g2) return 30;

    const diffDays = Math.round((g2.getTime() - g1.getTime()) / 86400000);
    return diffDays;
}

/* =============================
   Age calculation
   ============================= */

function calculateAge() {
    const d = parseInt(document.getElementById("day").value, 10);
    const m = parseInt(document.getElementById("month").value, 10);
    const y = parseInt(document.getElementById("year").value, 10);

    const result = document.getElementById("result");
    const lang = document.documentElement.lang;

    const text = {
        ar: { y: "سنة", m: "شهر", d: "يوم" },
        en: { y: "years", m: "months", d: "days" }
    };

    // Always compute using real time (Gregorian Date objects)
    let birthGregorian = null;

    if (currentCalendar === "gregorian") {
        birthGregorian = new Date(y, m - 1, d);
    } else {
        const g = hijriToGregorian_Umalqura(y, m, d);
        if (!g) {
            result.innerText = (lang === "ar")
                ? "تعذر تحويل التاريخ الهجري. يُرجى المحاولة مرة أخرى."
                : "Could not convert Hijri date. Please try again.";
            return;
        }
        // Convert UTC date to local Date for age math
        birthGregorian = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate());
    }

    // Basic validation: invalid date (should not happen due to selects)
    if (isNaN(birthGregorian.getTime())) {
        result.innerText = (lang === "ar")
            ? "تاريخ غير صالح."
            : "Invalid date.";
        return;
    }

    const today = new Date();

    // If user selected Hijri, show age in Hijri units (Umm al-Qura).
    // If Gregorian, show age in Gregorian units.
    if (currentCalendar === "hijri") {
        if (!isUmalquraSupported()) {
            result.innerText = "متصفحك لا يدعم تقويم أم القرى. يُرجى استخدام Chrome/Edge حديث.";
            return;
        }

        const todayH = getHijriPartsFromGregorian(new Date(Date.UTC(
            today.getFullYear(), today.getMonth(), today.getDate()
        )));

        const birthH = { y, m, d };

        const ageH = diffHijriDates_Umalqura(birthH, todayH);
        result.innerText =
            `${ageH.years} ${text[lang].y}، ${ageH.months} ${text[lang].m}، ${ageH.days} ${text[lang].d}`;
        return;
    }

    // Gregorian age (existing logic)
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

    result.innerText =
        `${years} ${text[lang].y}، ${months} ${text[lang].m}، ${days} ${text[lang].d}`;
}

function diffHijriDates_Umalqura(birthH, todayH) {
    // Compute Hijri age: todayH - birthH with proper month/day borrowing based on Umm al-Qura month lengths
    let years = todayH.y - birthH.y;
    let months = todayH.m - birthH.m;
    let days = todayH.d - birthH.d;

    if (days < 0) {
        months--;
        // borrow from previous Hijri month (relative to todayH)
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

    // If birth date in future (shouldn't happen), clamp
    if (years < 0) years = 0;
    if (months < 0) months = 0;
    if (days < 0) days = 0;

    return { years, months, days };
}
