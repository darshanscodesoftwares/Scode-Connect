import { openWorkspace, saveState, readState, storageInfo } from "./storage.js";
import {
  dateKey,
  dateLabel,
  demand,
  reminderState,
  removeCandidate,
  shiftDay,
  uid,
} from "./model.js";
import { desktopLogo, icon, logo } from "./icons.js";
import {
  esc,
  navItems,
  btn,
  title,
  panelHead,
  detailGrid,
  empty,
} from "./ui.js";
import { dashboard, insights } from "./dashboard.js";
import {
  people,
  peopleRows,
  profile,
  followups,
  opportunities,
  batches,
  batchDetail,
} from "./views.js";
import { forms, confirmAction, closeDialog } from "./forms.js";
const app = document.querySelector("#app");
const launchLoader = document.querySelector("#launch-loader");
if (window.lottie && launchLoader) launchLoader.replaceChildren();
const launchAnimation =
  window.lottie && launchLoader
    ? window.lottie.loadAnimation({
        container: launchLoader,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "./assets/scodeconnect-magnetic-loader-v4.json",
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      })
    : null;
const hardcodedLaunchDelay = new Promise((resolve) =>
  setTimeout(resolve, 1500),
);
const route = () => location.hash.slice(2).split("/");
let state,
  filters = {},
  toastTimer,
  installPrompt,
  saving = false;
const broadcast = window.BroadcastChannel
  ? new BroadcastChannel("scode-connect-demo")
  : null;
function toast(message) {
  const box = document.querySelector("#toast");
  box.textContent = message;
  box.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("visible"), 3600);
}
async function change(mutate, message, audio = null, removed = []) {
  if (saving) throw Error("A save is in progress.");
  saving = true;
  try {
    const copy = structuredClone(state);
    mutate(copy);
    await saveState(copy, audio, removed);
    state = copy;
    render();
    broadcast?.postMessage(copy.revision);
    toast(message);
  } finally {
    saving = false;
  }
}
const form = forms({ get: () => state, change });
function navItem(id, label, glyph, active, extra = "") {
  return `<a href="#/${id}" class="navitem ${active === id ? "selected" : ""}" ${active === id ? 'aria-current="page"' : ""}>${icon(glyph, 19)}<span>${esc(label)}</span>${extra}</a>`;
}
function workspaceLabel() {
  const info = storageInfo();
  return info.mode === "postgres"
    ? info.workspace === "demo"
      ? "Shared demo workspace"
      : "Shared workspace"
    : "Demo workspace";
}
function settings() {
  const standalone =
    matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  return (
    title("Settings", "Manage this device’s ScodeConnect workspace.") +
    `<section class="panel settingspanel">${panelHead("Workspace storage")}<p>${storageInfo().mode === "postgres" ? "PostgreSQL stores shared records and audio. This device caches records and previously opened audio for offline viewing. Connect to the server to save changes." : "This demo stores records and voice notes in this browser on this device. Clearing site data removes the workspace."}</p>${detailGrid(
      [
        ["Workspace", workspaceLabel()],
        [
          "Storage",
          storageInfo().mode === "postgres"
            ? "PostgreSQL"
            : "Browser · IndexedDB",
        ],
        ["Candidates", state.candidates.length],
        ["Voice processing", "Simulated"],
      ],
    )}</section>
  <section class="panel settingspanel">${panelHead("Batch opportunity threshold")}<form id="thresholdform"><label class="field">Minimum compatible candidates<input type="number" name="threshold" min="2" max="100" required value="${state.threshold}"></label><button class="primary">Save threshold</button></form></section>
  <section class="panel settingspanel">${panelHead("Install ScodeConnect")}<p>${standalone ? "ScodeConnect is running as an installed app." : installPrompt ? "Install the app for quick access from your home screen." : "On iPhone, open in Safari and choose Share, then Add to Home Screen. On supported Android or desktop browsers, use Install app in the browser menu."}</p>${installPrompt && !standalone ? btn("Install app", "install") : ""}</section>`
  );
}
function render() {
  if (!state) return;
  const [raw, id] = route();
  const page = raw || "dashboard";
  const def = navItems.find((n) => n[0] === page);
  const label = def?.[1] || (page === "more" ? "More" : "Page unavailable");
  const c = state.candidates.find((c) => c.id === id),
    b = state.batches.find((b) => b.id === id);
  let view;
  switch (page) {
    case "dashboard":
      view = dashboard(state);
      break;
    case "enquiries":
    case "candidates":
      view = id
        ? c
          ? profile(state, c)
          : empty("Candidate unavailable.")
        : people(state, page, filters);
      break;
    case "follow-ups":
      view = followups(state);
      break;
    case "opportunities":
      view = opportunities(state);
      break;
    case "batches":
      view = id
        ? b
          ? batchDetail(state, b)
          : empty("Batch unavailable.")
        : batches(state);
      break;
    case "insights":
      view = insights(state);
      break;
    case "settings":
      view = settings();
      break;
    case "more":
      view =
        title("More", "Workspace tools and settings.") +
        `<div class="panel moremenu">${navItems
          .filter((i) =>
            ["candidates", "opportunities", "insights", "settings"].includes(
              i[0],
            ),
          )
          .map((n) => navItem(...n, page))
          .join("")}</div>`;
      break;
    default:
      view = empty("Page unavailable.");
  }
  const due = state.reminders.filter((r) =>
    ["Due Today", "Overdue"].includes(reminderState(r)),
  ).length;
  const side = (n) =>
    navItem(
      ...n,
      page,
      n[0] === "follow-ups" && due
        ? `<small class="navcount">${due}</small>`
        : "",
    );
  document.title = label + " · ScodeConnect";
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#/dashboard">${desktopLogo}</a><div class="workspacemark"><span class="workspaceicon">${icon("briefcase", 18)}</span><div><strong>Scode</strong><small>Recruitment workspace</small></div></div>
  <nav aria-label="Workspace"><div class="navgroup">Workspace</div>${navItems.slice(0, 3).map(side).join("")}<div class="navgroup">Management</div>${navItems.slice(3, 7).map(side).join("")}</nav><div class="sidebarfoot">${side(navItems[7])}<div class="workspaceuser"><span class="usericon">SC</span><div><strong>Scode team</strong><small>${workspaceLabel()}</small></div></div></div></aside>
  <div class="mainwrap"><header class="topbar"><div class="breadcrumb">${icon("grid", 16)}<span>Workspace</span><span class="slash">/</span><b>${esc(label)}</b></div><a class="mobilebrand" href="#/dashboard">${logo}</a><div class="topactions"><span class="today">${icon("calendar", 16)} ${dateLabel(dateKey(), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span><a class="notify" href="#/follow-ups" aria-label="Follow-ups, ${due} due">${icon("bell", 19)}${due ? "<i></i>" : ""}</a></div></header><main id="content" tabindex="-1">${storageInfo().mode === "postgres" && !storageInfo().available ? '<p class="offlinebanner">Offline copy · Reconnect to save changes.</p>' : ""}${view}</main></div>
  <nav class="bottomnav" aria-label="Mobile navigation">${[navItems[0], navItems[1], navItems[4], navItems[5], ["more", "More", "more"]].map((n) => navItem(...n, ["opportunities", "candidates", "insights", "settings"].includes(page) ? "more" : page)).join("")}</nav>`;
}
const getOpp = (id) => demand(state).find((o) => o.id === id);
document.addEventListener("click", async (e) => {
  if (e.target.closest(".skip")) {
    e.preventDefault();
    document.querySelector("#content")?.focus();
    return;
  }
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    switch (action) {
      case "add":
        form.capture(id);
        break;
      case "edit":
        form.candidateForm(state.candidates.find((c) => c.id === id));
        break;
      case "play":
        await form.play(id);
        break;
      case "filters":
        filters.open = !filters.open;
        document.querySelector("#filters").hidden = !filters.open;
        break;
      case "clearfilters":
        filters = { open: true };
        render();
        break;
      case "reminder":
        form.reminder(id);
        break;
      case "newrem":
        form.reminder("", id);
        break;
      case "complete":
        await change((s) => {
          s.reminders.find((r) => r.id === id).completedAt =
            new Date().toISOString();
        }, "Follow-up completed");
        break;
      case "snooze":
        await change((s) => {
          const r = s.reminders.find((r) => r.id === id);
          r.scheduledAt =
            shiftDay(
              1,
              new Date(Math.max(Date.now(), new Date(r.scheduledAt).getTime())),
            ) +
            "T" +
            r.scheduledAt.slice(11, 16);
          r.snoozed = true;
        }, "Follow-up snoozed for one day");
        break;
      case "opportunity":
        form.opportunity(id);
        break;
      case "batch":
        form.batch(id);
        break;
      case "fromopp":
        form.batch("", getOpp(id));
        break;
      case "remindopp": {
        const o = getOpp(id);
        const pending = o.members.filter((c) => c.status !== "Interested");
        const title = "Confirm " + o.technology + " batch interest";
        confirmAction(
          "Schedule batch follow-ups",
          "Schedule a callback for each pending candidate tomorrow at 10:00. Existing open reminders with the same purpose will be kept.",
          "Schedule reminders",
          () =>
            change((s) => {
              for (const c of pending)
                if (
                  !s.reminders.some(
                    (r) =>
                      r.candidateId === c.id &&
                      !r.completedAt &&
                      r.title === title,
                  )
                )
                  s.reminders.push({
                    id: uid(),
                    candidateId: c.id,
                    title,
                    description:
                      "Review the proposed " +
                      dateLabel(o.start) +
                      " start date.",
                    scheduledAt: shiftDay(1) + "T10:00",
                    priority: "Normal",
                    completedAt: "",
                    createdAt: new Date().toISOString(),
                  });
            }, "Batch follow-ups scheduled"),
        );
        break;
      }
      case "dismissopp":
        confirmAction(
          "Dismiss opportunity?",
          "Hide this suggestion while its membership and start date stay the same.",
          "Dismiss opportunity",
          () => change((s) => s.dismissed.push(id), "Opportunity dismissed"),
        );
        break;
      case "enrol": {
        const [bid, cid] = id.split("|");
        const c = state.candidates.find((c) => c.id === cid),
          b = state.batches.find((b) => b.id === bid);
        confirmAction(
          "Enrol candidate?",
          `Enrol ${c.name} in ${b.name} and update their candidate status to Enrolled.`,
          "Confirm enrolment",
          () =>
            change((s) => {
              s.candidates.find((c) => c.id === cid).status = "Enrolled";
            }, "Candidate enrolled"),
        );
        break;
      }
      case "delete": {
        const c = state.candidates.find((c) => c.id === id);
        confirmAction(
          "Delete " + c.name + "?",
          "This removes the candidate, their call records, audio and reminders, and their membership in batches.",
          "Delete candidate",
          async () => {
            await change(
              (s) => removeCandidate(s, id),
              "Candidate deleted",
              null,
              state.calls
                .filter((r) => r.candidateId === id && r.audioId)
                .map((r) => r.audioId),
            );
            location.hash = "/candidates";
          },
        );
        break;
      }
      case "install":
        if (installPrompt) {
          await installPrompt.prompt();
          await installPrompt.userChoice;
          installPrompt = null;
          render();
        }
        break;
    }
  } catch (err) {
    toast(err.message);
  }
});
function filterResults(el) {
  if (!document.querySelector("#peopleResults")) return;
  filters[el.name] = el.value;
  document.querySelector("#peopleResults").innerHTML = peopleRows(
    state,
    route()[0],
    filters,
  );
}
app.addEventListener("input", (e) => {
  if (e.target.matches(".searchfield input")) filterResults(e.target);
});
app.addEventListener("change", (e) => {
  if (e.target.closest("#filters")) filterResults(e.target);
});
app.addEventListener("submit", async (e) => {
  if (e.target.id !== "thresholdform") return;
  e.preventDefault();
  const n = Number(new FormData(e.target).get("threshold"));
  if (Number.isInteger(n) && n >= 2 && n <= 100)
    try {
      await change((s) => {
        s.threshold = n;
      }, "Opportunity threshold saved");
    } catch (err) {
      toast(err.message);
    }
});
window.addEventListener("hashchange", () => {
  closeDialog();
  filters = {};
  render();
  window.scrollTo(0, 0);
  document.querySelector("#content")?.focus({ preventScroll: true });
});
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  if (route()[0] === "settings") render();
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  render();
});
if (broadcast)
  broadcast.onmessage = async () => {
    if (!document.querySelector("dialog").open) {
      state = await readState();
      render();
    } else
      toast(
        "Workspace updated in another tab. Reopen this form to use the latest data.",
      );
  };
async function refresh() {
  if (
    document.hidden ||
    !state ||
    document.querySelector("dialog").open ||
    saving
  )
    return;
  const wasAvailable = storageInfo().available;
  const next = await readState();
  if (
    next.revision < state.revision ||
    document.querySelector("dialog").open ||
    saving
  )
    return;
  const changed =
    next.revision !== state.revision ||
    wasAvailable !== storageInfo().available;
  state = next;
  if (
    changed ||
    (["", "dashboard", "follow-ups", "candidates"].includes(route()[0]) &&
      !document.activeElement?.matches("input,select,textarea"))
  )
    render();
}
document
  .querySelector("dialog")
  .addEventListener("close", () => refresh().catch((e) => toast(e.message)));
window.addEventListener("online", () =>
  refresh().catch((e) => toast(e.message)),
);
window.addEventListener("offline", () =>
  refresh().catch((e) => toast(e.message)),
);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refresh().catch((e) => toast(e.message));
});
setInterval(() => refresh().catch((e) => toast(e.message)), 30000);
const workspaceResult = openWorkspace().then(
  (value) => ({ value }),
  (error) => ({ error }),
);
try {
  const [workspace] = await Promise.all([
    workspaceResult,
    hardcodedLaunchDelay,
  ]);
  if (workspace.error) throw workspace.error;
  state = workspace.value;
  launchAnimation?.destroy();
  render();
} catch (err) {
  launchAnimation?.destroy();
  app.innerHTML =
    '<main class="startup"><h1>Workspace unavailable</h1><p>' +
    esc(err.message || "Enable browser storage and check your connection.") +
    '</p><button class="secondary" onclick="location.reload()">Reload</button></main>';
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .catch(() =>
      toast("Offline setup failed. Reload while connected to try again."),
    );
