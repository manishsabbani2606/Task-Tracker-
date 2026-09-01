const { jsPDF } = require("jspdf");
const fs = require("fs");

function fmtHours(hoursDecimal) {
  const h = Math.floor(hoursDecimal);
  const m = Math.round((hoursDecimal - h) * 60);
  return `${h}h ${m}m`;
}
function fmtMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${m}m`;
}

// Mock data mirroring the user's screenshot: Monday has clock in/out + one task, rest empty.
const days = [
  { date: new Date("2026-08-31T00:00:00"), key: "2026-08-31", clockIn: "21:09", clockOut: "23:09", hours: 2, taskMinutes: 30,
    entries: [{ text: "Connected with user for the Ticket regarding Jamf", category: "Support", done: false, minutes: 30 }] },
  { date: new Date("2026-09-01T00:00:00"), key: "2026-09-01", clockIn: "", clockOut: "", hours: 0, taskMinutes: 0, entries: [] },
  { date: new Date("2026-09-02T00:00:00"), key: "2026-09-02", clockIn: "", clockOut: "", hours: 0, taskMinutes: 0, entries: [] },
  { date: new Date("2026-09-03T00:00:00"), key: "2026-09-03", clockIn: "", clockOut: "", hours: 0, taskMinutes: 0, entries: [] },
  { date: new Date("2026-09-04T00:00:00"), key: "2026-09-04", clockIn: "", clockOut: "", hours: 0, taskMinutes: 0, entries: [] },
  { date: new Date("2026-09-05T00:00:00"), key: "2026-09-05", clockIn: "", clockOut: "", hours: 0, taskMinutes: 0, entries: [] },
  { date: new Date("2026-09-06T00:00:00"), key: "2026-09-06", clockIn: "", clockOut: "", hours: 0, taskMinutes: 0, entries: [] },
];

const doc = new jsPDF({ unit: "pt", format: "a4" });

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const marginX = 48;
const contentWidth = pageWidth - marginX * 2;
const weekEnd = new Date(days[6].date);
const totalHours = days.reduce((sum, d) => sum + d.hours, 0);
const totalTaskMinutes = days.reduce((sum, d) => sum + d.taskMinutes, 0);

const PURPLE = [109, 91, 245];
const PURPLE_SOFT = [239, 236, 255];
const STRIPE = [247, 246, 253];
const GRID = [225, 224, 240];
const GRAY = [110, 110, 125];

let y = 0;

function ensureSpace(needed) {
  if (y + needed > pageHeight - 56) {
    doc.addPage();
    y = 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text("Weekly Work Report — continued", marginX, y);
    doc.setTextColor(0);
    y += 22;
  }
}

doc.setFillColor(...PURPLE);
doc.rect(0, 0, pageWidth, 74, "F");
doc.setTextColor(255);
doc.setFont("helvetica", "bold");
doc.setFontSize(18);
doc.text("Weekly Work Report", marginX, 34);
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.text(`${days[0].date.toDateString()} — ${weekEnd.toDateString()}`, marginX, 52);
doc.setFont("helvetica", "bold");
doc.setFontSize(10.5);
doc.text("Manish Kumar Sabbani", pageWidth - marginX, 32, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.text("Technical Support Analyst", pageWidth - marginX, 46, { align: "right" });
doc.setTextColor(0);
y = 100;

const cardGap = 16;
const cardW = (contentWidth - cardGap) / 2;
const cardH = 52;
[
  { label: "TOTAL HOURS WORKED", value: fmtHours(totalHours), x: marginX },
  { label: "TOTAL TASK TIME LOGGED", value: fmtMinutes(totalTaskMinutes), x: marginX + cardW + cardGap },
].forEach(card => {
  doc.setFillColor(...PURPLE_SOFT);
  doc.roundedRect(card.x, y, cardW, cardH, 6, 6, "F");
  doc.setTextColor(90, 72, 224);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(card.label, card.x + 14, y + 20);
  doc.setFontSize(19);
  doc.text(card.value, card.x + 14, y + 40);
});
doc.setTextColor(0);
y += cardH + 28;

ensureSpace(24 + (days.length + 1) * 20);
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.text("Attendance Summary", marginX, y);
y += 14;

const colFractions = [0.27, 0.19, 0.19, 0.175, 0.175];
const colWidths = colFractions.map(f => contentWidth * f);
const headers = ["Day", "Clock In", "Clock Out", "Att. Hours", "Task Time"];
const rowH = 22;

function tableRow(cells, opts) {
  opts = opts || {};
  ensureSpace(rowH);
  let x = marginX;
  doc.setFont("helvetica", opts.header ? "bold" : "normal");
  doc.setFontSize(9.5);
  cells.forEach((cellText, i) => {
    const w = colWidths[i];
    if (opts.header) {
      doc.setFillColor(...PURPLE);
    } else if (opts.stripe) {
      doc.setFillColor(...STRIPE);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(x, y, w, rowH, "F");
    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.5);
    doc.rect(x, y, w, rowH, "S");
    doc.setTextColor(opts.header ? 255 : 20);
    doc.text(String(cellText), x + 8, y + 14.5);
    x += w;
  });
  doc.setTextColor(0);
  y += rowH;
}

tableRow(headers, { header: true });
days.forEach((day, i) => {
  tableRow([
    day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    day.clockIn || "—",
    day.clockOut || "—",
    day.hours > 0 ? fmtHours(day.hours) : "—",
    day.taskMinutes > 0 ? fmtMinutes(day.taskMinutes) : "—",
  ], { stripe: i % 2 === 0 });
});
y += 30;

ensureSpace(24);
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.text("Daily Task Details", marginX, y);
y += 16;

days.forEach((day, idx) => {
  ensureSpace(34);

  doc.setFillColor(...STRIPE);
  doc.rect(marginX, y, contentWidth, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(90, 72, 224);
  const heading = day.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  doc.text(heading, marginX + 8, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  const info = `In ${day.clockIn || "—"}  •  Out ${day.clockOut || "—"}  •  ${day.hours > 0 ? fmtHours(day.hours) : "0h 0m"} worked  •  ${fmtMinutes(day.taskMinutes)} logged`;
  doc.text(info, marginX + contentWidth - 8, y + 15, { align: "right" });
  doc.setTextColor(0);
  y += 32;

  if (day.entries.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(150);
    doc.text("No tasks logged", marginX + 14, y);
    doc.setTextColor(0);
    y += 18;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    day.entries.forEach(entry => {
      const durationText = entry.minutes ? `  (${fmtMinutes(entry.minutes)})` : "";
      const raw = `[${entry.category}] ${entry.text}${durationText}`;
      const wrapped = doc.splitTextToSize(raw, contentWidth - 34);
      wrapped.forEach((line, i) => {
        ensureSpace(16);
        if (i === 0) {
          doc.setTextColor(entry.done ? 23 : 170, entry.done ? 166 : 90, entry.done ? 115 : 20);
          doc.text(entry.done ? "✓" : "•", marginX + 14, y);
          doc.setTextColor(20);
        }
        doc.text(line, marginX + 26, y);
        y += 15;
      });
    });
  }
  y += 12;

  if (idx < days.length - 1) {
    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.5);
    doc.line(marginX, y - 6, marginX + contentWidth, y - 6);
  }
});

const pageCount = doc.internal.getNumberOfPages();
for (let p = 1; p <= pageCount; p++) {
  doc.setPage(p);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Page ${p} of ${pageCount}`, pageWidth / 2, pageHeight - 24, { align: "center" });
  doc.setTextColor(0);
}

const buf = doc.output("arraybuffer");
fs.writeFileSync("/sessions/vibrant-tender-ramanujan/pdftest/output.pdf", Buffer.from(buf));
console.log("done, pages:", pageCount);
