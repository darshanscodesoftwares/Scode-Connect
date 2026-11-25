import { icon } from "./icons.js";
import { dateKey, dateLabel, reminderState, counts } from "./model.js";
export const esc = (str) =>
  String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const navItems = [
  ["dashboard", "Dashboard", "grid"],
  ["enquiries", "Enquiries", "inbox"],
  ["candidates", "Candidates", "users"],
  ["opportunities", "Batch opportunities", "spark"],
  ["batches", "Batches", "layers"],
  ["follow-ups", "Follow-ups", "clock"],
  ["insights", "Insights", "chart"],
  ["settings", "Settings", "settings"],
];
export const btn = (label, action, id = "", style = "secondary", glyph = "") =>
  `<button type="button" class="${style}" data-action="${action}" data-id="${esc(id)}">${glyph ? icon(glyph, 16) : ""}${esc(label)}</button>`;
export const link = (label, route) =>
  `<a class="textlink" href="#/${route}">${esc(label)}</a>`;
const statusDescriptions = {
  New: "Recently added; ready for an initial contact.",
  Contacted: "The candidate has been contacted.",
  Interested: "The candidate is interested in an internship.",
  "Follow-up Required": "Another contact or action is needed.",
  "Batch Proposed": "A batch option has been proposed to this candidate.",
  Enrolled: "The candidate has joined a batch.",
  "Not Interested": "The candidate has declined or is no longer interested.",
  Proposed: "The batch is suggested and awaiting planning.",
  Planning: "The team is arranging the batch.",
  Confirmed: "The batch has been confirmed.",
  Active: "The batch is currently running.",
  Completed: "The batch or follow-up is finished.",
  Cancelled: "The batch will not proceed.",
  Overdue: "This reminder's scheduled time has passed.",
  "Due Today": "This reminder is scheduled for today.",
  Upcoming: "This reminder is scheduled for a future date.",
  Snoozed: "This reminder was postponed to a later time.",
  High: "This item needs higher priority attention.",
  Normal: "This item has standard priority.",
  Low: "This item has lower priority.",
};
const badgeColors = {
  Interested: "green",
  Enrolled: "green",
  Active: "green",
  Completed: "green",
  New: "blue",
  Contacted: "purple",
  "Follow-up Required": "amber",
  Overdue: "red",
  "Due Today": "amber",
  Proposed: "purple",
  "Batch Proposed": "purple",
  High: "red",
  Confirmed: "blue",
  Snoozed: "purple",
};
export const badge = (s) => {
  const description = statusDescriptions[s];
  const id = `status-tip-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const accessibleText = description ? `${s}: ${description}` : s;
  return `<span class="badge-wrap">${description ? `<span class="badge-tip" role="tooltip">${esc(description)}</span>` : ""}<span class="badge ${badgeColors[s] || "gray"}" tabindex="0" aria-label="${esc(accessibleText)}"${description ? ` aria-describedby="${id}"` : ""}><i></i>${esc(s)}</span>${description ? `<span id="${id}" class="sr-only">${esc(description)}</span>` : ""}</span>`;
};
export const empty = (s) =>
  `<div class="empty">${icon("inbox", 24)}<span>${esc(s)}</span></div>`;
export const options = (values, selected = "") =>
  values
    .map(
      (v) =>
        `<option value="${esc(v)}"${v === selected ? " selected" : ""}>${esc(v)}</option>`,
    )
    .join("");
export const field = (label, name, value = "", type = "text", attrs = "") =>
  `<label class="field">${esc(label)}<input type="${type}" name="${name}" value="${esc(value)}" ${attrs}></label>`;
export const select = (label, name, values, current = "", attrs = "") =>
  `<label class="field">${esc(label)}<select name="${name}" ${attrs}>${options(values, current)}</select></label>`;
export const area = (label, name, value = "") =>
  `<label class="field full">${esc(label)}<textarea name="${name}" rows="2">${esc(value)}</textarea></label>`;
export const section = (title, body) =>
  `<fieldset><legend>${esc(title)}</legend><div class="formgrid">${body}</div></fieldset>`;
export const avatar = (c) => {
  let n = 0;
  for (const ch of c.name) n += ch.codePointAt(0);
  return `<span aria-hidden="true" class="avatar tint${n % 6}">${esc(
    c.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase(),
  )}</span>`;
};
export const tech = (t) =>
  `<span class="tech"><i class="techdot t${["Flutter", "React", "Python", "AI/ML"].indexOf(t)}"></i>${esc(t)}</span>`;
export const panelHead = (title, extra = "", sub = "") =>
  `<div class="panelhead"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${extra}</div>`;
export const title = (heading, subtitle, action = "") =>
  `<div class="pagehead"><div><h1>${esc(heading)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
export function table(rows, dateTitle = "Enquiry date") {
  if (!rows.length) return empty("No matching records.");
  return `<div class="people"><div class="tablelabels"><span>Candidate</span><span>Technology</span><span>Status</span><span>${dateTitle}</span></div>${rows.map(({ c, date, summary }) => `<a class="personrow" href="#/candidates/${encodeURIComponent(c.id)}"><span class="identity">${avatar(c)}<span><strong>${esc(c.name)}</strong><small>${esc(summary || c.college)}</small></span></span><span>${tech(c.technology)}</span><span>${badge(c.status)}</span><span class="rowdate">${dateLabel(date)}</span></a>`).join("")}</div>`;
}
export function reminderRow(r, c, compact = false) {
  const state = reminderState(r);
  const when = new Date(r.scheduledAt);
  const day = dateKey(when) === dateKey() ? "Today" : dateLabel(r.scheduledAt);
  const time = when.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `<div class="remrow ${compact ? "compact" : ""}"><a class="identity" href="#/candidates/${encodeURIComponent(c.id)}">${avatar(c)}<span><strong>${esc(c.name)}</strong><small>${esc(r.title)}</small></span></a><div class="when ${state === "Overdue" ? "late" : ""}">${compact && state === "Overdue" ? "Overdue" : day}<small>${compact && state === "Overdue" ? day : time}</small></div>${compact ? "" : `<div class="remdetails">${badge(state)} ${esc(r.priority)} priority${r.description ? " · " + esc(r.description) : ""}</div><div class="actions">${r.completedAt ? "" : btn("Complete", "complete", r.id, "secondary", "check") + btn("Snooze 1 day", "snooze", r.id)}${btn("Edit reminder", "reminder", r.id)}</div>`}</div>`;
}
export function barList(values) {
  const pairs = counts(values);
  return pairs.length
    ? `<div class="barlist">${pairs.map(([k, v], i) => `<div><div class="barlabel"><span>${esc(k)}</span><b>${v}</b></div><div class="track"><i style="width:${(v / pairs[0][1]) * 100}%;background:var(--bar${i % 4})"></i></div></div>`).join("")}</div>`
    : empty("No data yet.");
}
export function detailGrid(entries) {
  return (
    '<dl class="detailgrid">' +
    entries
      .filter(([, v]) => v !== "" && v != null)
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
      .join("") +
    "</dl>"
  );
}
