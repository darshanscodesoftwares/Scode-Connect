import test from "node:test";
import assert from "node:assert/strict";
import {
  demand,
  duplicates,
  reminderState,
  removeCandidate,
  dateKey,
} from "../app/model.js";
import { seed } from "../app/seed.js";
const today = "2027-01-01";
function candidate(id, from, until, overrides = {}) {
  return {
    id,
    name: id,
    college: "College " + id,
    technology: "Flutter",
    availableFrom: from,
    availableUntil: until,
    desiredJoiningDate: from,
    joiningFlexibility: "Flexible within availability",
    status: "Interested",
    ...overrides,
  };
}
const workspace = (candidates) => ({
  candidates,
  batches: [],
  dismissed: [],
  threshold: 2,
});
test("shared start works across colleges and retains actual interest counts", () => {
  const people = [
    candidate("a", today, "2027-01-20"),
    candidate("b", "2027-01-05", "2027-01-15", {
      desiredJoiningDate: "2027-01-12",
      status: "New",
    }),
    candidate("c", "2027-01-10", "2027-01-20", {
      desiredJoiningDate: "2027-01-14",
    }),
  ];
  const [o] = demand(workspace(people), today);
  assert.equal(o.start, "2027-01-12");
  assert.equal(o.colleges, 3);
  assert.equal(o.confirmed, 2);
});
test("disjoint fixed dates, unknown availability and expired windows do not group", () => {
  const people = [
    candidate("a", today, "2027-01-30", {
      joiningFlexibility: "Fixed date",
      desiredJoiningDate: "2027-01-05",
    }),
    candidate("b", "2027-01-24", "2027-01-26"),
    candidate("c", "", ""),
    candidate("d", "2026-12-01", "2026-12-31"),
  ];
  assert.deepEqual(demand(workspace(people), today), []);
});
test("pairwise overlap in a chain never produces an impossible common date", () => {
  const s = workspace([
    candidate("a", today, "2027-01-05"),
    candidate("b", "2027-01-04", "2027-01-12"),
    candidate("c", "2027-01-10", "2027-01-21"),
  ]);
  const [o] = demand(s, today);
  assert.equal(o.members.length, 2);
  assert.ok(
    o.members.every(
      (c) => c.availableFrom <= o.start && c.availableUntil >= o.start,
    ),
  );
});
test("excludes enrolled, uninterested and reserved candidates", () => {
  const s = workspace(
    ["a", "b", "c", "d"].map((id) => candidate(id, today, "2027-01-20")),
  );
  s.candidates[1].status = "Enrolled";
  s.candidates[2].status = "Not Interested";
  s.batches = [{ candidateIds: ["d"], status: "Proposed" }];
  assert.equal(demand(s, today).length, 0);
  s.batches[0].status = "Cancelled";
  assert.equal(demand(s, today).length, 1);
});
test("duplicate checks normalize name and Indian phone formats", () => {
  const c = { id: "1", name: "Raj Kumar", phone: "+91 00000 12345" };
  assert.deepEqual(
    duplicates([c], { name: " Someone ", phone: "0000012345" }),
    [c],
  );
  assert.deepEqual(
    duplicates([c], { name: " raj  KUMAR ", phone: "12345678" }),
    [c],
  );
  assert.deepEqual(duplicates([c], c), []);
});
test("follow-up statuses change on the local time boundary", () => {
  const now = new Date(2027, 0, 4, 12);
  const state = (t, extra) => reminderState({ scheduledAt: t, ...extra }, now);
  assert.equal(state("2027-01-04T11:59"), "Overdue");
  assert.equal(state("2027-01-04T12:01"), "Due Today");
  assert.equal(state("2027-01-05T09:00", { snoozed: true }), "Snoozed");
  assert.equal(
    state("2027-01-03T08:00", { completedAt: "2027-01-03" }),
    "Completed",
  );
});
test("seed has linked records, meaningful opportunities and working deletion", () => {
  const s = seed(new Date(2026, 10, 24));
  assert.equal(s.candidates.length, 18);
  assert.equal(s.calls.length, 24);
  assert.deepEqual(
    demand(s, "2026-11-24").map((o) => o.technology),
    ["Flutter", "React", "AI/ML"],
  );
  const member = s.batches[0].candidateIds[0];
  removeCandidate(s, member);
  assert.ok(s.calls.every((c) => c.candidateId !== member));
  assert.ok(s.batches.every((b) => !b.candidateIds.includes(member)));
  assert.ok(!s.candidates.some((c) => c.id === member));
});
