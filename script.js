const USER_ID = "835584835443228702";
const LANYARD_REST_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;
const LANYARD_SOCKET_URL = "wss://api.lanyard.rest/socket";

const shareButton = document.querySelector("#shareButton");
const toast = document.querySelector("#toast");
const spotifyCardText = document.querySelector("#spotifyCardText");
const spotifyProgress = document.querySelector("#spotifyProgress");
const spotifyProgressFill = spotifyProgress?.querySelector("span");
const spotifyCard = spotifyCardText?.closest(".link-card");
const spotifyArrow = document.querySelector("#spotifyArrow");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer;
let heartbeatTimer;
let reconnectTimer;
let progressTimer;
let socket;
let reconnectAttempt = 0;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

async function copyPageLink() {
  const link = window.location.href;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
    } else {
      const input = document.createElement("input");
      input.value = link;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }

    showToast("Page link copied.");
  } catch {
    showToast("Copy failed. Use the address bar.");
  }
}

function normalizePresence(raw = {}) {
  return {
    ...raw,
    listening_to_spotify: raw.listening_to_spotify || Boolean(raw.spotify),
  };
}

function statusLabel(status) {
  if (status === "dnd") return "dnd";
  if (status === "idle") return "idle";
  if (status === "online") return "online";
  return "offline";
}

function formatTime(totalMs) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getSpotifyTiming(spotify) {
  const start = spotify?.timestamps?.start;
  const end = spotify?.timestamps?.end;

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return { start, end, duration: end - start };
}

function clearSpotifyProgress() {
  clearInterval(progressTimer);
  progressTimer = undefined;
  spotifyProgress?.classList.remove("is-visible");
  if (spotifyProgressFill) spotifyProgressFill.style.width = "0%";
}

function paintSpotifySong(spotify) {
  if (!spotifyCardText || !spotify?.song) return;

  const artist = spotify.artist || "unknown artist";
  const timing = getSpotifyTiming(spotify);

  if (!timing) {
    spotifyCardText.textContent = `Now playing: ${spotify.song} - ${artist}`;
    return;
  }

  const now = Date.now();
  const elapsed = Math.min(Math.max(now - timing.start, 0), timing.duration);
  const percent = Math.min(100, Math.max(0, (elapsed / timing.duration) * 100));
  spotifyCardText.textContent = `Now playing: ${spotify.song} - ${artist} (${formatTime(elapsed)} / ${formatTime(timing.duration)})`;
  spotifyProgress?.classList.add("is-visible");
  if (spotifyProgressFill) spotifyProgressFill.style.width = `${percent}%`;
}

function startSpotifyProgress(spotify) {
  clearSpotifyProgress();

  if (!spotify?.song) return;

  paintSpotifySong(spotify);

  if (getSpotifyTiming(spotify)) {
    progressTimer = setInterval(() => paintSpotifySong(spotify), 1000);
  }
}

function renderPresence(rawData) {
  const data = normalizePresence(rawData);
  const spotify = data.spotify;
  const hasTrack = Boolean(spotify?.song);

  spotifyCard?.classList.toggle("is-live", hasTrack);
  if (spotifyArrow) spotifyArrow.textContent = hasTrack ? "Live" : "Open";

  if (hasTrack) {
    startSpotifyProgress(spotify);
    return;
  }

  clearSpotifyProgress();

  if (spotifyCardText) {
    spotifyCardText.textContent = data.listening_to_spotify
      ? "Spotify active — waiting for Lanyard to surface the current track."
      : "Not currently playing on Spotify. This card updates live when Lanyard detects a track.";
  }
}

async function loadPresence() {
  try {
    const res = await fetch(LANYARD_REST_URL);
    const json = await res.json();
    renderPresence(json.data || json);
  } catch {
    if (spotifyCardText) spotifyCardText.textContent = "Live Spotify status is unavailable right now.";
    clearSpotifyProgress();
  }
}

function sendSocketMessage(payload) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function startHeartbeat(interval) {
  clearInterval(heartbeatTimer);
  sendSocketMessage({ op: 3 });
  heartbeatTimer = setInterval(() => sendSocketMessage({ op: 3 }), interval);
}

function extractPresenceFromPacket(packet) {
  if (!packet?.d) return null;
  if (packet.t === "INIT_STATE") return packet.d[USER_ID] || null;
  if (packet.t === "PRESENCE_UPDATE") return packet.d;
  return null;
}

function scheduleReconnect() {
  clearInterval(heartbeatTimer);
  clearTimeout(reconnectTimer);

  const delay = Math.min(30000, 1500 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(connectLanyardSocket, delay);
}

function connectLanyardSocket() {
  if (!("WebSocket" in window)) return;

  socket = new WebSocket(LANYARD_SOCKET_URL);

  socket.addEventListener("message", (event) => {
    let packet;

    try {
      packet = JSON.parse(event.data);
    } catch {
      return;
    }

    if (packet.op === 1) {
      reconnectAttempt = 0;
      startHeartbeat(packet.d.heartbeat_interval);
      sendSocketMessage({ op: 2, d: { subscribe_to_id: USER_ID } });
      return;
    }

    const presence = extractPresenceFromPacket(packet);
    if (presence) renderPresence(presence);
  });

  socket.addEventListener("close", scheduleReconnect);
  socket.addEventListener("error", () => socket.close());
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

function setupTiltCards() {
  if (reduceMotion) return;

  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateX(${y * -4}deg) rotateY(${x * 5}deg)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
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
// Escape is handled natively by <dialog>

// ── End booking modal ───────────────────────────────────────────────────────

shareButton?.addEventListener("click", copyPageLink);

document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (target instanceof Element && target.closest("a, button")) {
    createSpark(event.clientX, event.clientY);
  }
});

window.addEventListener("beforeunload", () => {
  clearInterval(heartbeatTimer);
  clearInterval(progressTimer);
  clearTimeout(reconnectTimer);
  socket?.close();
});

async function loadGithubStats() {
  const el = document.getElementById("githubStats");
  if (!el) return;
  try {
    const res = await fetch("https://api.github.com/users/trazhub", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const d = await res.json();
    const fmt = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
    el.textContent = `${fmt(d.followers)} followers · ${d.public_repos} public repos`;
  } catch {
    /* keep default text */
  }
}

loadPresence();
connectLanyardSocket();
loadGithubStats();
setupTiltCards();
setupMagneticTargets();
