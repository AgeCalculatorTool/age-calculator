window.onload = function () {
    fillYears();
    fillMonths();
    updateDays();

    document.getElementById("month").addEventListener("change", updateDays);
    document.getElementById("year").addEventListener("change", updateDays);
};

function fillYears() {
    const year = document.getElementById("year");
    const currentYear = new Date().getFullYear();

    for (let y = currentYear; y >= 1900; y--) {
        year.innerHTML += `<option value="${y}">${y}</option>`;
    }
}

function fillMonths() {
    const month = document.getElementById("month");
    for (let m = 1; m <= 12; m++) {
        month.innerHTML += `<option value="${m}">${m}</option>`;
    }
}

function updateDays() {
    const day = document.getElementById("day");
    const month = parseInt(document.getElementById("month").value);
    const year = parseInt(document.getElementById("year").value);

    const daysInMonth = getDaysInMonth(month, year);

    const selectedDay = day.value;
    day.innerHTML = "";

    for (let d = 1; d <= daysInMonth; d++) {
        day.innerHTML += `<option value="${d}">${d}</option>`;
    }

    if (selectedDay && selectedDay <= daysInMonth) {
        day.value = selectedDay;
    }
}

function getDaysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

function calculateAge() {
    const d = parseInt(document.getElementById("day").value);
    const m = parseInt(document.getElementById("month").value) - 1;
    const y = parseInt(document.getElementById("year").value);

    const birthDate = new Date(y, m, d);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
        months--;
        const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += lastMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    const lang = document.documentElement.lang;
    const text = {
        ar: ["سنة", "شهر", "يوم"],
        en: ["years", "months", "days"]
    };

    document.getElementById("result").innerText =
        `${years} ${text[lang][0]}، ${months} ${text[lang][1]}، ${days} ${text[lang][2]}`;
}
