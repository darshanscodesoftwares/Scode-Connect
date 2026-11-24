import { dateKey, shiftDay, uid } from "./model.js";
export function seed(now = new Date()) {
  const rows = [
    ["Ananya Krishnan", "Flutter", "Interested", 0],
    ["Rahul Sharma", "React", "New", 0],
    ["Priya Nair", "Flutter", "Follow-up Required", 1],
    ["Arjun Menon", "Python", "Contacted", 1],
    ["Meera Iyer", "AI/ML", "Interested", 2],
    ["Karthik S", "Flutter", "Interested", 2],
    ["Diya Patel", "React", "Interested", 2],
    ["Aditya Rao", "Flutter", "New", 3],
    ["Sneha Thomas", "AI/ML", "New", 4],
    ["Vikram Reddy", "React", "Follow-up Required", 4],
    ["Ishita Shah", "Flutter", "Interested", 5],
    ["Siddharth Das", "Python", "New", 6],
    ["Nisha George", "AI/ML", "Interested", 6],
    ["Harish Kumar", "React", "Interested", 8],
    ["Kavya Suresh", "Python", "Not Interested", 10],
    ["Rohan Joshi", "Python", "Enrolled", 13],
    ["Aisha Khan", "React", "Enrolled", 16],
    ["Dev Anand", "Flutter", "Contacted", 22],
  ];
  const colleges = [
    "PSG College of Technology",
    "Anna University",
    "SRM Institute of Science and Technology",
    "VIT University",
    "Amrita Vishwa Vidyapeetham",
    "Loyola College",
  ];
  const skills = {
    Flutter: "Flutter, Dart",
    React: "JavaScript, React",
    Python: "Python, SQL",
    "AI/ML": "Python, scikit-learn",
  };
  const start = (month, day) =>
    dateKey(new Date(now.getFullYear(), now.getMonth() + month, day));
  const candidates = rows.map(([name, technology, status, age], i) => {
    const m = { Flutter: 2, React: 3, Python: 2, "AI/ML": 4 }[technology];
    return {
      id: "c" + i,
      name,
      technology,
      status,
      phone: "+91 00000 " + String(12000 + i),
      email: name.split(" ")[0].toLowerCase() + "@example.com",
      college: colleges[i % colleges.length],
      department: "Computer Science",
      studyYear: i % 2 ? "Final year" : "Third year",
      role: technology + " intern",
      skills: skills[technology],
      experience: "Coursework and personal projects",
      projects: "",
      duration: "8 weeks",
      mode: i % 2 ? "Hybrid" : "Onsite",
      desiredJoiningDate: start(m, 6 + (i % 9)),
      availableFrom: i === 17 ? "" : start(m, 1 + (i % 5)),
      availableUntil: i === 17 ? "" : start(m, 25),
      joiningFlexibility:
        technology === "Python" ? "Fixed date" : "Flexible within availability",
      priority: i % 5 === 0 ? "High" : "Normal",
      source: "Phone call",
      remarks: "",
      hr: "",
      createdAt: shiftDay(-age, now) + "T09:" + String(59 - i).padStart(2, "0"),
      updatedAt: shiftDay(-age, now),
      remarksHistory: [],
    };
  });
  const calls = candidates.map((c) => ({
    id: uid(),
    candidateId: c.id,
    createdAt: c.createdAt,
    manualSummary:
      "Discussed " +
      c.technology +
      " internship options and preferred joining dates.",
  }));
  for (const [id, age] of [
    [5, 1],
    [10, 2],
    [15, 3],
    [13, 4],
    [16, 5],
    [17, 8],
  ])
    calls.push({
      id: uid(),
      candidateId: "c" + id,
      createdAt: shiftDay(-age, now) + "T11:15",
      manualSummary:
        "Follow-up call about internship availability and next steps.",
    });
  const reminders = [
    [2, -1, "10:30", "Confirm joining dates"],
    [0, 0, "15:30", "Discuss internship details"],
    [3, 1, "10:00", "Review Python experience"],
    [6, 2, "11:30", "Confirm availability"],
    [9, 3, "14:00", "Discuss React batch"],
    [5, -2, "10:00", "Review application"],
    [13, -3, "11:00", "Share batch details"],
  ].map(([i, d, time, title], j) => ({
    id: uid(),
    candidateId: "c" + i,
    title,
    description: "",
    priority: j === 0 ? "High" : "Normal",
    scheduledAt: shiftDay(d, now) + "T" + time,
    completedAt: j >= 5 ? shiftDay(d, now) + "T12:00" : "",
    createdAt: dateKey(now),
  }));
  const batches = [15, 16].map((i, j) => ({
    id: "b" + i,
    name: candidates[i].technology + " internship",
    technology: candidates[i].technology,
    startDate: shiftDay(-8 - j, now),
    endDate: shiftDay(48 - j, now),
    duration: "8 weeks",
    capacity: 8,
    candidateIds: ["c" + i],
    remarks: "",
    status: "Active",
    createdAt: shiftDay(-15, now),
  }));
  return {
    version: 1,
    revision: 0,
    candidates,
    calls,
    reminders,
    batches,
    threshold: 3,
    dismissed: [],
  };
}
export function simulatedEnquiry() {
  const now = new Date();
  const d = (day) =>
    dateKey(new Date(now.getFullYear(), now.getMonth() + 2, day));
  return {
    transcript:
      "Neha is from Crescent Institute and is interested in a Flutter internship. She has worked with Dart and can join throughout her preferred month. She requested a callback to discuss the batch.",
    fields: {
      name: "Neha Verma",
      college: "Crescent Institute",
      technology: "Flutter",
      skills: "Flutter, Dart",
      desiredJoiningDate: d(5),
      availableFrom: d(1),
      availableUntil: d(28),
      joiningFlexibility: "Flexible within availability",
      status: "New",
    },
  };
}
