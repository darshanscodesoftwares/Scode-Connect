export const statuses = [
  "New",
  "Contacted",
  "Interested",
  "Follow-up Required",
  "Batch Proposed",
  "Enrolled",
  "Not Interested",
];
export const batchStatuses = [
  "Proposed",
  "Planning",
  "Confirmed",
  "Active",
  "Completed",
  "Cancelled",
];
export const technologies = ["Flutter", "React", "Python", "AI/ML"];
export const priorities = ["Normal", "High", "Low"];
export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
export const dateKey = (d = new Date()) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
export function shiftDay(n, base = new Date()) {
  const day = new Date(base);
  day.setDate(day.getDate() + n);
  return dateKey(day);
}
export const parseDay = (value) => new Date(value + "T12:00:00");
export function dateLabel(value, options = { day: "numeric", month: "short" }) {
  return value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString("en-GB", options)
    : "Unspecified";
}
export const normal = (value) =>
  (value || "").trim().replace(/\s+/g, " ").toLowerCase();
export const phoneKey = (value) =>
  value.replace(/\D/g, "").replace(/^(?:0091|91)(?=\d{10}$)/, "");
export function duplicates(people, candidate) {
  return people.filter(
    (c) =>
      c.id !== candidate.id &&
      (phoneKey(c.phone) === phoneKey(candidate.phone) ||
        normal(c.name) === normal(candidate.name)),
  );
}
export function reminderState(r, now = new Date()) {
  if (r.completedAt) return "Completed";
  if (new Date(r.scheduledAt) < now) return "Overdue";
  if (dateKey(new Date(r.scheduledAt)) === dateKey(now)) return "Due Today";
  return r.snoozed ? "Snoozed" : "Upcoming";
}
export function counts(values) {
  const items = new Map();
  for (const v of values.filter(Boolean)) items.set(v, (items.get(v) || 0) + 1);
  return [...items.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}
export function demand(state, today = dateKey()) {
  const reserved = new Set(
    state.batches
      .filter((b) => !["Completed", "Cancelled"].includes(b.status))
      .flatMap((b) => b.candidateIds),
  );
  const pools = new Map();
  for (const c of state.candidates) {
    if (
      reserved.has(c.id) ||
      ["Not Interested", "Enrolled"].includes(c.status) ||
      !c.availableFrom ||
      !c.availableUntil
    )
      continue;
    let start = c.availableFrom > today ? c.availableFrom : today;
    let end = c.availableUntil;
    if (c.joiningFlexibility === "Fixed date") {
      if (
        !c.desiredJoiningDate ||
        c.desiredJoiningDate < start ||
        c.desiredJoiningDate > end
      )
        continue;
      start = end = c.desiredJoiningDate;
    }
    if (start > end) continue;
    const key = normal(c.technology || c.role);
    if (!key) continue;
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key).push({ c, start, end });
  }
  const result = [];
  for (const [key, pool] of pools) {
    let remaining = pool;
    while (remaining.length >= state.threshold) {
      let best = [];
      let bestDay = "";
      let bestDistance = Infinity;
      const days = [
        ...new Set(
          remaining
            .flatMap((x) => [x.start, x.end, x.c.desiredJoiningDate])
            .filter(Boolean),
        ),
      ].sort();
      for (const day of days) {
        const group = remaining.filter((x) => x.start <= day && day <= x.end);
        const distance = group.reduce(
          (n, x) =>
            n +
            (x.c.desiredJoiningDate
              ? Math.abs(Date.parse(day) - Date.parse(x.c.desiredJoiningDate))
              : 0),
          0,
        );
        if (
          group.length > best.length ||
          (group.length === best.length && distance < bestDistance)
        ) {
          best = group;
          bestDay = day;
          bestDistance = distance;
        }
      }
      if (best.length < state.threshold) break;
      const members = best.map((x) => x.c);
      const id = [key, bestDay, ...members.map((c) => c.id).sort()].join("|");
      if (!state.dismissed.includes(id))
        result.push({
          id,
          technology: members[0].technology || members[0].role,
          start: bestDay,
          members,
          colleges: new Set(members.map((c) => normal(c.college))).size,
          confirmed: members.filter((c) => c.status === "Interested").length,
        });
      remaining = remaining.filter((x) => !best.includes(x));
    }
  }
  return result.sort((a, b) => a.start.localeCompare(b.start));
}
export function removeCandidate(state, id) {
  state.candidates = state.candidates.filter((c) => c.id !== id);
  state.calls = state.calls.filter((r) => r.candidateId !== id);
  state.reminders = state.reminders.filter((r) => r.candidateId !== id);
  for (const batch of state.batches)
    batch.candidateIds = batch.candidateIds.filter((i) => i !== id);
}
