import { icon } from "./icons.js";
import {
  dateLabel,
  dateKey,
  shiftDay,
  reminderState,
  demand,
} from "./model.js";
import {
  esc,
  title,
  btn,
  link,
  table,
  panelHead,
  reminderRow,
  empty,
  barList,
} from "./ui.js";
function curve(points) {
  return points.slice(1).reduce(
    (path, p, i) => {
      const prev = points[i],
        mid = (prev[0] + p[0]) / 2;
      return (
        path +
        " C " +
        mid +
        " " +
        prev[1] +
        ", " +
        mid +
        " " +
        p[1] +
        ", " +
        p[0] +
        " " +
        p[1]
      );
    },
    "M " + points[0].join(" "),
  );
}
function spark(values) {
  const max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const points = values.map((v, i) => [
    2 + (i * 52) / (values.length - 1),
    25 - ((v - min) / (max - min)) * 19,
  ]);
  return `<svg class="sparkline" aria-hidden="true" viewBox="0 0 56 30"><path d="${curve(points)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function metric(label, val, note, route, glyph, color, series) {
  return `<a class="metric ${color}" href="#/${route}"><div class="metriclabel"><span class="tileicon">${icon(glyph, 19)}</span><span>${label}</span></div><div class="metricvalue"><strong>${val}</strong>${spark(series)}</div><small>${esc(note)}</small></a>`;
}
export function opportunityCard(o) {
  return `<article class="oppcard"><div class="opphead"><span class="tileicon purpletone">${icon("layers")}</span><span class="softlabel">Suggested</span></div><h3>${esc(o.technology)} internship</h3><p>${dateLabel(o.start, { month: "long", year: "numeric" })}</p><div class="oppmeta">${icon("users", 16)} ${o.members.length} candidates <span>·</span> ${o.colleges} colleges</div><div class="oppmeta">${icon("calendar", 16)} ${dateLabel(o.start)} suggested start</div><p>${o.confirmed} interested · ${o.members.length - o.confirmed} awaiting follow-up</p>${btn("Review opportunity", "opportunity", o.id, "secondary")}</article>`;
}
function spotlight(o) {
  if (!o) {
    return `<section class="panel spotlightpanel"><span class="tileicon purpletone">${icon("layers")}</span><h2>No batch opportunity yet</h2><p>When enough candidates share a technology and joining window, ScodeConnect will suggest a group here.</p>${link("View all opportunities", "opportunities")}</section>`;
  }
  return `<section class="panel spotlightpanel"><div class="spotlighthead"><span class="tileicon purpletone">${icon("layers")}</span><span class="softlabel">Ready to review</span></div><h2>${esc(o.technology)} internship group</h2><p>${o.members.length} candidates across ${o.colleges} colleges can potentially join from ${dateLabel(o.start)}.</p><div class="spotlightfacts"><span>${icon("users", 16)} ${o.confirmed} interested</span><span>${icon("clock", 16)} ${o.members.length - o.confirmed} to confirm</span></div>${btn("Review group", "opportunity", o.id, "secondary")}</section>`;
}
export function dashboard(s) {
  const opps = demand(s),
    active = s.batches.filter((b) => b.status === "Active");
  const reminders = s.reminders
    .filter((r) => !r.completedAt)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const overdue = reminders.filter((r) => reminderState(r) === "Overdue");
  const due = reminders.filter((r) =>
    ["Overdue", "Due Today"].includes(reminderState(r)),
  );
  const newCandidates = s.candidates.filter((c) => c.status === "New");
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(i - 6));
  const trend = (items, field) =>
    days.map((d) => items.filter((x) => x[field]?.startsWith(d)).length);
  const recent = [...s.calls]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((r) => ({
      c: s.candidates.find((c) => c.id === r.candidateId),
      date: r.createdAt,
    }));
  return (
    title(
      "Today at ScodeConnect",
      "Start with conversations that need your attention.",
      btn("Add enquiry", "add", "", "primary", "plus"),
    ) +
    `<section class="worksummary"><div><span class="eyebrow">Today’s priorities</span><h2>${overdue.length ? overdue.length + " overdue follow-up" + (overdue.length === 1 ? "" : "s") : due.length ? due.length + " follow-up" + (due.length === 1 ? "" : "s") + " due today" : "You are caught up"}</h2><p>${newCandidates.length} new candidate${newCandidates.length === 1 ? " is" : "s are"} awaiting an initial review. ${opps.length ? opps.length + " group" + (opps.length === 1 ? " is" : "s are") + " ready to review." : ""}</p></div><div class="summaryactions">${link("Open follow-ups", "follow-ups")}${link("View opportunities", "opportunities")}</div></section>
    <div class="metrics">
  ${metric("Enquiry calls", s.calls.length, "from " + s.candidates.length + " candidates", "enquiries", "inbox", "violet", trend(s.calls, "createdAt"))}
  ${metric("New candidates", newCandidates.length, "awaiting first review", "candidates", "users", "teal", trend(newCandidates, "createdAt"))}
  ${metric("Follow-ups", due.length, overdue.length ? overdue.length + " overdue" : "all on schedule", "follow-ups", "clock", "orange", trend(reminders, "scheduledAt"))}
  ${metric(
    "Batch groups",
    opps.length,
    active.length + " active batches",
    "opportunities",
    "layers",
    "blue",
    days.map((d) => opps.filter((o) => o.start <= d).length),
  )}
  </div><div class="prioritygrid"><section class="panel todaypanel">${panelHead("Today’s follow-ups", link("Open all", "follow-ups"), overdue.length ? overdue.length + " overdue" : "Calls to make or complete")}<div>${
    reminders
      .slice(0, 3)
      .map((r) =>
        reminderRow(
          r,
          s.candidates.find((c) => c.id === r.candidateId),
          true,
        ),
      )
      .join("") || empty("You are caught up.")
  }</div></section>${spotlight(opps[0])}</div>
  <section class="panel recent">${panelHead("Recent enquiries", link("View all", "enquiries"), "Latest calls and candidate updates")}${table(recent)}</section>
  <section class="pipeline"><div class="panelhead"><div><h2>${opps.length > 1 ? "More batch groups" : "Batch groups"}</h2><p>Groups are based on compatible technology and joining dates.</p></div>${link("View all", "opportunities")}</div><div class="cardgrid">${opps.slice(1, 3).map(opportunityCard).join("") || (opps.length ? empty("No other groups need review.") : empty("No matching groups yet."))}</div></section>`
  );
}
export function insights(s) {
  const enrolled = s.candidates.filter((c) => c.status === "Enrolled").length;
  const groups = [
    [
      "Enquiries by month",
      s.calls.map((c) =>
        dateLabel(c.createdAt, { month: "long", year: "numeric" }),
      ),
    ],
    ["Demand by technology", s.candidates.map((c) => c.technology)],
    ["Candidates by college", s.candidates.map((c) => c.college)],
    [
      "Desired joining month",
      s.candidates.map((c) =>
        c.desiredJoiningDate
          ? dateLabel(c.desiredJoiningDate, { month: "long", year: "numeric" })
          : "Unspecified",
      ),
    ],
    ["Candidate status", s.candidates.map((c) => c.status)],
    [
      "Follow-up progress",
      s.reminders.map((r) => (r.completedAt ? "Completed" : "Pending")),
    ],
  ];
  return (
    title(
      "Insights",
      "Internship demand and conversion across your workspace.",
    ) +
    `<div class="simplemetrics">${[
      [
        "Enrolment conversion",
        Math.round((100 * enrolled) / (s.candidates.length || 1)) + "%",
      ],
      ["Enrolled candidates", enrolled],
      ["Batches created", s.batches.length],
    ]
      .map(
        ([l, v]) =>
          `<div class="panel"><small>${l}</small><strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="insightgrid">${groups.map(([h, values]) => `<section class="panel">${panelHead(h)}${barList(values)}</section>`).join("")}</div>`
  );
}
