const toast = document.querySelector("#toast");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function createSpark(x, y) {
  if (reduceMotion) return;
  const sparkCount = 6;

  for (let i = 0; i < sparkCount; i += 1) {
    const spark = document.createElement("span");
    const angle = (Math.PI * 2 * i) / sparkCount;
    const distance = 26 + Math.random() * 24;
    spark.className = "spark";
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
    document.body.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
  }
}

function setupMagneticTargets() {
  if (reduceMotion) return;

  document.querySelectorAll(".magnetic").forEach((target) => {
    target.addEventListener("pointermove", (event) => {
      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      target.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
    });

    target.addEventListener("pointerleave", () => {
      target.style.transform = "";
    });
  });
}

// ── Booking modal ──────────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const TIME_SLOTS = ["9:00 AM","10:00 AM","11:00 AM","2:00 PM","3:00 PM","4:00 PM"];

let calYear, calMonth, pickedDate, pickedTime;

const bookingDialog  = document.getElementById("bookingDialog");
const bookingBody    = document.getElementById("bookingBody");
const bookingSuccess = document.getElementById("bookingSuccess");

function openBookingModal() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  pickedDate = null;
  pickedTime = null;
  bookingBody.hidden    = false;
  bookingSuccess.hidden = true;
  renderCalendar();
  renderSlots();
  updateSelection();
  try {
    bookingDialog.showModal();
  } catch {
    bookingDialog.setAttribute("open", "");
  }
  document.getElementById("bookName")?.focus();
}

function closeBookingModal() {
  bookingDialog?.close();
}

function renderCalendar() {
  const monthLabel = document.getElementById("calMonthLabel");
  const dowRow     = document.getElementById("calDow");
  const daysGrid   = document.getElementById("calDays");
  if (!monthLabel || !dowRow || !daysGrid) return;

  monthLabel.textContent = `${MONTHS[calMonth]} ${calYear}`;

  dowRow.innerHTML = DOW_LABELS.map(d => `<span>${d}</span>`).join("");

  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();

  let html = "";
  for (let i = 0; i < firstDow; i++) {
    html += `<button class="cal-day is-empty" tabindex="-1" disabled aria-hidden="true"></button>`;
  }
  for (let d = 1; d <= lastDate; d++) {
    const date     = new Date(calYear, calMonth, d);
    const isPast   = date < today;
    const isWknd   = date.getDay() === 0 || date.getDay() === 6;
    const isSel    = pickedDate &&
      pickedDate.getFullYear() === calYear &&
      pickedDate.getMonth()    === calMonth &&
      pickedDate.getDate()     === d;
    const disabled = isPast || isWknd;
    const cls      = ["cal-day", isSel ? "is-selected" : ""].filter(Boolean).join(" ");
    html += `<button type="button" class="${cls}" ${disabled ? "disabled" : ""} data-y="${calYear}" data-m="${calMonth}" data-d="${d}" aria-label="${MONTHS[calMonth]} ${d}">${d}</button>`;
  }

  daysGrid.innerHTML = html;
  daysGrid.querySelectorAll(".cal-day:not([disabled]):not(.is-empty)").forEach(btn => {
    btn.addEventListener("click", () => {
      pickedDate = new Date(+btn.dataset.y, +btn.dataset.m, +btn.dataset.d);
      pickedTime = null;
      renderCalendar();
      renderSlots();
      updateSelection();
    });
  });
}

function renderSlots() {
  const container = document.getElementById("calSlots");
  if (!container) return;

  if (!pickedDate) { container.innerHTML = ""; return; }

  const btns = TIME_SLOTS.map(t => {
    const sel = t === pickedTime ? "is-selected" : "";
    return `<button type="button" class="slot-btn ${sel}" data-time="${t}">${t}</button>`;
  }).join("");

  container.innerHTML = `<p class="slots-label">Available times</p><div class="slots-grid">${btns}</div>`;
  container.querySelectorAll(".slot-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      pickedTime = btn.dataset.time;
      renderSlots();
      updateSelection();
    });
  });
}

function updateSelection() {
  const el = document.getElementById("bookSelection");
  if (!el) return;
  if (pickedDate && pickedTime) {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    el.textContent = `${days[pickedDate.getDay()]}, ${MONTHS[pickedDate.getMonth()]} ${pickedDate.getDate()} · ${pickedTime}`;
  } else if (pickedDate) {
    el.textContent = "Date chosen — pick a time above.";
  } else {
    el.textContent = "No date or time selected yet.";
  }
}

function parseTime(str) {
  const [timePart, ampm] = str.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return { h, m };
}

function toCalISO(date, h, m) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`;
}

function handleBookingSubmit() {
  const name  = document.getElementById("bookName")?.value.trim();
  const email = document.getElementById("bookEmail")?.value.trim();
  const topic = document.getElementById("bookTopic")?.value.trim();

  if (!name)      { showToast("Please enter your name."); return; }
  if (!email || !email.includes("@")) { showToast("Please enter a valid email."); return; }
  if (!pickedDate) { showToast("Please pick a date on the calendar."); return; }
  if (!pickedTime) { showToast("Please pick a time slot."); return; }

  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const displayDate = `${days[pickedDate.getDay()]}, ${MONTHS[pickedDate.getMonth()]} ${pickedDate.getDate()}, ${pickedDate.getFullYear()} at ${pickedTime}`;

  const { h, m } = parseTime(pickedTime);
  const startISO  = toCalISO(pickedDate, h, m);
  const endISO    = toCalISO(pickedDate, h + 1, m);

  const gcalTitle   = `Meeting with TrazHub — ${name}`;
  const gcalDetails = `Booking request from ${name} (${email})\n\nTopic: ${topic || "Not specified"}\n\nClick "Add video call" to generate a Google Meet link after saving this event.`;
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(gcalTitle)}` +
    `&dates=${startISO}/${endISO}` +
    `&details=${encodeURIComponent(gcalDetails)}` +
    `&add=${encodeURIComponent("garv@trazz.art")}`;

  const mailSubject = `Meeting request — ${name} · ${displayDate}`;
  const mailBody =
    `Hi Garv,\n\nI'd like to book a meeting with you.\n\nName:  ${name}\nEmail: ${email}\nDate:  ${displayDate}\nTopic: ${topic || "Not specified"}\n\nPlease confirm this slot or suggest an alternative.\n\n— ${name}`;
  const mailtoUrl = `mailto:garv@trazz.art` +
    `?cc=${encodeURIComponent(email)}` +
    `&subject=${encodeURIComponent(mailSubject)}` +
    `&body=${encodeURIComponent(mailBody)}`;

  window.open(gcalUrl, "_blank", "noopener,noreferrer");

  const tempLink = document.createElement("a");
  tempLink.href = mailtoUrl;
  document.body.appendChild(tempLink);
  tempLink.click();
  tempLink.remove();

  const successDetails = document.getElementById("successDetails");
  if (successDetails) successDetails.textContent = `${displayDate} · ${email}`;
  bookingBody.hidden    = true;
  bookingSuccess.hidden = false;
}

document.getElementById("workWithMe")?.addEventListener("click", openBookingModal);
document.getElementById("bookSubmit")?.addEventListener("click", handleBookingSubmit);

["bookingClose", "bookingSuccessClose"].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeBookingModal();
  });
});

document.getElementById("calPrev")?.addEventListener("click", () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById("calNext")?.addEventListener("click", () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

bookingDialog?.addEventListener("click", (e) => {
  if (e.target === bookingDialog) closeBookingModal();
});

bookingDialog?.addEventListener("close", () => {
  if (bookingBody) bookingBody.hidden = false;
  if (bookingSuccess) bookingSuccess.hidden = true;
});

// ── End booking modal ───────────────────────────────────────────────────────

document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (target instanceof Element && target.closest("a, button")) {
    createSpark(event.clientX, event.clientY);
  }
});

setupMagneticTargets();
