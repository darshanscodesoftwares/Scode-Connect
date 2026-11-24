import {
  dateKey,
  dateLabel,
  reminderState,
  normal,
  statuses,
  demand,
  technologies,
} from "./model.js";
import { icon } from "./icons.js";
import {
  esc,
  title,
  btn,
  table,
  avatar,
  badge,
  tech,
  link,
  options,
  field,
  select,
  empty,
  detailGrid,
  panelHead,
  reminderRow,
} from "./ui.js";
import { opportunityCard } from "./dashboard.js";
const sorted = (records, key) =>
  [...records].sort((a, b) => b[key].localeCompare(a[key]));
export const nextReminder = (s, id) =>
  s.reminders
    .filter((r) => r.candidateId === id && !r.completedAt)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
function enquiryRows(s, f) {
  const q = normal(f.search),
    digits = q.replace(/\D/g, "");
  const list = s.calls
    .map((record) => ({
      record,
      candidate: s.candidates.find((c) => c.id === record.candidateId),
    }))
    .filter(
      ({ candidate, record }) =>
        (!q ||
          normal(candidate.name).includes(q) ||
          (digits.length &&
            candidate.phone.replace(/\D/g, "").includes(digits))) &&
        (!f.college || candidate.college === f.college) &&
        (!f.technology || candidate.technology === f.technology) &&
        (!f.status || candidate.status === f.status) &&
        (!f.joining || candidate.desiredJoiningDate?.startsWith(f.joining)) &&
        (!f.date || record.createdAt.startsWith(f.date)),
    );
  list.sort((a, b) =>
    f.sort === "Next follow-up"
      ? (nextReminder(s, a.candidate.id)?.scheduledAt || "9999").localeCompare(
          nextReminder(s, b.candidate.id)?.scheduledAt || "9999",
        )
      : f.sort === "Oldest first"
        ? a.record.createdAt.localeCompare(b.record.createdAt)
        : b.record.createdAt.localeCompare(a.record.createdAt),
  );
  const time = (value) =>
    new Date(value).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  return `<div class="resultcount">${list.length} incoming enquiries</div><div class="enquirytable"><div class="enquirylabels"><span>Caller</span><span>What they asked about</span><span>Received</span><span>Profile</span></div>${
    list
      .map(({ candidate, record }) => {
        const kind = record.audioId
          ? "Voice note"
          : record.transcript
            ? "Processed call"
            : "Call summary";
        const summary =
          record.manualSummary ||
          record.transcript ||
          "No summary was recorded for this enquiry.";
        return `<a class="enquiryrow" href="#/candidates/${encodeURIComponent(candidate.id)}"><span class="identity">${avatar(candidate)}<span><strong>${esc(candidate.name)}</strong><small>${esc(candidate.phone)}</small></span></span><span class="enquirysummary"><strong>${esc(kind)}</strong><small>${esc(summary)}</small></span><span class="enquirytime"><strong>${dateLabel(record.createdAt)}</strong><small>${time(record.createdAt)}</small></span><span class="enquiryprofile">${badge(candidate.status)}<small>Candidate profile</small></span></a>`;
      })
      .join("") || empty("No matching enquiries.")
  }</div>`;
}
export function peopleRows(s, page, f) {
  if (page === "enquiries") return enquiryRows(s, f);
  const rows = s.candidates.map((c) => ({ c, date: c.createdAt }));
  const q = normal(f.search),
    digits = q.replace(/\D/g, "");
  const list = rows.filter(
    ({ c, date }) =>
      (!q ||
        normal(c.name).includes(q) ||
        (digits.length && c.phone.replace(/\D/g, "").includes(digits))) &&
      (!f.college || c.college === f.college) &&
      (!f.technology || c.technology === f.technology) &&
      (!f.status || c.status === f.status) &&
      (!f.joining || c.desiredJoiningDate?.startsWith(f.joining)) &&
      (!f.date || date.startsWith(f.date)),
  );
  list.sort((a, b) =>
    f.sort === "Next follow-up"
      ? (nextReminder(s, a.c.id)?.scheduledAt || "9999").localeCompare(
          nextReminder(s, b.c.id)?.scheduledAt || "9999",
        )
      : f.sort === "Oldest first"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
  );
  return `<div class="resultcount">${list.length} candidate profiles</div>${table(list)}`;
}
export function people(s, page, f) {
  const isCandidates = page === "candidates";
  const filterSelect = (label, key, values) =>
    `<label class="field">${label}<select name="${key}"><option value="">All ${label.toLowerCase()}</option>${options(values, f[key])}</select></label>`;
  return (
    title(
      isCandidates ? "Candidates" : "Enquiries",
      isCandidates
        ? "Manage candidate profiles and internship preferences."
        : "Review every incoming call or voice note before opening its candidate profile.",
      btn("Add enquiry", "add", "", "primary", "plus"),
    ) +
    `<section class="panel"><div class="filterbar"><label class="searchfield">${icon("search", 18)}<input name="search" aria-label="Search by name or phone" placeholder="Search by name or phone" value="${esc(f.search)}" type="search"></label>${btn("Filters", "filters", "", "secondary", "filter")}</div><div id="filters" class="filters" ${f.open ? "" : "hidden"}>${filterSelect("Colleges", "college", [...new Set(s.candidates.map((c) => c.college))].sort())}${filterSelect("Technologies", "technology", [...new Set(s.candidates.map((c) => c.technology))].sort())}${filterSelect("Statuses", "status", statuses)}${field("Desired joining month", "joining", f.joining, "month")}${field("Enquiry date", "date", f.date, "date")}${select("Sort by", "sort", ["Newest first", "Oldest first", "Next follow-up"], f.sort)}${btn("Clear filters", "clearfilters")}</div><div id="peopleResults">${peopleRows(s, page, f)}</div></section>`
  );
}
export function profile(s, c) {
  const calls = sorted(
    s.calls.filter((r) => r.candidateId === c.id),
    "createdAt",
  );
  const reminders = s.reminders
    .filter((r) => r.candidateId === c.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const batches = s.batches.filter((b) => b.candidateIds.includes(c.id));
  const opps = demand(s).filter((o) => o.members.some((m) => m.id === c.id));
  return (
    link("All candidates", "candidates") +
    title(
      c.name,
      c.college,
      btn("Edit candidate", "edit", c.id, "primary", "edit"),
    ) +
    `<div class="profiletop">${avatar(c)}${badge(c.status)}${tech(c.technology)}${btn("Add call record", "add", c.id)}${btn("Add reminder", "newrem", c.id)}</div>
  <div class="insightgrid"><section class="panel">${panelHead("Candidate details")}${detailGrid(
    [
      ["Phone", c.phone],
      ["Email", c.email],
      ["College", c.college],
      ["Department", c.department],
      ["Year of study", c.studyYear],
      ["Assigned HR", c.hr],
      ["Enquiry date", dateLabel(c.createdAt)],
      ["Source", c.source],
      ["Priority", c.priority],
    ],
  )}</section>
  <section class="panel">${panelHead("Internship preferences")}${detailGrid([
    ["Technology", c.technology],
    ["Preferred role", c.role],
    ["Skills", c.skills],
    ["Experience", c.experience],
    ["Projects", c.projects],
    ["Duration", c.duration],
    ["Mode", c.mode],
    ["Desired joining", dateLabel(c.desiredJoiningDate)],
    ["Available from", dateLabel(c.availableFrom)],
    ["Available until", dateLabel(c.availableUntil)],
    ["Flexibility", c.joiningFlexibility],
  ])}</section>
  <section class="panel">${panelHead("Call history")}<div class="recordlist">${calls.map((r) => `<article><small>${dateLabel(r.createdAt, { day: "numeric", month: "short", year: "numeric" })}</small><p>${esc(r.manualSummary || "Enquiry recorded.")}</p>${r.transcript ? `<small>Simulated transcript</small><p>${esc(r.transcript)}</p>` : ""}${r.audioId ? btn("Play voice note", "play", r.audioId) : ""}</article>`).join("") || empty("No calls recorded.")}</div></section>
  <section class="panel">${panelHead("Follow-up history")}${reminders.map((r) => reminderRow(r, c)).join("") || empty("No reminders scheduled.")}</section>
  <section class="panel">${panelHead("Batches and opportunities")}<div class="recordlist">${batches.map((b) => `<article>${link(b.name, "batches/" + b.id)} ${badge(b.status)}</article>`).join("")}${opps.map((o) => btn(o.technology + " opportunity", "opportunity", o.id)).join("")}${!batches.length && !opps.length ? empty("No matching batches yet.") : ""}</div></section><section class="panel">${panelHead("Internal remarks")}<div class="recordlist">${
    [...(c.remarksHistory || [])]
      .reverse()
      .map(
        (r) =>
          `<article><small>${dateLabel(r.at)}</small><p>${esc(r.text)}</p></article>`,
      )
      .join("") || empty("No remarks recorded.")
  }</div></section></div><div class="pagefoot">${btn("Delete candidate", "delete", c.id, "danger", "trash")}</div>`
  );
}
export function followups(s) {
  const groups = [
    ["Overdue", "Overdue"],
    ["Due today", "Due Today"],
    ["Upcoming", "Upcoming"],
    ["Completed", "Completed"],
  ];
  return (
    title(
      "Follow-ups",
      "Track callbacks and keep candidate conversations moving.",
      btn("Add reminder", "newrem", "", "primary", "plus"),
    ) +
    `<div class="insightgrid">${groups
      .map(([h, key]) => {
        const group = s.reminders
          .filter((r) => {
            const st = reminderState(r);
            return st === key || (key === "Upcoming" && st === "Snoozed");
          })
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        const sectionClass =
          key === "Overdue"
            ? " followup-overdue"
            : key === "Completed"
              ? " followup-completed"
              : "";
        return `<section class="panel followup-section${sectionClass}">${panelHead(h, `<span class="count">${group.length}</span>`)}${
          group
            .map((r) =>
              reminderRow(
                r,
                s.candidates.find((c) => c.id === r.candidateId),
              ),
            )
            .join("") || empty("No " + h.toLowerCase() + " reminders.")
        }</section>`;
      })
      .join("")}</div>`
  );
}
export function opportunities(s) {
  const opps = demand(s);
  return (
    title(
      "Batch opportunities",
      "Candidate groups with a compatible technology and joining window.",
    ) +
    `<div class="cardgrid">${opps.map(opportunityCard).join("") || empty("No groups currently meet the demand threshold.")}</div>`
  );
}
export function batches(s) {
  return (
    title(
      "Batches",
      "Plan internships and manage enrolment.",
      btn("Create batch", "batch", "", "primary", "plus"),
    ) +
    `<div class="cardgrid">${
      sorted(s.batches, "startDate")
        .map(
          (b) =>
            `<a class="oppcard batchcard" href="#/batches/${b.id}"><div class="opphead"><span class="tileicon purpletone">${icon("layers")}</span>${badge(b.status)}</div><h3>${esc(b.name)}</h3><p>${esc(b.technology)}</p><div class="oppmeta">${icon("calendar", 16)} ${dateLabel(b.startDate)} · ${esc(b.duration || dateLabel(b.endDate))}</div><div class="oppmeta">${icon("users", 16)} ${b.candidateIds.length} selected candidates</div></a>`,
        )
        .join("") || empty("No batches created yet.")
    }</div>`
  );
}
export function batchDetail(s, b) {
  const members = s.candidates.filter((c) => b.candidateIds.includes(c.id));
  return (
    link("All batches", "batches") +
    title(
      b.name,
      b.technology + " internship",
      btn("Edit batch", "batch", b.id, "primary", "edit"),
    ) +
    `<section class="panel">${panelHead("Batch details", badge(b.status))}${detailGrid(
      [
        ["Start date", dateLabel(b.startDate)],
        ["End date", dateLabel(b.endDate)],
        ["Duration", b.duration],
        ["Capacity", b.capacity || "Open"],
        ["Selected candidates", members.length],
        ["Enrolled", members.filter((c) => c.status === "Enrolled").length],
        [
          "Participating colleges",
          [...new Set(members.map((c) => c.college))].join(", "),
        ],
        ["Internal remarks", b.remarks],
      ],
    )}</section><section class="panel spaced">${panelHead("Batch candidates")}<div class="recordlist">${members.map((c) => `<article class="member"><a class="identity" href="#/candidates/${c.id}">${avatar(c)}<span><strong>${esc(c.name)}</strong><small>${esc(c.college)}</small></span></a>${badge(c.status)}${c.status === "Enrolled" || ["Cancelled", "Completed"].includes(b.status) ? "" : btn("Enrol", "enrol", b.id + "|" + c.id)}</article>`).join("") || empty("No candidates selected.")}</div></section>`
  );
}
