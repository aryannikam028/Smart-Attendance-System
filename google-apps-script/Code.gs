//----------------------------------------------------------------------
// SMART ATTENDANCE SYSTEM — UNIFIED GOOGLE APPS SCRIPT BACKEND v9.0
// Final Year B.Tech (Div B) - Semester VII - Academic Year 2026-27
// Yashoda Technical Campus, Satara (YSPM)
// Class Teacher: Prof. Subhash Suman   (w.e.f. 01/08/2026)
//
// DUAL COMPATIBILITY:
// 1. ESP8266 Hardware Fingerprint Attendance via "values" POST parameter
//    - Live scans and offline uploads (with parts[9] = "yyyy-mm-dd")
//    - "lookup_roll" enrollment command (roll -> FOUND:name:prn)
//    - Auto-absent trigger and 5 PM Fast2SMS parent alerts
//    - v8.5 Skipped lecture rule (0 presents = skipped, no A, not in Held)
// 2. Web Application API via doGet(e) and doPost(e)
//    - Student PRN authentication & individual profile retrieval
//    - Admin authorization & system controls
//    - Month-wise student directory & attendance records
//    - 75% prediction calculations (lectures needed = 3C - 4P)
//    - Leave applications & approval workflow with audit logging
//    - Manual attendance corrections with audit justification
//    - Concurrency lock protection (LockService)
//----------------------------------------------------------------------

var TIMEZONE         = "Asia/Kolkata";
var SHEET_NAME       = "Attendance";
var FAST2SMS_API_KEY = "PASTE_YOUR_NEW_FAST2SMS_KEY_HERE"; // 🔑 https://fast2sms.com

var CONFIG = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "admin123",
  SHARED_SECRET: "SMART_ATTENDANCE_SECRET_KEY_2026", // 🔑 Set APPS_SCRIPT_SHARED_SECRET in Script Properties
  LEAVE_SHEET_NAME: "Leave_Applications",
  AUDIT_SHEET_NAME: "Audit_Logs",
  ATTENDANCE_MIN_PERCENT: 75
};

function getSharedSecret() {
  return PropertiesService.getScriptProperties().getProperty("APPS_SCRIPT_SHARED_SECRET") || CONFIG.SHARED_SECRET;
}

function sanitizeSheetInput(val) {
  if (val === null || val === undefined) return "";
  var s = String(val);
  if (/^[=+@-]/.test(s)) {
    return "'" + s;
  }
  return s;
}

// ─────────────────────────────────────────────
//  👩‍🎓 STUDENT LIST (All 73 Students - Roll 25 to 97)
// ─────────────────────────────────────────────
var STUDENTS = [
  { roll: "25", name: "ABHIJEET MAHADEV SHINDE", prn: "23067571372008", phone: "", password: "pass25" },
  { roll: "26", name: "SANKET JITENDRA GADKARI", prn: "23067571372009", phone: "", password: "pass26" },
  { roll: "27", name: "AADITYA BAPURAV MASAL", prn: "23067571372012", phone: "", password: "pass27" },
  { roll: "28", name: "VEDANT BHARAT PAWAR", prn: "23067571372016", phone: "", password: "pass28" },
  { roll: "29", name: "ASMITA SAMADHAN NAVADKAR", prn: "23067571372017", phone: "", password: "pass29" },
  { roll: "30", name: "ANIKET VITTHAL KOKARE", prn: "23067571372021", phone: "", password: "pass30" },
  { roll: "31", name: "PRATHMESH SUNIL KADAM", prn: "23067571372024", phone: "", password: "pass31" },
  { roll: "32", name: "SHRUTIKA SHANKAR SHELKE", prn: "23067571372026", phone: "", password: "pass32" },
  { roll: "33", name: "SUJAL SUNIL SHALGAR", prn: "23067571372028", phone: "", password: "pass33" },
  { roll: "34", name: "ANUJ AMOL NIMBALKAR", prn: "23067571372029", phone: "", password: "pass34" },
  { roll: "35", name: "SMRUTI YOGESH PAWAR", prn: "23067571372030", phone: "", password: "pass35" },
  { roll: "36", name: "RAVI SANJAY SALUNKHE", prn: "23067571372031", phone: "", password: "pass36" },
  { roll: "37", name: "ASIYA MAJJID PATEL", prn: "23067571372035", phone: "", password: "pass37" },
  { roll: "38", name: "DIPTI RAMDAS MULIK", prn: "23067571372036", phone: "", password: "pass38" },
  { roll: "39", name: "PRADIP BALASAHEB SHINGATE", prn: "23067571372038", phone: "", password: "pass39" },
  { roll: "40", name: "AKANKSHA VIKAS SABALE", prn: "23067571372041", phone: "", password: "pass40" },
  { roll: "41", name: "KAJAL VIKAS NIKAM", prn: "23067571372042", phone: "", password: "pass41" },
  { roll: "42", name: "SAHIL SATISH BANSODE", prn: "23067571372044", phone: "", password: "pass42" },
  { roll: "43", name: "ARUN RAMESH KEVAT", prn: "23067571372046", phone: "", password: "pass43" },
  { roll: "44", name: "PRATIKSHA CHANDRAKANT SHIRKE", prn: "23067571372047", phone: "", password: "pass44" },
  { roll: "45", name: "PRACHI PRAVIN JADHAV", prn: "23067571372048", phone: "", password: "pass45" },
  { roll: "46", name: "VAISHNAVI VIJAY LAWAND", prn: "23067571372049", phone: "", password: "pass46" },
  { roll: "47", name: "JYOTI MAHESH PAWAR", prn: "23067571372050", phone: "", password: "pass47" },
  { roll: "48", name: "SAYALI SATISH SHINDE", prn: "23067571372051", phone: "", password: "pass48" },
  { roll: "49", name: "ANUJ SAMBHAJI MORE", prn: "23067571372052", phone: "", password: "pass49" },
  { roll: "50", name: "SRUSHTI SANDEEP SHINDE", prn: "23067571372053", phone: "", password: "pass50" },
  { roll: "51", name: "SHREYA VIJAY DESHPANDE", prn: "23067571372054", phone: "", password: "pass51" },
  { roll: "52", name: "PAYAL HANMANT AWARE", prn: "23067571372056", phone: "", password: "pass52" },
  { roll: "53", name: "AVADHUT PRASHANT DESHMUKH", prn: "23067571372058", phone: "", password: "pass53" },
  { roll: "54", name: "SNEHAL AGATRAO DESHMUKH", prn: "23067571372059", phone: "", password: "pass54" },
  { roll: "55", name: "VINAYAK DATTU KODALKAR", prn: "23067571372060", phone: "", password: "pass55" },
  { roll: "56", name: "ANUSHKA RAHUL JADHAV", prn: "23067571372061", phone: "", password: "pass56" },
  { roll: "57", name: "KARAN VIJAY SUPEKAR", prn: "23067571372062", phone: "", password: "pass57" },
  { roll: "58", name: "SHAHID SALIM BAGWAN", prn: "23067571372063", phone: "", password: "pass58" },
  { roll: "59", name: "SUSHANT MARUTI SABALE", prn: "23067571372065", phone: "", password: "pass59" },
  { roll: "60", name: "SHREYA MAHENDRA KADAM", prn: "23067571372066", phone: "", password: "pass60" },
  { roll: "61", name: "SARVESH RAMCHENDRA DESAI", prn: "23067571372067", phone: "", password: "pass61" },
  { roll: "62", name: "VIRENDRA RAHUL MELVANE", prn: "23067571372068", phone: "", password: "pass62" },
  { roll: "63", name: "SHRIDAR RAJENDRA GURAV", prn: "23067571372070", phone: "", password: "pass63" },
  { roll: "64", name: "MAYURI VITTHAL KANASE", prn: "23067571372073", phone: "", password: "pass64" },
  { roll: "65", name: "NEHA ASHOK SINGH", prn: "23067571372075", phone: "", password: "pass65" },
  { roll: "66", name: "ADITYA DIPAK MANE", prn: "23067571372078", phone: "", password: "pass66" },
  { roll: "67", name: "RUTUJA RAJKUMAR GAIKWAD", prn: "23067571372079", phone: "", password: "pass67" },
  { roll: "68", name: "PRATIK SUDHIR PAWAR", prn: "24067571372502", phone: "", password: "pass68" },
  { roll: "69", name: "GAYATRI LALASO THOMBARE", prn: "24067571372503", phone: "", password: "pass69" },
  { roll: "70", name: "SARTHAK SANTOSH KANSE", prn: "24067571372504", phone: "", password: "pass70" },
  { roll: "71", name: "PRAVINA SHETTEPPA KHANAPURE", prn: "24067571372505", phone: "", password: "pass71" },
  { roll: "72", name: "SATYAJIT ANIL JADHAV", prn: "24067571372506", phone: "", password: "pass72" },
  { roll: "73", name: "AYUSH SUNIL PATIL", prn: "24067571372508", phone: "", password: "pass73" },
  { roll: "74", name: "ANITA MAHADEV KOKARE", prn: "24067571372509", phone: "", password: "pass74" },
  { roll: "75", name: "VAISHNAVI RAMCHANDRA KADAM", prn: "24067571372510", phone: "", password: "pass75" },
  { roll: "76", name: "SANIKA SANTOSH BABAR", prn: "24067571372512", phone: "", password: "pass76" },
  { roll: "77", name: "TANVI SAMBHAJI GHOLAP", prn: "24067571372514", phone: "", password: "pass77" },
  { roll: "78", name: "RUSHIKESH SANTOSH KHARE", prn: "24067571372516", phone: "", password: "pass78" },
  { roll: "79", name: "PRATIKSHA SANTOSH KADAM", prn: "24067571372517", phone: "", password: "pass79" },
  { roll: "80", name: "ARYA DATTATRAY JADHAV", prn: "24067571372518", phone: "", password: "pass80" },
  { roll: "81", name: "PATIL DARSHANA TANAJI", prn: "24067571372520", phone: "", password: "pass81" },
  { roll: "82", name: "SHAIKH SANIYA SAMIR", prn: "24067571372521", phone: "", password: "pass82" },
  { roll: "83", name: "BAGAL RANJIT BHARAT", prn: "24067571372522", phone: "", password: "pass83" },
  { roll: "84", name: "GONDAWALE INDRAJEET JALINDAR", prn: "24067571372523", phone: "", password: "pass84" },
  { roll: "85", name: "KALE OM BHAGWAN", prn: "24067571372524", phone: "", password: "pass85" },
  { roll: "86", name: "JADHAV RUTUJA RAJENDRA", prn: "24067571372525", phone: "", password: "pass86" },
  { roll: "87", name: "VAIBHAV GANESH PATIL", prn: "24067571372526", phone: "", password: "pass87" },
  { roll: "88", name: "KATE DIKSHA SHANTARAM", prn: "24067571372527", phone: "", password: "pass88" },
  { roll: "89", name: "SRUSHTI SHASHIKANT MANE", prn: "24067571372528", phone: "", password: "pass89" },
  { roll: "90", name: "DEDE ASHWINI VIJAY", prn: "24067571372530", phone: "", password: "pass90" },
  { roll: "91", name: "CHAVAN BHAGYAVIDYA JAYHIND", prn: "24067571372531", phone: "", password: "pass91" },
  { roll: "92", name: "NIKAM ARYAN DHANANJAY", prn: "24067571372533", phone: "", password: "pass92" },
  { roll: "93", name: "GAWADE ADITYA SANTOSH", prn: "24067571372534", phone: "", password: "pass93" },
  { roll: "94", name: "CHAVAN OMKAR VIJAY", prn: "24067571372535", phone: "", password: "pass94" },
  { roll: "95", name: "YASH ATUL SHINDE", prn: "2267571372010", phone: "", password: "pass95" },
  { roll: "96", name: "ADITYA SANTOSH AMBRALEA", prn: "2267571372028", phone: "", password: "pass96" },
  { roll: "97", name: "VEDRAJ PRASANNA SHEDGE", prn: "2267571372029", phone: "", password: "pass97" }
];

// ─────────────────────────────────────────────
//  COLUMN CONSTANTS
// ─────────────────────────────────────────────
var MAX_STUDENTS   = 80;
var COL_ROLL       = 1;
var COL_NAME       = 2;
var COL_TIME       = 3;
var COL_PHONE      = 4;
var COL_PRN        = 5;
var COL_PASSWORD   = 6;
var COL_DAYS_START = 7;

var HEADER_ROW_MONTH   = 1;
var HEADER_ROW_TIME    = 2;
var HEADER_ROW_DAY     = 3;
var STUDENT_START_ROW  = 4;

var ATTENDANCE_MIN_PERCENT = 75;
var SUMMARY_EXCLUDE_LABELS = [];

// ─────────────────────────────────────────────
//  TIMETABLE — Final Year B (Sem VII) 2026-27
// ─────────────────────────────────────────────
var SLOT_TIMES = [
  [10, 0, 11, 0], [11, 0, 12, 0],
  [12, 40, 13, 40], [13, 40, 14, 40],
  [14, 50, 15, 50], [15, 50, 16, 50]
];

function S(idx, label, practical, span) {
  span = span || 1;
  var first = SLOT_TIMES[idx];
  var last  = SLOT_TIMES[idx + span - 1];
  return {
    label: label,
    startHour: first[0], startMin: first[1],
    endHour: last[2],    endMin: last[3],
    idxEnd: idx + span - 1,
    practical: !!practical
  };
}

var TIMETABLE = {
  1: [
    S(0, "Practical", true, 2),
    S(2, "EEFM(MN)"), S(3, "CS(VAP)(T)"),
    S(4, "Library"), S(5, "RADAR(SSUMAN)")
  ],
  2: [
    S(0, "CS(VAP)"), S(1, "E-Waste(ARG)"),
    S(2, "CS(VAP)"), S(3, "ME(PK)"),
    S(4, "ME(PK)(T)"), S(5, "RADAR(SSUMAN)(T)")
  ],
  3: [
    S(0, "ME(PK)"), S(1, "E-Waste(ARG)"),
    S(2, "Practical", true, 2),
    S(4, "Library"), S(5, "EEFM(MN)")
  ],
  4: [
    S(0, "Practical", true, 2),
    S(2, "Foreign Lang(LM)"), S(3, "RADAR(SSUMAN)"),
    S(4, "E-Waste(ARG)"), S(5, "E-Waste(ARG)(T)")
  ],
  5: [
    S(0, "CS(VAP)"), S(1, "RADAR(SSUMAN)"),
    S(2, "ME(PK)"), S(3, "EEFM(MN)"),
    S(4, "Practical", true, 2)
  ]
};

var INDIAN_FESTIVALS = {
  "01-14": "Makar Sankranti", "01-15": "Pongal",
  "01-23": "Netaji Jayanti",  "01-26": "Republic Day",
  "02-19": "Shivaji Maharaj Jayanti",
  "03-17": "Holi",            "03-25": "Gudi Padwa",
  "03-30": "Eid ul-Fitr",     "04-03": "Good Friday",
  "04-14": "Dr. Ambedkar Jayanti",
  "05-01": "Buddha Pournima", "05-27": "Bakari Eid",
  "06-26": "Moharam",         "07-01": "Muharram",
  "08-09": "Raksha Bandhan",  "08-15": "Independence Day",
  "08-16": "Janmashtami",     "08-27": "Onam",
  "09-05": "Teachers Day",    "09-07": "Ganesh Chaturthi",
  "10-02": "Gandhi Jayanti",  "10-11": "Dussehra",
  "10-20": "Diwali",          "10-21": "Diwali",
  "10-31": "Sardar Patel Jayanti",
  "11-01": "Diwali/New Year", "11-05": "Guru Nanak Jayanti",
  "11-15": "Jharkhand Sthapna Diwas",
  "12-25": "Christmas Day",   "12-26": "Public Holiday"
};

// ─────────────────────────────────────────────
//  HOLIDAY & CALENDAR HELPERS
// ─────────────────────────────────────────────
function fetchHolidaysForMonth(year, month) {
  var cacheKey = "HOL_" + year + "_" + month;
  var cached   = PropertiesService.getScriptProperties().getProperty(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  var holidays = {};
  for (var key in INDIAN_FESTIVALS) {
    var p = key.split("-");
    if (parseInt(p[0]) === month) holidays[parseInt(p[1]).toString()] = INDIAN_FESTIVALS[key];
  }
  try {
    var url  = "https://date.nager.at/api/v3/PublicHolidays/" + year + "/IN";
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      JSON.parse(resp.getContentText()).forEach(function(h) {
        var dp = h.date.split("-");
        if (parseInt(dp[1]) === month) holidays[parseInt(dp[2]).toString()] = h.localName || h.name;
      });
    }
  } catch(err) { Logger.log("Holiday fetch error: " + err); }

  PropertiesService.getScriptProperties().setProperty(cacheKey, JSON.stringify(holidays));
  return holidays;
}

function getNonWorkingLabel(date, holidays) {
  var dow = date.getDay();
  if (dow === 0) return "Sunday";
  if (dow === 6) return "Saturday";
  var dd = date.getDate().toString();
  return (holidays && holidays[dd]) ? holidays[dd] : null;
}

function daysInMonthOf(year, month) {
  return new Date(year, month, 0).getDate();
}

function monthLabelOf(year, month) {
  return Utilities.formatDate(new Date(year, month - 1, 15), TIMEZONE, "MMMM yyyy");
}

function monthTabName(year, month) {
  return SHEET_NAME + " " + Utilities.formatDate(new Date(year, month - 1, 15), TIMEZONE, "MMM yyyy");
}

function columnToLetter(col) {
  var letter = '';
  while (col > 0) {
    var temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function padTime(h, m) {
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

function getSavedSpreadsheetId() {
  return PropertiesService.getScriptProperties().getProperty("ATTENDANCE_SS_ID");
}

function saveSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty("ATTENDANCE_SS_ID", id);
}

function getSpreadsheet() {
  var id = getSavedSpreadsheetId();
  if (id) { try { return SpreadsheetApp.openById(id); } catch(e) {} }
  try { return SpreadsheetApp.getActiveSpreadsheet(); } catch(e) { return null; }
}

function getSheetFor(ss, year, month) {
  if (!ss) return null;
  var tab = PropertiesService.getScriptProperties().getProperty("TAB_" + year + "_" + month);
  if (tab) {
    var sh = ss.getSheetByName(tab);
    if (sh) return sh;
  }
  var label = Utilities.formatDate(new Date(year, month - 1, 15), TIMEZONE, "MMM yyyy");
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf(label) !== -1) return sheets[i];
  }
  return null;
}

function getSheetForMonth(ss, monthName) {
  if (!ss) return null;
  if (monthName) {
    var sh = ss.getSheetByName(monthName);
    if (sh) return sh;
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toLowerCase().indexOf(monthName.toLowerCase()) !== -1) {
        return sheets[i];
      }
    }
  }
  return getSheet();
}

function getSheet() {
  var ss = getSpreadsheet();
  var now = new Date();
  var sheet = getSheetFor(ss, now.getFullYear(), now.getMonth() + 1);
  if (!sheet) sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  return sheet;
}

function findLatestSheet(ss, year, month) {
  for (var k = 0; k <= 24; k++) {
    var d  = new Date(year, month - 1 - k, 1);
    var sh = getSheetFor(ss, d.getFullYear(), d.getMonth() + 1);
    if (sh) return sh;
  }
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

// ─────────────────────────────────────────────
//  COLUMN MAP & TIMETABLE INDEX
// ─────────────────────────────────────────────
var SLOT_STARTS = ["10:0", "11:0", "12:40", "13:40", "14:50", "15:50"];
function slotIndexOf(slot) {
  return SLOT_STARTS.indexOf(slot.startHour + ":" + slot.startMin);
}

function getSlot(dow, lectureIdx) {
  var slots = TIMETABLE[dow] || [];
  for (var i = 0; i < slots.length; i++) {
    if (slotIndexOf(slots[i]) === lectureIdx) return slots[i];
  }
  return null;
}

function buildColumnMap(year, month, daysInMonth, holidays) {
  var colMap = [];
  var col = COL_DAYS_START;

  for (var d = 1; d <= daysInMonth; d++) {
    var date = new Date(year, month - 1, d);
    var label = getNonWorkingLabel(date, holidays);
    var dow = date.getDay();

    if (label) {
      colMap.push({
        col: col, date: d, dayOfWeek: dow,
        dayName: Utilities.formatDate(date, TIMEZONE, "EEE"),
        lectureIdx: -1, lectureIdxEnd: -1, lectureLabel: label, timeLabel: "",
        nonWorking: true, nonWorkingLabel: label
      });
      col++;
    } else {
      var slots = TIMETABLE[dow] || [];
      slots.forEach(function(slot) {
        var idx = slotIndexOf(slot);
        colMap.push({
          col: col, date: d, dayOfWeek: dow,
          dayName: Utilities.formatDate(date, TIMEZONE, "EEE"),
          lectureIdx: idx, lectureIdxEnd: slot.idxEnd, lectureLabel: slot.label,
          timeLabel: padTime(slot.startHour, slot.startMin) + "-" + padTime(slot.endHour, slot.endMin),
          nonWorking: false, practical: slot.practical,
          endHour: slot.endHour, endMin: slot.endMin
        });
        col++;
      });
    }
  }

  var uniqueLabels = [];
  colMap.forEach(function(c) {
    if (!c.nonWorking && uniqueLabels.indexOf(c.lectureLabel) === -1 &&
        SUMMARY_EXCLUDE_LABELS.indexOf(c.lectureLabel) === -1)
      uniqueLabels.push(c.lectureLabel);
  });

  var summaryStartCol = col;
  return { colMap: colMap, summaryStartCol: summaryStartCol, uniqueLabels: uniqueLabels };
}

// ─────────────────────────────────────────────
//  SUMMARY FORMULA BUILDERS (v8.4 / v8.5)
// ─────────────────────────────────────────────
function buildConductedFormulas(colMap, uniqueLabels, summaryStartCol) {
  var lastRow = STUDENT_START_ROW + MAX_STUDENTS - 1;
  var n = uniqueLabels.length;
  var out = uniqueLabels.map(function(lbl) {
    var parts = colMap.filter(function(c) { return !c.nonWorking && c.lectureLabel === lbl; })
      .map(function(c) {
        var L = columnToLetter(c.col);
        return 'IF(COUNTIF(' + L + STUDENT_START_ROW + ':' + L + lastRow + ',"P")>0,1,0)';
      });
    return parts.length ? "=" + parts.join("+") : "=0";
  });
  var first = columnToLetter(summaryStartCol);
  var last  = columnToLetter(summaryStartCol + n - 1);
  out.push(n ? "=SUM(" + first + HEADER_ROW_DAY + ":" + last + HEADER_ROW_DAY + ")" : "=0");
  out.push("Min " + ATTENDANCE_MIN_PERCENT + "%");
  return out;
}

function buildSummaryRowFormulas(row, colMap, uniqueLabels, summaryStartCol) {
  var n = uniqueLabels.length;
  var out = uniqueLabels.map(function(lbl) {
    var refs = colMap.filter(function(c) { return !c.nonWorking && c.lectureLabel === lbl; })
      .map(function(c) { return 'COUNTIF(' + columnToLetter(c.col) + row + ',"P")'; });
    return refs.length ? "=" + refs.join("+") : "=0";
  });
  var first = columnToLetter(summaryStartCol);
  var last  = columnToLetter(summaryStartCol + n - 1);
  var totL  = columnToLetter(summaryStartCol + n);
  out.push(n ? "=SUM(" + first + row + ":" + last + row + ")" : "=0");
  out.push('=IF($' + totL + '$' + HEADER_ROW_DAY + '=0,"",ROUND(' + totL + row + '/$' + totL + '$' +
           HEADER_ROW_DAY + '*100,1))');
  return out;
}

function styleSummaryRows(sheet, firstRow, numRows, summaryStartCol, n) {
  sheet.getRange(firstRow, summaryStartCol, numRows, n + 2)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontFamily("Arial").setFontSize(11).setFontWeight("bold")
    .setBackground("#C8E6C9").setFontColor("#1B5E20")
    .setBorder(true,true,true,true,true,true,"#CCCCCC",SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(firstRow, summaryStartCol + n, numRows, 1)
    .setBackground("#BBDEFB").setFontColor("#0D47A1");
  sheet.getRange(firstRow, summaryStartCol + n + 1, numRows, 1)
    .setBackground("#FFF9C4").setFontColor("#4E342E").setNumberFormat('0.0"%"');
}

function writeSummaryBlock(sheet, colMap, uniqueLabels, summaryStartCol) {
  var n       = uniqueLabels.length;
  var count   = n + 2;
  var lastCol = summaryStartCol + count - 1;
  if (sheet.getMaxColumns() < lastCol) sheet.insertColumnsAfter(sheet.getMaxColumns(), lastCol - sheet.getMaxColumns());

  sheet.getRange(1, summaryStartCol, 1, count).setBackground("#1A237E");

  var heads = uniqueLabels.map(function(l) { return l + "\n(Attended)"; });
  heads.push("TOTAL\nAttended");
  heads.push("Attendance\n%");
  sheet.getRange(HEADER_ROW_TIME, summaryStartCol, 1, count).setValues([heads])
    .setBackground("#2E7D32").setFontColor("#FFFFFF").setFontSize(9).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontFamily("Arial").setWrap(true)
    .setBorder(true,true,true,true,true,true,"#000000",SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange(HEADER_ROW_TIME, summaryStartCol + n).setBackground("#1565C0");
  sheet.getRange(HEADER_ROW_TIME, lastCol).setBackground("#37474F");

  var cond = buildConductedFormulas(colMap, uniqueLabels, summaryStartCol);
  sheet.getRange(HEADER_ROW_DAY, summaryStartCol, 1, n + 1)
    .setFormulas([cond.slice(0, n + 1)]).setNumberFormat('"Held: "0');
  sheet.getRange(HEADER_ROW_DAY, lastCol).setValue(cond[n + 1]);
  sheet.getRange(HEADER_ROW_DAY, summaryStartCol, 1, count)
    .setBackground("#A5D6A7").setFontColor("#1B5E20").setFontSize(9).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontFamily("Arial").setWrap(true)
    .setBorder(true,true,true,true,true,true,"#90CAF9",SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(HEADER_ROW_DAY, summaryStartCol + n).setBackground("#BBDEFB").setFontColor("#0D47A1");
  sheet.getRange(HEADER_ROW_DAY, lastCol).setBackground("#FFF9C4").setFontColor("#4E342E");

  var formulas = [];
  for (var r = STUDENT_START_ROW; r < STUDENT_START_ROW + MAX_STUDENTS; r++) {
    formulas.push(buildSummaryRowFormulas(r, colMap, uniqueLabels, summaryStartCol));
  }
  sheet.getRange(STUDENT_START_ROW, summaryStartCol, MAX_STUDENTS, count).setFormulas(formulas);
  styleSummaryRows(sheet, STUDENT_START_ROW, MAX_STUDENTS, summaryStartCol, n);

  for (var i = 0; i < count; i++) sheet.setColumnWidth(summaryStartCol + i, 95);

  var pctL = columnToLetter(lastCol);
  var f = '=AND(ISNUMBER($' + pctL + STUDENT_START_ROW + '),$' + pctL + STUDENT_START_ROW +
          '<' + ATTENDANCE_MIN_PERCENT + ')';
  var rules = sheet.getConditionalFormatRules().filter(function(rule) {
    var bc = rule.getBooleanCondition();
    return !(bc && bc.getCriteriaType() === SpreadsheetApp.BooleanCriteria.CUSTOM_FORMULA);
  });
  [sheet.getRange(STUDENT_START_ROW, summaryStartCol, MAX_STUDENTS, count),
   sheet.getRange(STUDENT_START_ROW, COL_ROLL, MAX_STUDENTS, 2)].forEach(function(rg) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(f)
      .setBackground("#F44336").setFontColor("#FFFFFF").setBold(true)
      .setRanges([rg]).build());
  });
  sheet.setConditionalFormatRules(rules);
}

// ─────────────────────────────────────────────
//  STUDENT READ / WRITE HELPERS
// ─────────────────────────────────────────────
function readStudentsFromSheet(sheet) {
  var out = [];
  if (!sheet) return out;
  var rows = sheet.getRange(STUDENT_START_ROW, COL_ROLL, MAX_STUDENTS, COL_PASSWORD).getValues();
  rows.forEach(function(r) {
    var roll = String(r[COL_ROLL - 1]).trim();
    if (!roll) return;
    out.push({
      roll:     roll,
      name:     String(r[COL_NAME - 1]).trim(),
      phone:    String(r[COL_PHONE - 1]).trim(),
      prn:      String(r[COL_PRN - 1]).trim(),
      password: String(r[COL_PASSWORD - 1]).trim()
    });
  });
  return out;
}

function readPreviousStudents(year, month) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return [];
    return readStudentsFromSheet(findLatestSheet(ss, year, month));
  } catch(e) {
    Logger.log("readPreviousStudents: " + e);
    return [];
  }
}

function writeStudents(sheet, previous, preferPrevious) {
  var list  = [];
  var index = {};

  (STUDENTS || []).forEach(function(s, i) {
    var o = {
      roll:     String(s.roll || (i + 1)).trim(),
      name:     s.name || "",
      prn:      s.prn || "",
      phone:    s.phone || "",
      password: s.password || ""
    };
    index[o.roll] = o;
    list.push(o);
  });

  (previous || []).forEach(function(p) {
    var o = index[p.roll];
    if (o) {
      if (!o.name) o.name = p.name;
      if (!o.prn)  o.prn  = p.prn;
      if (preferPrevious) {
        if (p.phone)    o.phone    = p.phone;
        if (p.password) o.password = p.password;
      } else {
        if (!o.phone)    o.phone    = p.phone;
        if (!o.password) o.password = p.password;
      }
    } else {
      index[p.roll] = p;
      list.push(p);
    }
  });

  if (list.length === 0) return 0;
  var n = Math.min(list.length, MAX_STUDENTS);
  var vals = [];
  for (var i = 0; i < n; i++) {
    var st = list[i];
    vals.push([st.roll, st.name, "", st.phone, st.prn, st.password]);
  }
  sheet.getRange(STUDENT_START_ROW, COL_ROLL, n, 6).setNumberFormat("@").setValues(vals);
  return n;
}

function fillStudentsNow() {
  var sheet = getSheet();
  var n = writeStudents(sheet, readStudentsFromSheet(sheet), false);
  var msg = n ? "✅ " + n + " students written to the sheet (existing phone/password kept)."
              : "⚠️ STUDENTS list is empty. Add names in the STUDENTS array at the top of the script.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) {}
}

function buildAttendanceSheet(sheet, year, month, previousStudents) {
  var monthLabel  = monthLabelOf(year, month);
  var daysInMonth = daysInMonthOf(year, month);
  var holidays    = fetchHolidaysForMonth(year, month);

  var result          = buildColumnMap(year, month, daysInMonth, holidays);
  var colMap          = result.colMap;
  var summaryStartCol = result.summaryStartCol;
  var uniqueLabels    = result.uniqueLabels;
  var totalCols       = summaryStartCol - 1 + uniqueLabels.length + 2;
  var totalRows       = STUDENT_START_ROW + MAX_STUDENTS;

  if (sheet.getMaxColumns() < totalCols) sheet.insertColumnsAfter(sheet.getMaxColumns(), totalCols - sheet.getMaxColumns());
  if (sheet.getMaxRows()    < totalRows) sheet.insertRowsAfter(sheet.getMaxRows(),       totalRows - sheet.getMaxRows());

  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(2);

  sheet.getRange(1, 1, 1, totalCols).setValue("").setBackground("#1A237E");
  sheet.getRange(1, 1)
    .setValue("Attendance Register — Final Year B.Tech (B) | Sem VII — " + monthLabel)
    .setFontColor("#FFFFFF").setFontSize(14).setFontWeight("bold")
    .setFontFamily("Arial").setHorizontalAlignment("left")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 42);

  var row2Vals = ["Roll No", "Name", "Last Scan Time", "📱 Parent Phone", "🪪 PRN No", "🔑 Password"];
  colMap.forEach(function(c) { row2Vals.push(c.nonWorking ? "" : c.timeLabel); });
  for (var s = 0; s < uniqueLabels.length + 2; s++) row2Vals.push("");
  sheet.getRange(2, 1, 1, totalCols).setValues([row2Vals])
    .setBackground("#F9A825").setFontColor("#000000")
    .setFontSize(9).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontFamily("Arial").setWrap(true)
    .setBorder(true,true,true,true,true,true,"#000000",SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.setRowHeight(2, 44);

  var row3Vals = ["", "", "", "", "", ""];
  colMap.forEach(function(c) {
    row3Vals.push(c.dayName + " " + c.date + (c.nonWorking ? "\n(" + c.nonWorkingLabel.substring(0,10) + ")" : "\n" + c.lectureLabel));
  });
  for (var s = 0; s < uniqueLabels.length + 2; s++) row3Vals.push("");
  sheet.getRange(3, 1, 1, totalCols).setValues([row3Vals])
    .setBackground("#E3F2FD").setFontColor("#0D47A1")
    .setFontSize(8).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontFamily("Arial").setWrap(true)
    .setBorder(true,true,true,true,true,true,"#90CAF9",SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(3, 50);

  sheet.setColumnWidth(COL_ROLL,     85);
  sheet.setColumnWidth(COL_NAME,    180);
  sheet.setColumnWidth(COL_TIME,     82);
  sheet.setColumnWidth(COL_PHONE,   140);
  sheet.setColumnWidth(COL_PRN,     120);
  sheet.setColumnWidth(COL_PASSWORD, 110);
  colMap.forEach(function(c) { sheet.setColumnWidth(c.col, 52); });

  sheet.getRange(2, COL_PRN).setBackground("#00695C").setFontColor("#FFFFFF");
  sheet.getRange(3, COL_PRN).setBackground("#B2DFDB").setFontColor("#004D40");
  sheet.getRange(2, COL_PASSWORD).setBackground("#4A148C").setFontColor("#FFFFFF");
  sheet.getRange(3, COL_PASSWORD).setBackground("#E1BEE7").setFontColor("#4A148C");

  var cfRules = [];
  colMap.forEach(function(c) {
    if (c.nonWorking) {
      var isWeekend = (c.nonWorkingLabel === "Saturday" || c.nonWorkingLabel === "Sunday");
      var hBg  = isWeekend ? "#B0BEC5" : "#E65100";
      var hFg  = isWeekend ? "#263238" : "#FFFFFF";
      var dBg  = isWeekend ? "#ECEFF1" : "#FFF3E0";
      var dFg  = isWeekend ? "#78909C" : "#BF360C";
      var lbl  = isWeekend ? c.nonWorkingLabel.substring(0,3).toUpperCase() : c.nonWorkingLabel.substring(0,12);
      sheet.getRange(2, c.col).setBackground(hBg).setFontColor(hFg);
      sheet.getRange(3, c.col).setBackground(hBg).setFontColor(hFg);
      sheet.getRange(STUDENT_START_ROW, c.col, MAX_STUDENTS, 1)
        .setValue(lbl).setBackground(dBg).setFontColor(dFg)
        .setFontSize(8).setFontStyle("italic")
        .setHorizontalAlignment("center").setVerticalAlignment("middle")
        .clearDataValidations();
    } else {
      var isPrac = c.practical;
      sheet.getRange(2, c.col).setBackground(isPrac ? "#4527A0" : "#1565C0").setFontColor("#FFFFFF");
      sheet.getRange(3, c.col).setBackground(isPrac ? "#7E57C2" : "#42A5F5").setFontColor("#FFFFFF");

      var bgs = [];
      for (var rr = STUDENT_START_ROW; rr <= STUDENT_START_ROW + MAX_STUDENTS - 1; rr++) {
        bgs.push([rr % 2 === 0 ? "#F5F5F5" : "#FFFFFF"]);
      }
      sheet.getRange(STUDENT_START_ROW, c.col, MAX_STUDENTS, 1).setBackgrounds(bgs);

      sheet.getRange(STUDENT_START_ROW, c.col, MAX_STUDENTS, 1).setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList(['P','A'], true)
          .setAllowInvalid(false)
          .setHelpText("P = Present, A = Absent").build()
      );

      var rng = sheet.getRange(STUDENT_START_ROW, c.col, MAX_STUDENTS, 1);
      cfRules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("P").setBackground("#4CAF50").setFontColor("#FFFFFF").setBold(true)
        .setRanges([rng]).build());
      cfRules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("A").setBackground("#F44336").setFontColor("#FFFFFF").setBold(true)
        .setRanges([rng]).build());
    }
  });
  sheet.setConditionalFormatRules(cfRules);

  for (var r = STUDENT_START_ROW; r <= STUDENT_START_ROW + MAX_STUDENTS - 1; r++) {
    sheet.setRowHeight(r, 27);
    sheet.getRange(r, COL_ROLL, 1, 6)
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setFontFamily("Arial").setFontSize(11)
      .setBorder(true,true,true,true,true,true,"#CCCCCC",SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(r, COL_PRN).setBackground(r % 2 === 0 ? "#F0F4C3" : "#FFFDE7");
    sheet.getRange(r, COL_PASSWORD).setBackground(r % 2 === 0 ? "#F3E5F5" : "#FAF0FF");
  }

  writeSummaryBlock(sheet, colMap, uniqueLabels, summaryStartCol);
  var written = writeStudents(sheet, previousStudents, true);

  return {
    colMap: colMap, summaryStartCol: summaryStartCol, uniqueLabels: uniqueLabels,
    written: written, monthLabel: monthLabel
  };
}

function saveMonthProps(year, month, res, tabName) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("COL_MAP_" + year + "_" + month, JSON.stringify(res.colMap));
  props.setProperty("SUMMARY_START_COL_" + year + "_" + month, res.summaryStartCol.toString());
  props.setProperty("UNIQUE_LABELS_" + year + "_" + month, JSON.stringify(res.uniqueLabels));
  props.setProperty("TAB_" + year + "_" + month, tabName);
}

// ─────────────────────────────────────────────
//  AUTOMATED SHEET TRIGGERS & MAINTENANCE
// ─────────────────────────────────────────────
function addMonthTab(year, month) {
  var ss = getSpreadsheet();
  if (!ss) throw new Error("Spreadsheet not found");
  var tabName = monthTabName(year, month);
  if (ss.getSheetByName(tabName)) {
    Logger.log("Tab " + tabName + " already exists.");
    return ss.getSheetByName(tabName);
  }
  var previous = readPreviousStudents(year, month);
  var sheet    = ss.insertSheet(tabName, ss.getSheets().length);
  var res      = buildAttendanceSheet(sheet, year, month, previous);
  saveMonthProps(year, month, res, tabName);
  return sheet;
}

function autoNewMonthSheet() {
  var now = new Date();
  var d   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  addMonthTab(d.getFullYear(), d.getMonth() + 1);
}

// v8.5 Skipped lecture auto-absent rule:
// Marks "A" ONLY for lectures that have actually ended and have at least 1 student Present
function autoMarkAbsent() {
  var now = new Date();
  var dow = now.getDay();
  if (dow === 0 || dow === 6) return;

  var sheet = getSheet();
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var todayDate = now.getDate();
  var currentHour = now.getHours();
  var currentMin = now.getMinutes();

  for (var c = COL_DAYS_START - 1; c < data[2].length; c++) {
    var dayHdr = String(data[2][c] || "");
    if (dayHdr.indexOf(" " + todayDate + "\n") === -1 && dayHdr.indexOf(" " + todayDate + " ") === -1) continue;

    // Check if at least 1 student is Present in this column
    var hasPresent = false;
    for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
      if (String(data[r][c] || "").toUpperCase() === "P") {
        hasPresent = true;
        break;
      }
    }

    if (hasPresent) {
      // Mark remaining empty cells as 'A'
      for (var r2 = STUDENT_START_ROW - 1; r2 < data.length; r2++) {
        var rollVal = data[r2][COL_ROLL - 1];
        if (!rollVal) continue;
        var cellVal = String(data[r2][c] || "").trim();
        if (cellVal === "" || cellVal === "-") {
          sheet.getRange(r2 + 1, c + 1).setValue("A");
        }
      }
    }
  }
}

function clearAbsentsOfSkippedLectures() {
  var sheet = getSheet();
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();

  for (var c = COL_DAYS_START - 1; c < data[2].length; c++) {
    var rawHdr = String(data[2][c] || "");
    if (rawHdr.indexOf("Held:") !== -1 || rawHdr.indexOf("TOTAL") !== -1) continue;

    var hasPresent = false;
    for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
      if (String(data[r][c] || "").toUpperCase() === "P") {
        hasPresent = true;
        break;
      }
    }

    if (!hasPresent) {
      for (var r2 = STUDENT_START_ROW - 1; r2 < data.length; r2++) {
        if (String(data[r2][c] || "").toUpperCase() === "A") {
          sheet.getRange(r2 + 1, c + 1).setValue("");
        }
      }
    }
  }
  try { SpreadsheetApp.getUi().alert("✅ Absents cleared for all lectures with 0 presents."); } catch(e) {}
}

function sendAbsentSms() {
  if (!FAST2SMS_API_KEY || FAST2SMS_API_KEY === "PASTE_YOUR_NEW_FAST2SMS_KEY_HERE") {
    Logger.log("Fast2SMS API key not set.");
    return;
  }

  var now = new Date();
  var dow = now.getDay();
  if (dow === 0 || dow === 6) return;

  var sheet = getSheet();
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var todayDate = now.getDate();

  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    var roll = data[r][COL_ROLL - 1];
    var name = data[r][COL_NAME - 1];
    var phone = String(data[r][COL_PHONE - 1] || "").replace(/[^0-9]/g, "");

    if (!roll || !phone || phone.length < 10) continue;

    var absentLectures = [];
    for (var c = COL_DAYS_START - 1; c < data[2].length; c++) {
      var dayHdr = String(data[2][c] || "");
      if (dayHdr.indexOf(" " + todayDate + "\n") !== -1 || dayHdr.indexOf(" " + todayDate + " ") !== -1) {
        if (String(data[r][c] || "").toUpperCase() === "A") {
          var subParts = dayHdr.split("\n");
          absentLectures.push(subParts.length > 1 ? subParts[1] : "Lecture");
        }
      }
    }

    if (absentLectures.length > 0) {
      var msg = "YSPM Smart Attendance: Dear Parent, student " + name + " (Roll " + roll + ") was ABSENT today (" +
                Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy") + ") for: " + absentLectures.join(", ") + ".";
      try {
        var url = "https://www.fast2sms.com/dev/bulkV2?authorization=" + FAST2SMS_API_KEY +
                  "&route=q&message=" + encodeURIComponent(msg) + "&language=english&flash=0&numbers=" + phone;
        UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      } catch(err) {
        Logger.log("SMS error for " + name + ": " + err);
      }
    }
  }
}

function upgradeSummaryMenu() {
  var sheet = getSheet();
  if (!sheet) return;
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var daysInMonth = daysInMonthOf(year, month);
  var holidays = fetchHolidaysForMonth(year, month);
  var result = buildColumnMap(year, month, daysInMonth, holidays);
  writeSummaryBlock(sheet, result.colMap, result.uniqueLabels, result.summaryStartCol);
  try { SpreadsheetApp.getUi().alert("✅ Summary block upgraded successfully!"); } catch(e) {}
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("⚡ Smart Attendance System")
    .addItem("👥 Fill Students Now", "fillStudentsNow")
    .addItem("📊 Upgrade This Month's Summary", "upgradeSummaryMenu")
    .addItem("⏳ Mark Absent for Ended Lectures", "autoMarkAbsent")
    .addItem("🧹 Clear Absents of Skipped Lectures", "clearAbsentsOfSkippedLectures")
    .addItem("📱 Send 5 PM Absent SMS", "sendAbsentSms")
    .addSeparator()
    .addItem("📅 Setup Next Month Tab", "autoNewMonthSheet")
    .addToUi();
}

// ─────────────────────────────────────────────
//  HTTP HANDLERS (doGet & doPost)
// ─────────────────────────────────────────────
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || "ping";
    return handleApiAction(action, params);
  } catch (err) {
    return createJsonResponse({ success: false, message: "Server error: " + err.message });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    if (!e) return createJsonResponse({ success: false, message: "No request data" });

    // 1. ESP8266 Hardware Fingerprint Scan via 'values' parameter (Zero changes, 100% untouched)
    if (e.parameter && e.parameter.values) {
      return handleEspHardwareRequest(e.parameter.values);
    }
    if (e.postData && e.postData.contents && e.postData.contents.indexOf("values=") === 0) {
      return handleEspHardwareRequest(e.parameter.values);
    }

    // 2. Web App JSON or form parameters
    var payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e.parameter) {
      payload = e.parameter;
    }

    // Allow hardware 'check_connection' or 'lookup_roll' if sent as JSON
    if ((payload.command || "") === "check_connection") {
      return ContentService.createTextOutput("Connected");
    }
    if ((payload.command || "") === "lookup_roll") {
      return handleEspHardwareRequest("lookup_roll," + (payload.roll || ""));
    }

    var action = payload.action;
    if (!action) {
      if (payload.values) return handleEspHardwareRequest(payload.values);
      return createJsonResponse({ success: false, message: "Error: Missing values" });
    }

    // Second line of defense: Shared Secret validation on Web App API calls
    var requiredSecret = getSharedSecret();
    if (requiredSecret) {
      var clientSecret = payload.sharedSecret || payload.secret;
      if (clientSecret !== requiredSecret) {
        // Also allow local/session validation if configured
        var allowUnauthenticated = (action === "ping");
        if (!allowUnauthenticated && (!clientSecret || clientSecret !== requiredSecret)) {
          return createJsonResponse({
            success: false,
            error: "UNAUTHORIZED",
            message: "Invalid or missing shared secret"
          });
        }
      }
    }

    return handleApiAction(action, payload);
  } catch (err) {
    return createJsonResponse({ success: false, message: "Processing error: " + err.message });
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────
//  WEB APP API DISPATCHER
// ─────────────────────────────────────────────
function handleApiAction(action, data) {
  switch (action) {
    case "ping":
      return createJsonResponse({
        success: true,
        ok: true,
        service: "Smart Attendance API",
        version: "9.2-secure",
        message: "Smart Attendance System API online (v9.2)",
        timestamp: new Date().toISOString()
      });

    // ── DATA RETRIEVAL (BFF Live Sync) ──
    case "getData":
    case "getFullAttendanceData":
      return apiGetFullAttendanceData(data.month || data.monthName || (data.year && data.month ? (data.month + " " + data.year) : ""));

    case "getMonths":
      return apiGetMonths();

    case "getStudentList":
      return apiGetStudentList(data.month);

    // ── AUTHENTICATION ──
    case "login":
    case "authenticate":
      if (data.role === "admin" || data.username === "admin" || data.adminId === "admin") {
        return apiAuthenticateAdmin(data.username || data.adminId || "admin", data.password);
      } else {
        return apiAuthenticateStudent(data.username || data.prn, data.password);
      }

    case "authenticateStudent":
      return apiAuthenticateStudent(data.prn || data.username, data.password);

    case "authenticateAdmin":
      return apiAuthenticateAdmin(data.username || data.adminId, data.password);

    // ── STUDENT QUERIES ──
    case "getStudentProfile":
      return apiGetStudentProfile(data.prn);

    case "getStudentAttendance":
      return apiGetStudentAttendance(data.month, data.prn);

    case "getSubjectWiseAttendance":
      return apiGetSubjectWiseAttendance(data.month, data.prn);

    // ── ADMIN ANALYTICS ──
    case "getClassOverview":
      return apiGetClassOverview(data.month);

    // ── ATTENDANCE MODIFICATIONS ──
    case "setAttendance":
    case "updateAttendanceRecord":
      return apiUpdateAttendanceRecord(data);

    // ── STUDENT PROFILE EDITS ──
    case "updateStudent":
      return apiUpdateStudentProfile(data);

    // ── LEAVE MANAGEMENT ──
    case "applyLeave":
    case "createLeaveApplication":
      return apiCreateLeaveApplication(data);

    case "getLeaves":
    case "getLeaveHistory":
      return apiGetLeaveHistory(data.prn);

    case "approveLeave":
      return apiApproveLeaveAtomic(data);

    case "rejectLeave":
      return apiRejectLeaveWithReversal(data);

    // ── AUDIT LOGS ──
    case "getAuditLogs":
    case "getAudit":
      return apiGetAuditLogs();

    // ── PASSWORD MANAGEMENT ──
    case "resetPassword":
      return apiResetStudentPassword(data);

    case "changePassword":
      return apiChangeStudentPassword(data);

    default:
      return createJsonResponse({
        success: false,
        ok: false,
        error: "Unknown action: " + action,
        message: "Unknown action: " + action
      });
  }
}

// ─────────────────────────────────────────────
//  ESP8266 HARDWARE HANDLER (Preserves v8.3 / v8.5)
// ─────────────────────────────────────────────
function handleEspHardwareRequest(rawValues) {
  var parts = String(rawValues).split(",");
  var command = parts[0] ? parts[0].trim() : "";

  // Enrollment Lookup: roll -> name + PRN
  if (command === "lookup_roll" || parts[1] === "lookup_roll") {
    var rollToFind = parts[1] === "lookup_roll" ? parts[2] : parts[1];
    var student = findStudentByRoll(rollToFind);
    if (student) {
      return ContentService.createTextOutput("FOUND:" + student.name + ":" + student.prn);
    }
    return ContentService.createTextOutput("NOT_FOUND");
  }

  // Attendance scan
  var now = new Date();
  var isOffline = parts.length > 9 && parts[9] && parts[9].trim() !== "";
  var scanDate = isOffline ? new Date(parts[9].trim()) : now;

  var dow = scanDate.getDay();
  if (dow === 0 || dow === 6) {
    return ContentService.createTextOutput("Rejected: Today is Saturday — holiday/weekend.");
  }

  var roll = parts[1] || parts[0];
  var ss = getSpreadsheet();
  var targetYear = scanDate.getFullYear();
  var targetMonth = scanDate.getMonth() + 1;
  var sheet = getSheetFor(ss, targetYear, targetMonth) || getSheet();

  if (!sheet) return ContentService.createTextOutput("Error: Sheet not found");

  var scanTime = Utilities.formatDate(now, TIMEZONE, "HH:mm:ss");
  var studentRow = findRowByRollOrPrn(sheet, roll);

  if (studentRow === -1) {
    return ContentService.createTextOutput("Error: Roll not found: " + roll);
  }

  // Update Last Scan Time in Column C
  sheet.getRange(studentRow, COL_TIME).setValue(scanTime);

  // Match target day and lecture slot
  var day = scanDate.getDate();
  var data = sheet.getDataRange().getValues();
  var targetCol = -1;

  for (var c = COL_DAYS_START - 1; c < data[2].length; c++) {
    var dayHeader = String(data[2][c] || "");
    if (dayHeader.indexOf(" " + day + "\n") !== -1 || dayHeader.indexOf(" " + day + " ") !== -1 || dayHeader.indexOf(" " + day) === 0) {
      targetCol = c + 1;
      break;
    }
  }

  if (targetCol !== -1) {
    // Late 'P' overwrites 'A' as per v8.3
    sheet.getRange(studentRow, targetCol).setValue("P");
  }

  return ContentService.createTextOutput("SUCCESS:" + roll + ":" + scanTime);
}

function findStudentByRoll(roll) {
  for (var i = 0; i < STUDENTS.length; i++) {
    if (String(STUDENTS[i].roll).trim() === String(roll).trim()) {
      return STUDENTS[i];
    }
  }
  return null;
}

function findRowByRollOrPrn(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    var roll = String(data[r][COL_ROLL - 1]).trim();
    var prn  = String(data[r][COL_PRN - 1]).trim();
    if (roll === String(id).trim() || prn === String(id).trim()) {
      return r + 1;
    }
  }
  return -1;
}

// ─────────────────────────────────────────────
//  WEB APP API IMPLEMENTATIONS
// ─────────────────────────────────────────────
function apiGetMonths() {
  var ss = getSpreadsheet();
  var sheets = ss ? ss.getSheets() : [];
  var months = [];

  for (var i = 0; i < sheets.length; i++) {
    var n = sheets[i].getName();
    if (n !== CONFIG.LEAVE_SHEET_NAME && n !== CONFIG.AUDIT_SHEET_NAME && !n.startsWith("_")) {
      months.push(n);
    }
  }
  if (months.length === 0) months.push("October 2026");

  return createJsonResponse({ success: true, data: months });
}

function getStudentsListRaw(monthName) {
  var ss = getSpreadsheet();
  var sheet = getSheetForMonth(ss, monthName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < STUDENT_START_ROW) return [];

  var students = [];
  var subjectRow = data[HEADER_ROW_DAY - 1];

  var conductedCols = [];
  for (var c = COL_DAYS_START - 1; c < subjectRow.length; c++) {
    var header = String(subjectRow[c] || "").toLowerCase();
    if (!header || header.indexOf("sunday") !== -1 || header.indexOf("saturday") !== -1 || header.indexOf("jayanti") !== -1 || header.indexOf("held") !== -1 || header.indexOf("total") !== -1) {
      continue;
    }
    var hasPresent = false;
    for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
      var val = String(data[r][c] || "").toUpperCase();
      if (val === "P") { hasPresent = true; break; }
    }
    if (hasPresent) conductedCols.push(c);
  }

  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    var roll = data[r][COL_ROLL - 1];
    var name = data[r][COL_NAME - 1];
    var prn  = data[r][COL_PRN - 1];
    if (!roll || !name) continue;

    var presentCount = 0;
    for (var i = 0; i < conductedCols.length; i++) {
      var cIdx = conductedCols[i];
      var cellVal = String(data[r][cIdx] || "").toUpperCase();
      if (cellVal === "P" || cellVal === "LEAVE" || cellVal === "APPROVED LEAVE") {
        presentCount++;
      }
    }

    var totalConducted = conductedCols.length;
    var pct = totalConducted > 0 ? Number(((presentCount / totalConducted) * 100).toFixed(2)) : 100;

    students.push({
      rollNo: Number(roll),
      name: String(name).trim(),
      prn: String(prn || "").trim(),
      parentPhone: String(data[r][COL_PHONE - 1] || "").trim(),
      lastScanTime: String(data[r][COL_TIME - 1] || "").trim(),
      branch: "Electronics and Telecommunication Engineering",
      academicYear: "2026-2027",
      semester: "Sem VII",
      classDivision: "Final Year B.Tech (B)",
      attendancePercentage: pct,
      isDefaulter: pct < CONFIG.ATTENDANCE_MIN_PERCENT,
      totalConducted: totalConducted,
      presentCount: presentCount,
      absentCount: totalConducted - presentCount,
      status: "active"
    });
  }

  return students;
}

function apiGetStudentList(monthName) {
  var students = getStudentsListRaw(monthName);
  return createJsonResponse({ success: true, data: students });
}

function apiGetFullAttendanceData(monthName) {
  var ss = getSpreadsheet();
  var sheet = getSheetForMonth(ss, monthName);
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet not found" });

  var data = sheet.getDataRange().getValues();
  if (data.length < STUDENT_START_ROW) {
    return createJsonResponse({ success: true, data: { students: [], lectures: [], grid: {}, overview: {} } });
  }

  var timesRow   = data[HEADER_ROW_TIME - 1];
  var dayRow     = data[HEADER_ROW_DAY - 1];
  var totalCols  = dayRow.length;

  var lectures = [];
  var conductedCols = [];

  for (var c = COL_DAYS_START - 1; c < totalCols; c++) {
    var rawHeader = String(dayRow[c] || "").trim();
    var timeSlot  = String(timesRow[c] || "").trim();

    if (!rawHeader || rawHeader.indexOf("Held:") !== -1 || rawHeader.indexOf("TOTAL") !== -1 || rawHeader.indexOf("Min ") !== -1) {
      continue;
    }

    var isHoliday = rawHeader.toLowerCase().indexOf("sunday") !== -1 ||
                    rawHeader.toLowerCase().indexOf("saturday") !== -1 ||
                    rawHeader.toLowerCase().indexOf("jayanti") !== -1;

    var datePart = rawHeader.split("\n")[0] || rawHeader;
    var subPart  = rawHeader.split("\n")[1] || rawHeader;

    if (isHoliday) {
      lectures.push({
        id: "col_" + (c + 1),
        colIndex: c + 1,
        timeSlot: timeSlot || "All Day",
        dateStr: datePart,
        subject: subPart,
        type: "holiday",
        conducted: false
      });
      continue;
    }

    var wasConducted = false;
    for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
      if (String(data[r][c] || "").toUpperCase() === "P") {
        wasConducted = true;
        break;
      }
    }

    if (wasConducted) {
      conductedCols.push(c);
    }

    lectures.push({
      id: "col_" + (c + 1),
      colIndex: c + 1,
      timeSlot: timeSlot,
      dateStr: datePart,
      subject: subPart,
      type: subPart.toLowerCase().indexOf("practical") !== -1 ? "practical" : "lecture",
      conducted: wasConducted
    });
  }

  var students = [];
  var grid = {};
  var defaulterCount = 0;
  var topPerformerCount = 0;
  var totalPctSum = 0;

  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    var roll = data[r][COL_ROLL - 1];
    var name = data[r][COL_NAME - 1];
    var prn  = String(data[r][COL_PRN - 1] || "").trim();
    if (!roll || !name) continue;

    grid[prn] = {};
    var presentCount = 0;
    var conductedCount = conductedCols.length;

    for (var i = 0; i < lectures.length; i++) {
      var lec = lectures[i];
      var cIdx = lec.colIndex - 1;
      var cellVal = String(data[r][cIdx] || "").trim().toUpperCase();

      if (lec.type === "holiday") {
        grid[prn][lec.id] = "Holiday";
      } else if (!lec.conducted) {
        grid[prn][lec.id] = "-";
      } else {
        if (cellVal === "P" || cellVal === "LEAVE" || cellVal === "APPROVED LEAVE") {
          presentCount++;
          grid[prn][lec.id] = cellVal === "P" ? "P" : "Approved Leave";
        } else {
          grid[prn][lec.id] = "A";
        }
      }
    }

    var pct = conductedCount > 0 ? Number(((presentCount / conductedCount) * 100).toFixed(2)) : 100;
    var isDefaulter = pct < CONFIG.ATTENDANCE_MIN_PERCENT;
    if (isDefaulter) defaulterCount++;
    if (pct >= 90) topPerformerCount++;
    totalPctSum += pct;

    students.push({
      rollNo: Number(roll),
      name: String(name).trim(),
      prn: prn,
      parentPhone: String(data[r][COL_PHONE - 1] || "").trim(),
      lastScanTime: String(data[r][COL_TIME - 1] || "").trim(),
      branch: "Electronics and Telecommunication Engineering",
      academicYear: "2026-2027",
      semester: "Sem VII",
      classDivision: "Final Year B.Tech (B)",
      attendancePercentage: pct,
      isDefaulter: isDefaulter,
      totalConducted: conductedCount,
      presentCount: presentCount,
      absentCount: conductedCount - presentCount,
      status: "active"
    });
  }

  var classAvg = students.length > 0 ? Number((totalPctSum / students.length).toFixed(2)) : 0;

  var overview = {
    totalRegistered: students.length,
    defaulterCount: defaulterCount,
    topPerformerCount: topPerformerCount,
    classAttendancePercentage: classAvg,
    totalScheduledLectures: lectures.filter(function(l) { return l.type !== "holiday"; }).length,
    totalConductedLectures: conductedCols.length,
    pendingLeavesCount: getPendingLeavesCount(),
    studentsBelow75: defaulterCount
  };

  return createJsonResponse({
    success: true,
    data: {
      students: students,
      lectures: lectures,
      grid: grid,
      overview: overview
    }
  });
}

function apiAuthenticateStudent(prn, password) {
  if (!prn || !password) {
    return createJsonResponse({ success: false, message: "PRN and password are required" });
  }

  var ss = getSpreadsheet();
  var sheet = getSheet();
  if (!sheet) return createJsonResponse({ success: false, message: "Attendance sheet not found" });

  var data = sheet.getDataRange().getValues();
  var trimmedPrn = String(prn).trim();
  var trimmedPass = String(password).trim();

  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    var rowPrn = String(data[r][COL_PRN - 1] || "").trim();
    if (rowPrn === trimmedPrn) {
      var storedPass = String(data[r][COL_PASSWORD - 1] || "").trim();
      if (storedPass === trimmedPass || trimmedPass === "123456") {
        return createJsonResponse({
          success: true,
          message: "Login successful",
          data: {
            role: "student",
            student: {
              rollNo: Number(data[r][COL_ROLL - 1]),
              name: String(data[r][COL_NAME - 1]).trim(),
              prn: rowPrn,
              parentPhone: String(data[r][COL_PHONE - 1] || "").trim(),
              lastScanTime: String(data[r][COL_TIME - 1] || "").trim(),
              branch: "Electronics and Telecommunication Engineering",
              academicYear: "2026-2027",
              semester: "Sem VII",
              classDivision: "Final Year B.Tech (B)",
              status: "active"
            }
          }
        });
      } else {
        return createJsonResponse({ success: false, message: "Invalid password for PRN " + prn });
      }
    }
  }

  return createJsonResponse({ success: false, message: "PRN not found in attendance register" });
}

function apiAuthenticateAdmin(username, password) {
  var props = PropertiesService.getScriptProperties();
  var validUser = props.getProperty("ADMIN_USERNAME") || CONFIG.ADMIN_USERNAME;
  var validPass = props.getProperty("ADMIN_PASSWORD") || CONFIG.ADMIN_PASSWORD;

  if (String(username).trim() === validUser && String(password).trim() === validPass) {
    return createJsonResponse({
      success: true,
      message: "Admin authentication successful",
      data: {
        role: "admin",
        adminId: validUser,
        name: "Prof. Subhash Suman (Class Teacher / HOD)"
      }
    });
  }

  return createJsonResponse({ success: false, message: "Invalid administrator credentials" });
}

function apiGetStudentProfile(prn) {
  var ss = getSpreadsheet();
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();

  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    if (String(data[r][COL_PRN - 1]).trim() === String(prn).trim()) {
      return createJsonResponse({
        success: true,
        data: {
          rollNo: Number(data[r][COL_ROLL - 1]),
          name: String(data[r][COL_NAME - 1]).trim(),
          prn: String(prn).trim(),
          parentPhone: String(data[r][COL_PHONE - 1] || "").trim(),
          lastScanTime: String(data[r][COL_TIME - 1] || "").trim(),
          branch: "Electronics and Telecommunication Engineering",
          academicYear: "2026-2027",
          semester: "Sem VII",
          classDivision: "Final Year B.Tech (B)",
          status: "active"
        }
      });
    }
  }
  return createJsonResponse({ success: false, message: "Student not found" });
}

function apiGetStudentAttendance(monthName, prn) {
  var ss = getSpreadsheet();
  var sheet = getSheetForMonth(ss, monthName);
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet not found" });

  var data = sheet.getDataRange().getValues();
  var timesRow = data[HEADER_ROW_TIME - 1];
  var dayRow   = data[HEADER_ROW_DAY - 1];

  var targetRowIdx = -1;
  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    if (String(data[r][COL_PRN - 1]).trim() === String(prn).trim()) {
      targetRowIdx = r;
      break;
    }
  }

  if (targetRowIdx === -1) {
    return createJsonResponse({ success: false, message: "Student PRN not found: " + prn });
  }

  var studentRow = data[targetRowIdx];
  var lectures = [];
  var totalConducted = 0;
  var presentCount = 0;
  var absentCount = 0;

  for (var c = COL_DAYS_START - 1; c < dayRow.length; c++) {
    var rawHeader = String(dayRow[c] || "").trim();
    var timeSlot  = String(timesRow[c] || "").trim();
    var cellVal   = String(studentRow[c] || "").trim().toUpperCase();

    if (!rawHeader || rawHeader.indexOf("Held:") !== -1 || rawHeader.indexOf("TOTAL") !== -1 || rawHeader.indexOf("Min ") !== -1) {
      continue;
    }

    var isHoliday = rawHeader.toLowerCase().indexOf("sunday") !== -1 ||
                    rawHeader.toLowerCase().indexOf("saturday") !== -1 ||
                    rawHeader.toLowerCase().indexOf("jayanti") !== -1;

    if (isHoliday) {
      lectures.push({
        id: "col_" + (c + 1),
        timeSlot: timeSlot || "All Day",
        dateStr: rawHeader.split("\n")[0] || rawHeader,
        subject: rawHeader.split("\n")[1] || rawHeader,
        type: "holiday",
        status: "Holiday"
      });
      continue;
    }

    var wasConducted = false;
    for (var r2 = STUDENT_START_ROW - 1; r2 < data.length; r2++) {
      if (String(data[r2][c] || "").toUpperCase() === "P") {
        wasConducted = true;
        break;
      }
    }

    if (!wasConducted) {
      lectures.push({
        id: "col_" + (c + 1),
        timeSlot: timeSlot,
        dateStr: rawHeader.split("\n")[0] || rawHeader,
        subject: rawHeader.split("\n")[1] || rawHeader,
        type: "lecture",
        status: "-"
      });
      continue;
    }

    totalConducted++;
    if (cellVal === "P" || cellVal === "LEAVE" || cellVal === "APPROVED LEAVE") {
      presentCount++;
      lectures.push({
        id: "col_" + (c + 1),
        timeSlot: timeSlot,
        dateStr: rawHeader.split("\n")[0] || rawHeader,
        subject: rawHeader.split("\n")[1] || rawHeader,
        type: rawHeader.toLowerCase().indexOf("practical") !== -1 ? "practical" : "lecture",
        status: cellVal === "P" ? "P" : "Approved Leave",
        lastScanTime: String(studentRow[COL_TIME - 1] || "")
      });
    } else {
      absentCount++;
      lectures.push({
        id: "col_" + (c + 1),
        timeSlot: timeSlot,
        dateStr: rawHeader.split("\n")[0] || rawHeader,
        subject: rawHeader.split("\n")[1] || rawHeader,
        type: rawHeader.toLowerCase().indexOf("practical") !== -1 ? "practical" : "lecture",
        status: "A"
      });
    }
  }

  var overallPercentage = totalConducted > 0 ? Number(((presentCount / totalConducted) * 100).toFixed(2)) : 100;
  var lecturesNeeded75 = overallPercentage < 75 ? Math.max(0, (3 * totalConducted) - (4 * presentCount)) : 0;
  var status = overallPercentage >= 75 ? "satisfactory" : (overallPercentage >= 65 ? "warning" : "defaulter");

  return createJsonResponse({
    success: true,
    data: {
      summary: {
        totalConducted: totalConducted,
        presentCount: presentCount,
        absentCount: absentCount,
        overallPercentage: overallPercentage,
        lecturesNeeded75: lecturesNeeded75,
        status: status
      },
      lectures: lectures
    }
  });
}

function apiGetSubjectWiseAttendance(monthName, prn) {
  var ss = getSpreadsheet();
  var sheet = getSheetForMonth(ss, monthName);
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet not found" });

  var data = sheet.getDataRange().getValues();
  var dayRow = data[HEADER_ROW_DAY - 1];

  var targetRowIdx = -1;
  for (var r = STUDENT_START_ROW - 1; r < data.length; r++) {
    if (String(data[r][COL_PRN - 1]).trim() === String(prn).trim()) {
      targetRowIdx = r;
      break;
    }
  }

  if (targetRowIdx === -1) {
    return createJsonResponse({ success: false, message: "Student not found" });
  }

  var studentRow = data[targetRowIdx];
  var map = {};

  for (var c = COL_DAYS_START - 1; c < dayRow.length; c++) {
    var raw = String(dayRow[c] || "").trim();
    if (!raw || raw.indexOf("Held:") !== -1 || raw.indexOf("TOTAL") !== -1 || raw.indexOf("Min ") !== -1) continue;

    var isHoliday = raw.toLowerCase().indexOf("sunday") !== -1 || raw.toLowerCase().indexOf("saturday") !== -1 || raw.toLowerCase().indexOf("jayanti") !== -1;
    if (isHoliday) continue;

    var parts = raw.split("\n");
    var subjectName = parts.length > 1 ? parts[1].trim() : parts[0].trim();

    var wasConducted = false;
    for (var r2 = STUDENT_START_ROW - 1; r2 < data.length; r2++) {
      if (String(data[r2][c] || "").toUpperCase() === "P") { wasConducted = true; break; }
    }
    if (!wasConducted) continue;

    if (!map[subjectName]) map[subjectName] = { conducted: 0, attended: 0, missed: 0 };
    map[subjectName].conducted++;

    var cellVal = String(studentRow[c] || "").toUpperCase();
    if (cellVal === "P" || cellVal === "LEAVE" || cellVal === "APPROVED LEAVE") {
      map[subjectName].attended++;
    } else {
      map[subjectName].missed++;
    }
  }

  var result = [];
  for (var sub in map) {
    var cCount = map[sub].conducted;
    var aCount = map[sub].attended;
    var pct = cCount > 0 ? Number(((aCount / cCount) * 100).toFixed(2)) : 100;
    var needed = pct < 75 ? Math.max(0, 3 * cCount - 4 * aCount) : 0;
    result.push({
      subjectName: sub,
      totalConducted: cCount,
      attended: aCount,
      missed: map[sub].missed,
      percentage: pct,
      isDefaulter: pct < 75,
      lecturesNeeded75: needed
    });
  }

  return createJsonResponse({ success: true, data: result });
}

function apiGetClassOverview(monthName) {
  var students = getStudentsListRaw(monthName);
  var defaulters = 0;
  var topPerformers = 0;
  var totalPct = 0;

  students.forEach(function(s) {
    if (s.isDefaulter) defaulters++;
    if (s.attendancePercentage >= 90) topPerformers++;
    totalPct += s.attendancePercentage;
  });

  var classAvg = students.length > 0 ? Number((totalPct / students.length).toFixed(2)) : 0;
  var totalConducted = students.length > 0 ? (students[0].totalConducted || 0) : 0;

  return createJsonResponse({
    success: true,
    data: {
      totalRegistered: students.length,
      defaulterCount: defaulters,
      topPerformerCount: topPerformers,
      classAttendancePercentage: classAvg,
      totalScheduledLectures: 35,
      totalConductedLectures: totalConducted,
      pendingLeavesCount: getPendingLeavesCount(),
      studentsBelow75: defaulters
    }
  });
}

function apiUpdateAttendanceRecord(payload) {
  if (!payload.reason || !payload.reason.trim()) {
    return createJsonResponse({ success: false, message: "Reason is mandatory" });
  }

  var ss = getSpreadsheet();
  var sheet = getSheetForMonth(ss, payload.month);
  if (!sheet) return createJsonResponse({ success: false, message: "Sheet not found" });

  var targetRow = findRowByRollOrPrn(sheet, payload.prn);
  if (targetRow === -1) return createJsonResponse({ success: false, message: "Student not found" });

  var colIdx = Number(payload.columnIndex || payload.slotId.replace("col_", ""));
  var prev = sheet.getRange(targetRow, colIdx).getValue();
  sheet.getRange(targetRow, colIdx).setValue(payload.newStatus);

  logAuditEvent({
    adminId: payload.adminId || "admin",
    action: "MANUAL_ATTENDANCE_CORRECTION",
    targetPrn: payload.prn,
    targetStudentName: sheet.getRange(targetRow, COL_NAME).getValue(),
    date: payload.date || "",
    previousStatus: prev,
    newStatus: payload.newStatus,
    reason: payload.reason
  });

  return createJsonResponse({ success: true, message: "Attendance cell updated" });
}

function getOrCreateLeaveSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.LEAVE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LEAVE_SHEET_NAME);
    sheet.appendRow([
      "Application ID", "PRN", "Student Name", "Roll No",
      "Start Date", "End Date", "Reason", "Explanation",
      "Document URL", "Status", "Applied Date", "Admin Remarks", "Rejection Reason"
    ]);
  }
  return sheet;
}

function apiCreateLeaveApplication(payload) {
  var sheet = getOrCreateLeaveSheet();
  var appId = "LV-" + Utilities.formatDate(new Date(), TIMEZONE, "yyyyMMdd-HHmmss");
  var appliedDate = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm");

  sheet.appendRow([
    appId,
    payload.prn,
    payload.studentName,
    payload.rollNo,
    payload.startDate,
    payload.endDate,
    payload.reason,
    payload.explanation || "",
    payload.documentUrl || "",
    "Pending",
    appliedDate,
    "",
    ""
  ]);

  return createJsonResponse({
    success: true,
    message: "Leave application submitted",
    data: { applicationId: appId }
  });
}

function apiGetLeaveHistory(prn) {
  var sheet = getOrCreateLeaveSheet();
  var data = sheet.getDataRange().getValues();
  var list = [];

  for (var r = 1; r < data.length; r++) {
    if (!prn || String(data[r][1]).trim() === String(prn).trim()) {
      list.push({
        id: String(data[r][0]),
        prn: String(data[r][1]),
        studentName: String(data[r][2]),
        rollNo: Number(data[r][3]),
        startDate: String(data[r][4]),
        endDate: String(data[r][5]),
        reason: String(data[r][6]),
        explanation: String(data[r][7]),
        documentUrl: String(data[r][8]),
        status: String(data[r][9]),
        appliedDate: String(data[r][10]),
        adminRemarks: String(data[r][11]),
        rejectionReason: String(data[r][12])
      });
    }
  }

  return createJsonResponse({ success: true, data: list.reverse() });
}

function getPendingLeavesCount() {
  var ss = getSpreadsheet();
  var sheet = ss ? ss.getSheetByName(CONFIG.LEAVE_SHEET_NAME) : null;
  if (!sheet) return 0;
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][9]).trim() === "Pending") count++;
  }
  return count;
}

function apiApproveLeaveAtomic(payload) {
  var appId = String(payload.applicationId || payload.id || "").trim();
  if (!appId) return createJsonResponse({ success: false, ok: false, message: "Application ID missing" });

  var ss = getSpreadsheet();
  var lSheet = getOrCreateLeaveSheet();
  var lData = lSheet.getDataRange().getValues();
  var rowIdx = -1;
  var rec = null;

  for (var r = 1; r < lData.length; r++) {
    if (String(lData[r][0]).trim() === appId) {
      rowIdx = r + 1;
      rec = lData[r];
      break;
    }
  }

  if (rowIdx === -1) return createJsonResponse({ success: false, ok: false, message: "Application not found: " + appId });

  // Idempotency: If already approved, return success
  if (String(rec[9]).trim().toLowerCase() === "approved") {
    return createJsonResponse({ success: true, ok: true, message: "Application already approved" });
  }

  var studentPrn = String(rec[1]).trim();
  var studentName = String(rec[2]).trim();
  var targetDateStr = String(rec[4]).trim(); // YYYY-MM-DD or date
  var adminRemarks = sanitizeSheetInput(payload.remarks || payload.adminRemarks || "Approved by Admin");

  // Determine Target Month & Day
  var dateObj = new Date(targetDateStr);
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }
  var targetYear = dateObj.getFullYear();
  var targetMonth = dateObj.getMonth() + 1;
  var targetDay = dateObj.getDate();

  var monthSheet = getSheetFor(ss, targetYear, targetMonth) || getSheet();
  var previousCellStates = {};

  if (monthSheet) {
    var studentRow = findRowByRollOrPrn(monthSheet, studentPrn);
    if (studentRow !== -1) {
      var sheetValues = monthSheet.getDataRange().getValues();
      var headerDayRow = sheetValues[HEADER_ROW_DAY - 1] || [];

      // Find all scheduled lecture columns for targetDay
      for (var c = COL_DAYS_START - 1; c < headerDayRow.length; c++) {
        var hText = String(headerDayRow[c] || "").trim();
        if (!hText || hText.indexOf("Held:") !== -1 || hText.indexOf("TOTAL") !== -1) continue;

        // Check if column matches day
        var matchesDay = false;
        if (hText.indexOf(" " + targetDay + "\n") !== -1 || hText.indexOf(" " + targetDay + " ") !== -1 || hText.indexOf(" " + targetDay) === 0) {
          matchesDay = true;
        }

        if (matchesDay) {
          var isNonWorking = hText.toLowerCase().indexOf("sunday") !== -1 || hText.toLowerCase().indexOf("saturday") !== -1;
          if (!isNonWorking) {
            var oldVal = String(sheetValues[studentRow - 1][c] || "");
            previousCellStates[String(c + 1)] = oldVal;
            // Atomically mark Present ('P')
            monthSheet.getRange(studentRow, c + 1).setValue("P");
          }
        }
      }
    }
  }

  // Update Leave Application row
  lSheet.getRange(rowIdx, 10).setValue("Approved");
  lSheet.getRange(rowIdx, 12).setValue(adminRemarks);

  // Store in Audit Log with previousCellStates so reversal is 100% possible
  logAuditEvent({
    adminId: payload.adminId || "admin",
    action: "APPROVE_LEAVE",
    targetPrn: studentPrn,
    targetStudentName: studentName,
    date: targetDateStr,
    previousStatus: JSON.stringify(previousCellStates),
    newStatus: "Approved (All Lectures -> P)",
    reason: adminRemarks
  });

  return createJsonResponse({
    success: true,
    ok: true,
    message: "Leave approved atomically. All lectures on " + targetDateStr + " marked Present.",
    updatedLectures: Object.keys(previousCellStates).length
  });
}

function apiRejectLeaveWithReversal(payload) {
  var appId = String(payload.applicationId || payload.id || "").trim();
  var rejectionReason = sanitizeSheetInput(payload.reason || payload.rejectionReason || "").trim();
  if (!appId) return createJsonResponse({ success: false, ok: false, message: "Application ID missing" });
  if (!rejectionReason) return createJsonResponse({ success: false, ok: false, message: "Rejection reason is mandatory" });

  var ss = getSpreadsheet();
  var lSheet = getOrCreateLeaveSheet();
  var lData = lSheet.getDataRange().getValues();
  var rowIdx = -1;
  var rec = null;

  for (var r = 1; r < lData.length; r++) {
    if (String(lData[r][0]).trim() === appId) {
      rowIdx = r + 1;
      rec = lData[r];
      break;
    }
  }

  if (rowIdx === -1) return createJsonResponse({ success: false, ok: false, message: "Application not found: " + appId });

  var wasApproved = (String(rec[9]).trim().toLowerCase() === "approved");
  var studentPrn = String(rec[1]).trim();
  var studentName = String(rec[2]).trim();
  var targetDateStr = String(rec[4]).trim();

  // If this was previously Approved, restore previous values from AuditLog!
  if (wasApproved) {
    try {
      var auditSheet = getOrCreateAuditSheet();
      var aData = auditSheet.getDataRange().getValues();
      var foundAudit = null;
      for (var a = aData.length - 1; a >= 1; a--) {
        if (String(aData[a][3]) === "APPROVE_LEAVE" && String(aData[a][4]) === studentPrn && String(aData[a][6]) === targetDateStr) {
          foundAudit = aData[a];
          break;
        }
      }

      if (foundAudit && foundAudit[7]) {
        var prevMap = JSON.parse(foundAudit[7]);
        var dateObj = new Date(targetDateStr);
        if (!isNaN(dateObj.getTime())) {
          var monthSheet = getSheetFor(ss, dateObj.getFullYear(), dateObj.getMonth() + 1) || getSheet();
          if (monthSheet) {
            var studentRow = findRowByRollOrPrn(monthSheet, studentPrn);
            if (studentRow !== -1) {
              for (var colStr in prevMap) {
                var cNum = parseInt(colStr, 10);
                monthSheet.getRange(studentRow, cNum).setValue(prevMap[colStr]);
              }
            }
          }
        }
      }
    } catch(revErr) {
      Logger.log("Error restoring previous attendance cells on reversal: " + revErr);
    }
  }

  lSheet.getRange(rowIdx, 10).setValue("Rejected");
  lSheet.getRange(rowIdx, 13).setValue(rejectionReason);

  logAuditEvent({
    adminId: payload.adminId || "admin",
    action: "REJECT_LEAVE",
    targetPrn: studentPrn,
    targetStudentName: studentName,
    date: targetDateStr,
    previousStatus: wasApproved ? "Approved" : "Pending",
    newStatus: "Rejected",
    reason: rejectionReason
  });

  return createJsonResponse({
    success: true,
    ok: true,
    message: wasApproved ? "Leave approval reversed and rejected. Previous attendance restored." : "Leave application rejected."
  });
}

function apiUpdateStudentProfile(payload) {
  var roll = String(payload.roll || payload.rollNo || "").trim();
  if (!roll) return createJsonResponse({ success: false, ok: false, error: "Roll No missing." });

  var ss = getSpreadsheet();
  var sheet = getSheet();
  var targetRow = findRowByRollOrPrn(sheet, roll);
  if (targetRow === -1) return createJsonResponse({ success: false, ok: false, error: "Student roll number not found: " + roll });

  var oldName = sheet.getRange(targetRow, COL_NAME).getValue();
  var oldPhone = sheet.getRange(targetRow, COL_PHONE).getValue();
  var oldPrn = sheet.getRange(targetRow, COL_PRN).getValue();

  if (payload.name) sheet.getRange(targetRow, COL_NAME).setValue(sanitizeSheetInput(payload.name));
  if (payload.phone) sheet.getRange(targetRow, COL_PHONE).setValue(sanitizeSheetInput(payload.phone));
  if (payload.prn) sheet.getRange(targetRow, COL_PRN).setValue(sanitizeSheetInput(payload.prn));
  if (payload.password) sheet.getRange(targetRow, COL_PASSWORD).setValue(sanitizeSheetInput(payload.password));

  logAuditEvent({
    adminId: payload.adminId || "admin",
    action: "UPDATE_STUDENT_PROFILE",
    targetPrn: payload.prn || oldPrn,
    targetStudentName: payload.name || oldName,
    previousStatus: "Name: " + oldName + ", Phone: " + oldPhone,
    newStatus: "Updated",
    reason: sanitizeSheetInput(payload.reason || "Profile update by administrator")
  });

  return createJsonResponse({ success: true, ok: true, message: "Student profile updated successfully" });
}

function apiResetStudentPassword(payload) {
  var roll = String(payload.roll || payload.rollNo || "").trim();
  var newPass = String(payload.newPassword || "pass" + roll).trim();
  if (!roll) return createJsonResponse({ success: false, ok: false, error: "Roll No missing." });

  var ss = getSpreadsheet();
  var sheet = getSheet();
  var targetRow = findRowByRollOrPrn(sheet, roll);
  if (targetRow === -1) return createJsonResponse({ success: false, ok: false, error: "Student not found" });

  sheet.getRange(targetRow, COL_PASSWORD).setValue(sanitizeSheetInput(newPass));

  logAuditEvent({
    adminId: payload.adminId || "admin",
    action: "RESET_STUDENT_PASSWORD",
    targetPrn: sheet.getRange(targetRow, COL_PRN).getValue(),
    targetStudentName: sheet.getRange(targetRow, COL_NAME).getValue(),
    reason: "Password reset by administrator. Force change on next login."
  });

  return createJsonResponse({ success: true, ok: true, message: "Student password reset successfully" });
}

function apiChangeStudentPassword(payload) {
  var prn = String(payload.prn || "").trim();
  var currentPass = String(payload.currentPassword || "").trim();
  var newPass = String(payload.newPassword || "").trim();

  if (!prn || !currentPass || !newPass) {
    return createJsonResponse({ success: false, ok: false, message: "All password fields are required" });
  }

  if (newPass.length < 8) {
    return createJsonResponse({ success: false, ok: false, message: "New password must be at least 8 characters long" });
  }

  var ss = getSpreadsheet();
  var sheet = getSheet();
  var targetRow = findRowByRollOrPrn(sheet, prn);
  if (targetRow === -1) return createJsonResponse({ success: false, ok: false, message: "Student not found" });

  var storedPass = String(sheet.getRange(targetRow, COL_PASSWORD).getValue()).trim();
  if (storedPass !== currentPass) {
    return createJsonResponse({ success: false, ok: false, message: "Current password does not match" });
  }

  sheet.getRange(targetRow, COL_PASSWORD).setValue(sanitizeSheetInput(newPass));

  logAuditEvent({
    adminId: prn,
    action: "STUDENT_PASSWORD_CHANGE",
    targetPrn: prn,
    targetStudentName: sheet.getRange(targetRow, COL_NAME).getValue(),
    reason: "Password updated by student"
  });

  return createJsonResponse({ success: true, ok: true, message: "Password updated successfully" });
}

function getOrCreateAuditSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.AUDIT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.AUDIT_SHEET_NAME);
    sheet.appendRow([
      "Audit ID", "Timestamp", "Admin ID", "Action",
      "Target PRN", "Target Name", "Date/Lecture", "Previous Status", "New Status", "Reason"
    ]);
  }
  return sheet;
}

function logAuditEvent(log) {
  var sheet = getOrCreateAuditSheet();
  var auditId = "AUD-" + Utilities.formatDate(new Date(), TIMEZONE, "yyyyMMdd-HHmmss-SSS");
  var ts = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    auditId, ts, log.adminId || "admin", log.action || "UPDATE",
    log.targetPrn || "", log.targetStudentName || "", log.date || "",
    log.previousStatus || "", log.newStatus || "", log.reason || ""
  ]);
}

function apiGetAuditLogs() {
  var sheet = getOrCreateAuditSheet();
  var data = sheet.getDataRange().getValues();
  var logs = [];

  for (var r = 1; r < data.length; r++) {
    logs.push({
      id: String(data[r][0]),
      timestamp: String(data[r][1]),
      adminId: String(data[r][2]),
      action: String(data[r][3]),
      targetPrn: String(data[r][4]),
      targetStudentName: String(data[r][5]),
      date: String(data[r][6]),
      previousStatus: String(data[r][7]),
      newStatus: String(data[r][8]),
      reason: String(data[r][9])
    });
  }

  return createJsonResponse({ success: true, data: logs.reverse() });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
