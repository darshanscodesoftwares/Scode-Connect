import {
  dateKey,
  dateLabel,
  shiftDay,
  uid,
  duplicates,
  phoneKey,
  statuses,
  batchStatuses,
  technologies,
  priorities,
  normal,
  demand,
} from "./model.js";
import { simulatedEnquiry } from "./seed.js";
import {
  esc,
  btn,
  field,
  select,
  area,
  section,
  options,
  badge,
  avatar,
  detailGrid,
  empty,
} from "./ui.js";
import { icon } from "./icons.js";
import { readAudio } from "./storage.js";
const dialog = document.querySelector("#dialog");
let onClose = () => {};
export function closeDialog() {
  if (dialog.open) dialog.close();
  onClose();
  onClose = () => {};
}
function modal(heading, body, submitLabel, save, cleanup = () => {}) {
  onClose();
  onClose = cleanup;
  dialog.innerHTML = `<div class="modalhead"><h2>${esc(heading)}</h2><button type="button" aria-label="Close dialog" class="iconbtn" id="dismiss">${icon("close")}</button></div><form id="modalform"><div class="modalbody">${body}<p class="formerror" role="alert" hidden></p></div>${submitLabel ? `<div class="modalfoot"><button type="button" id="cancel" class="secondary">Cancel</button><button class="primary" type="submit">${esc(submitLabel)}</button></div>` : ""}</form>`;
  dialog.setAttribute("aria-label", heading);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector(".modalbody").scrollTop = 0;
  dialog.querySelector("#dismiss").onclick = closeDialog;
  if (submitLabel) dialog.querySelector("#cancel").onclick = closeDialog;
  dialog.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.submitter;
    if (button) button.disabled = true;
    const data = Object.fromEntries(
      [...new FormData(e.target)].map(([k, v]) => [
        k,
        typeof v === "string" ? v.trim() : v,
      ]),
    );
    try {
      await save(data, e.target);
    } catch (err) {
      error(err.message);
    } finally {
      if (button) button.disabled = false;
    }
  };
}
dialog.addEventListener("cancel", () => {
  onClose();
  onClose = () => {};
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) closeDialog();
});
function error(message) {
  const el = dialog.querySelector(".formerror");
  if (el) {
    el.textContent = message;
    el.hidden = false;
    el.scrollIntoView({ block: "nearest" });
  }
}
export function confirmAction(heading, body, label, action) {
  modal(heading, `<p class="confirmtext">${esc(body)}</p>`, label, async () => {
    await action();
    closeDialog();
  });
}
export function forms(ctx) {
  const byId = (id) => ctx.get().candidates.find((c) => c.id === id);
  const nextTime = () => shiftDay(1) + "T10:00";
  const candidateOptions = (id) =>
    [...ctx.get().candidates]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (c) =>
          `<option value="${esc(c.id)}"${c.id === id ? " selected" : ""}>${esc(c.name + " · " + c.phone)}</option>`,
      )
      .join("");
  async function play(id) {
    const blob = await readAudio(id);
    if (!blob) throw Error("The recording is unavailable on this device.");
    const url = URL.createObjectURL(blob);
    modal("Voice note", `<audio controls src="${url}"></audio>`, "", null, () =>
      URL.revokeObjectURL(url),
    );
  }
  function capture(existingId = "") {
    let blob,
      url,
      stream,
      recorder,
      closed = false,
      processing = false;
    const stopStream = () => stream?.getTracks().forEach((t) => t.stop());
    const finish = () => {
      closed = true;
      if (recorder?.state === "recording") recorder.stop();
      stopStream();
      if (url) URL.revokeObjectURL(url);
    };
    modal(
      "Add enquiry",
      `<label class="field">Candidate<select id="existing"><option value="">New candidate</option>${candidateOptions(existingId)}</select></label>
    <div class="capture"><span class="captureicon">${icon("mic", 26)}</span><h3>Voice note</h3><p>Record a call summary or attach an audio file.</p><div class="actions"><label class="secondary upload">${icon("upload", 16)} Upload audio<input id="file" type="file" accept="audio/*,.m4a,.mp3,.wav,.webm"></label><button type="button" id="record" class="secondary">${icon("mic", 16)} Record</button></div><small id="recordState"></small><audio id="preview" controls hidden></audio></div>
    ${area("Call summary", "summary")}<div class="mocknote">${icon("info", 18)}<span>Voice processing uses a simulated transcript. Review the details before saving.</span></div><button type="button" class="secondary" id="process" disabled>${icon("spark", 16)} Process voice note</button>`,
      "Continue to review",
      (data) => {
        if (processing || recorder?.state === "recording")
          throw Error("Finish recording or processing before continuing.");
        const id = dialog.querySelector("#existing").value;
        candidateForm(byId(id) || {}, { blob, summary: data.summary }, true);
      },
      finish,
    );
    const file = dialog.querySelector("#file"),
      record = dialog.querySelector("#record"),
      process = dialog.querySelector("#process"),
      status = dialog.querySelector("#recordState");
    function setBlob(value, name) {
      if (!value.size) {
        error("The audio file is empty. Choose another file.");
        return;
      }
      if (url) URL.revokeObjectURL(url);
      blob = value;
      url = URL.createObjectURL(blob);
      const player = dialog.querySelector("#preview");
      player.src = url;
      player.hidden = false;
      process.disabled = false;
      status.textContent = name;
    }
    file.onchange = () => {
      if (file.files[0]) setBlob(file.files[0], file.files[0].name);
    };
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      record.disabled = true;
      status.textContent =
        "Recording is unavailable in this browser. Upload audio or enter a summary.";
    }
    record.onclick = async () => {
      if (recorder?.state === "recording") {
        recorder.stop();
        return;
      }
      record.disabled = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (closed) {
          stopStream();
          return;
        }
        recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onstop = () => {
          stopStream();
          if (closed) return;
          setBlob(
            new Blob(chunks, { type: recorder.mimeType }),
            "Recorded voice note",
          );
          record.textContent = "Record again";
          file.disabled = false;
        };
        recorder.onerror = () => {
          stopStream();
          error("Recording failed. Upload an audio file or enter a summary.");
        };
        recorder.start();
        record.textContent = "Stop recording";
        status.textContent = "Recording…";
        file.disabled = true;
        process.disabled = true;
      } catch {
        stopStream();
        error(
          "Microphone unavailable. Allow access, upload audio, or enter a summary.",
        );
      } finally {
        record.disabled = false;
      }
    };
    process.onclick = async () => {
      processing = true;
      process.disabled = true;
      file.disabled = true;
      record.disabled = true;
      process.textContent = "Processing demo…";
      await new Promise((resolve) => setTimeout(resolve, 550));
      if (closed) return;
      const mock = simulatedEnquiry(),
        id = dialog.querySelector("#existing").value;
      candidateForm(
        byId(id) || mock.fields,
        {
          blob,
          transcript: mock.transcript,
          extractedDetails: mock.fields,
          summary: dialog.querySelector("[name=summary]").value,
        },
        true,
      );
    };
  }
  function candidateForm(c = {}, call = null, adding = false) {
    const knownTech = [
      ...new Set([
        ...technologies,
        ...ctx.get().candidates.map((x) => x.technology),
      ]),
    ];
    const form = (f, label, type = "text", attrs = "") =>
      field(label, f, c[f], type, attrs);
    const pick = (f, label, values, defaultValue) =>
      select(label, f, values, c[f] || defaultValue);
    const info = call?.transcript
      ? `<div class="mockbox"><strong>Simulated transcript</strong><p>${esc(call.transcript)}</p><small>${c.id ? "Existing profile selected. Review any updates below." : "Review the extracted fields and add a contact number."}</small></div>`
      : "";
    const date = call ? dateKey() : (c.createdAt || dateKey()).slice(0, 10);
    const body =
      info +
      section(
        "Basic details",
        form(
          "name",
          "Full name",
          "text",
          'required maxlength="120" autocomplete="name"',
        ) +
          form("phone", "Phone number", "tel", 'required autocomplete="tel"') +
          form("college", "College or university", "text", "required") +
          form("email", "Email address", "email") +
          form("department", "Department or course") +
          form("studyYear", "Year of study"),
      ) +
      section(
        "Internship preferences",
        form(
          "technology",
          "Technology or role",
          "text",
          'list="technologies" required',
        ) +
          `<datalist id="technologies">${options(knownTech)}</datalist>` +
          form("role", "Preferred role") +
          form("skills", "Skills") +
          form("experience", "Previous experience") +
          form("projects", "Project experience") +
          form("duration", "Preferred duration") +
          pick(
            "mode",
            "Internship mode",
            ["", "Onsite", "Remote", "Hybrid"],
            "",
          ),
      ) +
      section(
        "Joining preferences",
        form("desiredJoiningDate", "Desired joining date", "date") +
          pick(
            "joiningFlexibility",
            "Joining flexibility",
            ["Flexible within availability", "Fixed date"],
            "Flexible within availability",
          ) +
          form("availableFrom", "Available from", "date") +
          form("availableUntil", "Available until", "date"),
      ) +
      section(
        "Enquiry management",
        field("Enquiry date", "enquiryDate", date, "date", "required") +
          pick("status", "Candidate status", statuses, "New") +
          pick("priority", "Priority", priorities, "Normal") +
          form("hr", "Assigned HR") +
          field("Source", "source", c.source || "Phone call") +
          field("Schedule a follow-up", "nextFollow", "", "datetime-local") +
          area("Internal remarks", "remarks", c.remarks) +
          (adding ? area("Call summary", "manualSummary", call?.summary) : ""),
      ) +
      '<div id="matches" role="status"></div>';
    modal(
      adding ? "Review enquiry" : "Edit candidate",
      body,
      adding ? "Save enquiry" : "Save changes",
      async (data) => {
        if (!data.name || !data.technology || !data.college)
          throw Error("Enter a name, college and technology.");
        if (
          !/^\+?[\d ()-]+$/.test(data.phone) ||
          phoneKey(data.phone).length < 7
        )
          throw Error("Enter a valid contact number.");
        if (
          data.availableFrom &&
          data.availableUntil &&
          data.availableUntil < data.availableFrom
        )
          throw Error("Availability must end on or after its start date.");
        const matches = duplicates(ctx.get().candidates, { ...data, id: c.id });
        if (matches.length) {
          const target = dialog.querySelector("#matches");
          target.innerHTML = `<div class="mockbox"><strong>Possible existing candidate</strong><p>Review the matching profile. You can attach this call to an existing candidate.</p>${matches.map((m) => btn(m.name + " · " + m.phone, "match", m.id)).join(" ")}${matches.every((m) => phoneKey(m.phone) !== phoneKey(data.phone)) ? '<label class="checkrow"><input type="checkbox" id="distinct"> This is a different person with the same name.</label>' : ""}</div>`;
          for (const button of target.querySelectorAll("[data-action=match]"))
            button.onclick = () =>
              candidateForm(
                byId(button.dataset.id),
                adding ? { ...call, summary: data.manualSummary } : null,
                adding,
              );
          if (!data.distinct) {
            const check = target.querySelector("#distinct");
            if (check)
              check.onchange = () => {
                check.name = "distinct";
                check.value = "yes";
              };
            target.scrollIntoView({ block: "nearest" });
            return;
          }
          if (matches.some((m) => phoneKey(m.phone) === phoneKey(data.phone)))
            throw Error("This phone number belongs to another profile.");
        }
        const { nextFollow, enquiryDate, manualSummary, distinct, ...fields } =
          data;
        const now = new Date().toISOString(),
          id = c.id || uid(),
          callId = uid(),
          audioId = call?.blob ? uid() : null;
        await ctx.change(
          (s) => {
            const existing = s.candidates.find((m) => m.id === id);
            const originalDate = existing?.createdAt;
            const history = [...(existing?.remarksHistory || [])];
            if (fields.remarks && fields.remarks !== existing?.remarks)
              history.push({ at: now, text: fields.remarks });
            const value = {
              ...fields,
              id,
              createdAt:
                existing && adding
                  ? existing.createdAt
                  : enquiryDate +
                    "T" +
                    (existing?.createdAt.slice(11, 16) ||
                      new Date().toTimeString().slice(0, 5)),
              updatedAt: now,
              remarksHistory: history,
            };
            if (existing) Object.assign(existing, value);
            else s.candidates.push(value);
            if (adding)
              s.calls.push({
                id: callId,
                candidateId: id,
                createdAt:
                  enquiryDate + "T" + new Date().toTimeString().slice(0, 5),
                manualSummary,
                transcript: call?.transcript || "",
                extractedDetails: call?.extractedDetails || null,
                audioId,
              });
            else if (
              originalDate &&
              originalDate.slice(0, 10) !== enquiryDate
            ) {
              const first = s.calls.find(
                (r) => r.candidateId === id && r.createdAt === originalDate,
              );
              if (first) first.createdAt = value.createdAt;
            }
            if (nextFollow)
              s.reminders.push({
                id: uid(),
                candidateId: id,
                title: "Follow up with " + data.name,
                description: "",
                scheduledAt: nextFollow,
                priority: data.priority,
                createdAt: now,
                completedAt: "",
              });
          },
          adding ? "Enquiry saved" : "Candidate updated",
          audioId ? { id: audioId, blob: call.blob } : null,
        );
        closeDialog();
        location.hash = "/candidates/" + id;
      },
    );
  }
  function reminder(id = "", candidateId = "") {
    if (!ctx.get().candidates.length)
      throw Error("Add a candidate before creating a reminder.");
    const r = ctx.get().reminders.find((x) => x.id === id) || {};
    modal(
      id ? "Edit reminder" : "Add reminder",
      `<div class="formgrid"><label class="field full">Candidate<select name="candidateId" required>${candidateOptions(r.candidateId || candidateId)}</select></label>${field("Reminder title", "title", r.title, "text", "required")}${field("Scheduled date and time", "scheduledAt", r.scheduledAt || nextTime(), "datetime-local", "required")}${select("Priority", "priority", priorities, r.priority || "Normal")}${area("Purpose", "description", r.description)}</div>`,
      id ? "Save changes" : "Create reminder",
      async (data) => {
        if (!data.title) throw Error("Enter a reminder title.");
        await ctx.change((s) => {
          const record = s.reminders.find((x) => x.id === id);
          if (record) Object.assign(record, data, { snoozed: false });
          else
            s.reminders.push({
              ...data,
              id: uid(),
              createdAt: new Date().toISOString(),
              completedAt: "",
            });
        }, "Reminder saved");
        closeDialog();
      },
    );
  }
  function opportunity(id) {
    const o = demand(ctx.get()).find((o) => o.id === id);
    if (!o)
      throw Error(
        "This opportunity has changed. Review the current suggestions.",
      );
    modal(
      o.technology + " opportunity",
      `${detailGrid([
        [
          "Suggested start",
          dateLabel(o.start, {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        ],
        ["Colleges", o.colleges],
        ["Confirmed interest", o.confirmed],
        ["Awaiting follow-up", o.members.length - o.confirmed],
      ])}<h3>Potential candidates</h3><div class="picklist">${o.members.map((c) => `<a class="member" href="#/candidates/${c.id}">${avatar(c)}<span><strong>${esc(c.name)}</strong><small>${esc(c.college)}</small></span>${badge(c.status)}</a>`).join("")}</div><div class="actions">${btn("Create proposed batch", "fromopp", id, "primary", "plus")}${o.confirmed < o.members.length ? btn("Remind pending candidates", "remindopp", id) : ""}${btn("Dismiss opportunity", "dismissopp", id, "quiet")}</div>`,
      "",
    );
  }
  function batch(id = "", opp = null) {
    const b = ctx.get().batches.find((x) => x.id === id) || {};
    const all = ctx.get().candidates;
    const selected = b.candidateIds || opp?.members.map((c) => c.id) || [];
    const eligible = all.filter(
      (c) =>
        selected.includes(c.id) ||
        (!["Enrolled", "Not Interested"].includes(c.status) &&
          !ctx
            .get()
            .batches.some(
              (other) =>
                other.id !== id &&
                !["Completed", "Cancelled"].includes(other.status) &&
                other.candidateIds.includes(c.id),
            )),
    );
    modal(
      id ? "Edit batch" : opp ? "Create proposed batch" : "Create batch",
      section(
        "Batch details",
        field(
          "Batch name",
          "name",
          b.name || (opp ? opp.technology + " internship" : ""),
          "text",
          "required",
        ) +
          field(
            "Technology or role",
            "technology",
            b.technology || opp?.technology,
            "text",
            "required",
          ) +
          field(
            "Start date",
            "startDate",
            b.startDate || opp?.start,
            "date",
            "required",
          ) +
          field("End date", "endDate", b.endDate, "date") +
          field("Duration", "duration", b.duration) +
          field(
            "Capacity",
            "capacity",
            b.capacity,
            "number",
            'min="1" step="1"',
          ) +
          select(
            "Batch status",
            "status",
            opp ? ["Proposed"] : batchStatuses,
            b.status || "Proposed",
          ) +
          area("Internal remarks", "remarks", b.remarks),
      ) +
        `<fieldset><legend>Selected candidates</legend><div class="picklist">${eligible.map((c) => `<label class="checkrow" data-technology="${esc(normal(c.technology))}"><input type="checkbox" name="member" value="${c.id}" ${selected.includes(c.id) ? "checked" : ""}><span><strong>${esc(c.name)}</strong><small>${esc(c.technology + " · " + c.college)}</small></span></label>`).join("") || empty("No candidates available.")}</div></fieldset>`,
      id ? "Save batch" : "Create batch",
      async (data, form) => {
        if (!data.name || !data.technology)
          throw Error("Enter a batch name and technology.");
        if (!data.endDate && !data.duration)
          throw Error("Provide an end date or duration.");
        if (data.endDate && data.endDate < data.startDate)
          throw Error("End date must follow the start date.");
        const candidateIds = new FormData(form).getAll("member");
        if (data.capacity && candidateIds.length > Number(data.capacity))
          throw Error("Selected candidates exceed batch capacity.");
        const { member, ...fields } = data;
        const batchId = b.id || uid();
        await ctx.change((s) => {
          const value = {
            ...b,
            ...fields,
            id: batchId,
            candidateIds,
            createdAt: b.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const existing = s.batches.find((x) => x.id === id);
          if (existing) Object.assign(existing, value);
          else s.batches.push(value);
        }, "Batch saved");
        closeDialog();
        location.hash = "/batches/" + batchId;
      },
    );
    const techInput = dialog.querySelector("[name=technology]");
    function filterMembers() {
      const key = normal(techInput.value);
      for (const row of dialog.querySelectorAll("[data-technology]"))
        row.hidden = Boolean(
          key &&
          row.dataset.technology !== key &&
          !row.querySelector("input").checked,
        );
    }
    filterMembers();
    techInput.oninput = filterMembers;
  }
  return { capture, candidateForm, play, reminder, batch, opportunity };
}
