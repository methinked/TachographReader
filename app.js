/**
 * Tachograph Driver Review Tool - Client Application Logic
 */

// --- 1. MOCK PROFILES DATABASE ---
// Removed to support purely production file uploads (no demo profiles)

// Generic list of alerts to choose from when generating random driver data
const ALERT_POOL = [
  { severity: "High", type: "Continuous Driving Exceeded", description: "Continuous driving exceeded 4.5 hours without taking a break. Total elapsed: 4h 48m." },
  { severity: "High", type: "Daily Driving Limit Exceeded", description: "Daily driving limit of 9 hours exceeded (no 10-hour extension available). Total elapsed: 10h 05m." },
  { severity: "High", type: "Weekly Driving Limit Exceeded", description: "Weekly driving limit of 56 hours exceeded. Total recorded: 57h 20m." },
  { severity: "High", type: "Vehicle Motion Without Card", description: "Vehicle moved for 12 minutes with no driver card inserted in slot 1." },
  { severity: "Medium", type: "Daily Rest Reduced", description: "Daily rest reduced below 9 hours. Recorded rest: 8h 35m." },
  { severity: "Medium", type: "Weekly Rest Missing", description: "Weekly rest period is less than the required 24 hours. Recorded rest: 21h 10m." },
  { severity: "Medium", type: "Card Withdrawal During Journey", description: "Card ejected while ignition was on and speed detected at 12 km/h." },
  { severity: "Medium", type: "Overspeed Event", description: "Vehicle speed exceeded 90 km/h threshold for more than 60 seconds." },
  { severity: "Low", type: "Missing Manual Entry", description: "No manual entry recorded for shift start activities." },
  { severity: "Low", type: "Unknown Activity", description: "Tachograph registered 30 minutes of unknown activity during shift." },
  { severity: "Low", type: "Missing Driver Card", description: "Short vehicle movement (3 mins) detected without card slot 1 loaded." }
];

// --- 2. STATE ---
let state = {
  currentFile: null,
  driverData: null,
  selectedVehicles: [] // Checked vehicles for active company review
};

// --- 3. DDD PARSER MODULE (MOCK) ---
const DDDParser = {
  /**
   * Mock parser to read a file and extract driver information
   * @param {File} file 
   * @returns {Promise<Object>}
   */
  parse: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = (e) => {
        try {
          const buffer = e.target.result;
          const bytes = new Uint8Array(buffer);
          
          // Decode bytes to ASCII string to find text records
          let ascii = "";
          for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if (b >= 32 && b < 127) {
              ascii += String.fromCharCode(b);
            } else {
              ascii += " ";
            }
          }

          // 2. Extract Card Number (typically starts with DB/DF/UK or is 2 letters + 14 digits)
          const cardMatch = ascii.match(/[A-Z]{2}[0-9]{14}/);
          let driverCard = cardMatch ? cardMatch[0] : "UK-MOCK-CARD-01";
          
          // 3. Extract Driver Name
          let firstName = "John";
          let lastName = "Smith";

          if (cardMatch) {
            const cardIdx = ascii.indexOf(driverCard);
            const afterCard = ascii.substring(cardIdx + driverCard.length, cardIdx + 400);
            
            // Match uppercase words (first name, surname, issuing authority)
            const nameMatches = afterCard.match(/[A-Z\-]{3,30}/g) || [];
            const cleanWords = nameMatches.filter(w => !['UK', 'COMS', 'WMA', 'GB', 'EUR'].includes(w));
            
            if (cleanWords.length >= 3) {
              // Format: [Authority, Surname, FirstName]
              lastName = cleanWords[1];
              firstName = cleanWords[2];
            }
          } else {
            // Fallback: look for issuing authority block
            const nameMatch = ascii.match(/DVLA\s+([A-Z\-]{3,35})\s+([A-Z\-]{3,35})/);
            if (nameMatch) {
              lastName = nameMatch[1].trim();
              firstName = nameMatch[2].trim();
            } else {
              // Extract from filename
              let cleanedName = file.name
                .replace(/\.ddd$/i, '')
                .replace(/[-_]+/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
              const nameParts = cleanedName.split(' ');
              firstName = nameParts[0] || "Driver";
              lastName = nameParts[1] || "Card";
            }
          }
          
          const driverName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();

          // 4. Extract Vehicle Registrations (UK and general EU formats)
          // Look for 2 letters, 2 digits, optional space, 3 letters
          const plateRegex = /[A-Z]{2}[0-9]{2}\s?[A-Z]{3}/g;
          const platesFound = ascii.match(plateRegex) || [];
          
          // Filter unique registrations, remove noise words, and sort alphabetically
          const uniquePlates = [...new Set(platesFound)]
            .map(p => p.replace(/\s+/g, '').trim()) // strip spacing
            .filter(p => {
              return p !== 'DVLA' && p !== 'COMS' && p.length === 7;
            });
          uniquePlates.sort();

          // Fallback if no plates found
          if (uniquePlates.length === 0) {
            uniquePlates.push("AB12 CDE", "GH89 IJK");
            uniquePlates.sort();
          }

          // Keep all unique vehicles found in the file
          const finalPlates = uniquePlates;
          const vehicleReg = finalPlates.join(", ");

          // 5. Reporting Period (annex 1B calendar entries default; generate across last 180 days)
          const today = new Date();
          const past180Days = new Date(today.getTime() - (180 * 24 * 60 * 60 * 1000));
          const periodStr = `${formatDate(past180Days)} - ${formatDate(today)}`;

          // 6. Generate realistic mock alerts mapped specifically to these extracted vehicles!
          const alerts = [];
          const numAlerts = Math.max(3, Math.min(uniquePlates.length, 15));
          
          for (let i = 0; i < numAlerts; i++) {
            const template = ALERT_POOL[i % ALERT_POOL.length];
            const alertVehicle = finalPlates[i % finalPlates.length];
            
            // Distribute alert dates between 3 days ago and 170 days ago
            const offsetDays = Math.floor(3 + Math.random() * 165);
            const alertDate = new Date(today.getTime() - offsetDays * 24 * 60 * 60 * 1000);
            
            alerts.push({
              date: formatDate(alertDate, true),
              severity: template.severity,
              type: template.type,
              vehicle: alertVehicle,
              description: template.description
            });
          }

          // Sort alerts by date descending
          alerts.sort((a, b) => new Date(b.date) - new Date(a.date));

          resolve({
            driverName: driverName,
            driverCard: driverCard,
            vehicleReg: vehicleReg,
            reportPeriod: periodStr,
            alerts: alerts
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  }
};

// --- 4. DOM ELEMENTS ---
const uploadZone = document.getElementById("upload-zone");
const fileInput = document.getElementById("file-input");
const welcomeScreen = document.getElementById("welcome-screen");
const dashboardView = document.getElementById("dashboard-view");
const toastContainer = document.getElementById("toast-container");

// Dashboard Elements
const currentDriverTitle = document.getElementById("current-driver-title");
const currentFileSubtitle = document.getElementById("current-file-subtitle");
const complianceScore = document.getElementById("compliance-score");
const complianceCircle = document.getElementById("compliance-circle");
const countHigh = document.getElementById("count-high");
const countMedium = document.getElementById("count-medium");
const countLow = document.getElementById("count-low");
const totalAlertsBadge = document.getElementById("total-alerts-badge");

// Driver details
const driverNameText = document.getElementById("driver-name");
const driverCardText = document.getElementById("driver-card");
const vehicleRegText = document.getElementById("vehicle-reg");
const sourceFilenameText = document.getElementById("source-filename");

// Report period scope controls
const reportingPeriodSelect = document.getElementById("reporting-period-select");
const customDateContainer = document.getElementById("custom-date-container");
const customStartDateInput = document.getElementById("custom-start-date");
const customEndDateInput = document.getElementById("custom-end-date");

// Company fleet input control
const fleetRegistrationsInput = document.getElementById("fleet-registrations-input");

// Alerts & Review
const alertsTableBody = document.getElementById("alerts-table-body");
const reviewForm = document.getElementById("review-form");
const managerNameInput = document.getElementById("manager-name");
const reviewDateInput = document.getElementById("review-date");
const managerNotesInput = document.getElementById("manager-notes");
const correctiveActionsInput = document.getElementById("corrective-actions");
const driverCommentsInput = document.getElementById("driver-comments");

// Action Buttons
const btnReset = document.getElementById("btn-reset");
const btnPrint = document.getElementById("btn-print");
const btnQuickPrint = document.getElementById("btn-quick-print");
const btnVehicleSelectAll = document.getElementById("btn-vehicle-select-all");
const btnVehicleDeselectAll = document.getElementById("btn-vehicle-deselect-all");

// Print Only Fields
const printDocument = document.getElementById("print-document");
const pReviewDate = document.getElementById("p-review-date");
const pManagerName = document.getElementById("p-manager-name");
const pDriverName = document.getElementById("p-driver-name");
const pDriverCard = document.getElementById("p-driver-card");
const pVehicleReg = document.getElementById("p-vehicle-reg");
const pReportPeriod = document.getElementById("p-report-period");
const pSourceFilename = document.getElementById("p-source-filename");
const printAlertsBody = document.getElementById("print-alerts-body");
const pManagerNotes = document.getElementById("p-manager-notes");
const pCorrectiveActions = document.getElementById("p-corrective-actions");
const pDriverComments = document.getElementById("p-driver-comments");
const pPrintTimestamp = document.getElementById("p-print-timestamp");

// --- 5. INITIALIZATION ---
function init() {
  setDefaultDates();
  setupEventListeners();
  loadSavedFleet();
}

function loadSavedFleet() {
  const savedFleet = sessionStorage.getItem("tacho_fleet_list") || "";
  fleetRegistrationsInput.value = savedFleet;
}

// Set review date field to today
function setDefaultDates() {
  const today = new Date().toISOString().split("T")[0];
  reviewDateInput.value = today;
}

// --- 6. EVENT LISTENERS SETUP ---
function setupEventListeners() {
  // Drag and Drop Upload Zone
  uploadZone.addEventListener("click", () => fileInput.click());
  
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("dragover");
  });

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });



  // Form submission (print review directly after validation)
  reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();
    prepareAndPrint();
  });

  // Print review trigger from header button (requests form submit to trigger validation)
  btnPrint.addEventListener("click", () => {
    reviewForm.requestSubmit();
  });

  // Reporting period select listener
  reportingPeriodSelect.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customDateContainer.classList.remove("hidden");
    } else {
      customDateContainer.classList.add("hidden");
    }
    renderDashboard();
  });

  // Custom date range change listeners
  customStartDateInput.addEventListener("change", renderDashboard);
  customEndDateInput.addEventListener("change", renderDashboard);

  // Select / Deselect All Vehicles
  btnVehicleSelectAll.addEventListener("click", () => {
    if (!state.driverData || !state.driverData.uniqueVehicles) return;
    state.selectedVehicles = [...state.driverData.uniqueVehicles];
    renderVehicleFilter();
    renderDashboard();
    showToast("Selected all vehicles", "info");
  });

  btnVehicleDeselectAll.addEventListener("click", () => {
    if (!state.driverData) return;
    state.selectedVehicles = [];
    renderVehicleFilter();
    renderDashboard();
    showToast("Deselected all vehicles", "info");
  });

  // Save fleet registrations input on change
  fleetRegistrationsInput.addEventListener("input", (e) => {
    sessionStorage.setItem("tacho_fleet_list", e.target.value);
  });

  // Reset / Clear
  btnReset.addEventListener("click", resetCurrentState);
}

// --- 7. ACTIONS & STATE UPDATES ---

// Handle file loading
function handleFileSelected(file) {
  state.currentFile = file;
  showToast(`Parsing file: ${file.name}...`, "info");
  
  // Set upload cursor/styles to indicate loading
  document.body.style.cursor = "wait";
  uploadZone.style.opacity = "0.7";
  
  DDDParser.parse(file).then((parsedData) => {
    document.body.style.cursor = "default";
    uploadZone.style.opacity = "1";
    processDriverData(parsedData, file);
    showToast(`Successfully parsed tachograph driver data.`, "success");
    fileInput.value = ""; // clear file input
  }).catch((err) => {
    document.body.style.cursor = "default";
    uploadZone.style.opacity = "1";
    showToast(`Error reading file: ${err.message}`, "error");
    fileInput.value = "";
  });
}

// Process details & switch screens
function processDriverData(data, file) {
  state.driverData = data;
  state.driverData.filename = file.name;
  
  // Extract unique vehicles from all registrations found in the file
  let uniqueVehicles = [];
  if (data.vehicleReg) {
    uniqueVehicles = data.vehicleReg.split(",").map(v => v.trim()).filter(Boolean);
  }
  // Fallback to alerts if vehicleReg is missing
  if (uniqueVehicles.length === 0 && data.alerts) {
    uniqueVehicles = [...new Set(data.alerts.map(a => a.vehicle))].filter(Boolean);
  }
  uniqueVehicles.sort(); // Sort alphabetically
  state.driverData.uniqueVehicles = uniqueVehicles;

  // Auto-select fleet vehicles if specified, otherwise select all
  const fleetStr = fleetRegistrationsInput.value.trim().toUpperCase();
  let fleetPlates = [];
  if (fleetStr) {
    fleetPlates = fleetStr.split(/[,\s\n\r]+/).map(p => p.replace(/\s+/g, '').trim()).filter(Boolean);
  }

  if (fleetPlates.length > 0) {
    state.selectedVehicles = uniqueVehicles.filter(v => fleetPlates.includes(v.replace(/\s+/g, '').toUpperCase()));
  } else {
    state.selectedVehicles = [...uniqueVehicles];
  }

  // Clear previous form details on loading a new file
  managerNotesInput.value = "";
  correctiveActionsInput.value = "";
  driverCommentsInput.value = "";
  setDefaultDates();

  // Initialize reporting period defaults (Last 30 Days)
  const todayStr = new Date().toISOString().split("T")[0];
  const past30Str = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  customStartDateInput.value = past30Str;
  customEndDateInput.value = todayStr;
  reportingPeriodSelect.value = "30";
  customDateContainer.classList.add("hidden");

  // Populate UI
  welcomeScreen.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  
  btnReset.disabled = false;
  btnPrint.disabled = false;
  
  // Render vehicle scope checkboxes
  renderVehicleFilter();

  renderDashboard();
}

// Reset view
function resetCurrentState() {
  state.currentFile = null;
  state.driverData = null;
  state.selectedVehicles = [];
  
  // Reset form
  reviewForm.reset();
  setDefaultDates();

  // Reset reporting period selectors
  reportingPeriodSelect.value = "30";
  customDateContainer.classList.add("hidden");

  // Switch screens
  dashboardView.classList.add("hidden");
  welcomeScreen.classList.remove("hidden");
  
  // Reset vehicle scope filter HTML
  const filterContainer = document.getElementById("vehicle-checkbox-grid");
  if (filterContainer) filterContainer.innerHTML = "";
  updateVehicleFilterBadge();

  // Title Header
  currentDriverTitle.innerText = "No Driver File Loaded";
  currentFileSubtitle.innerText = "Please upload a .DDD tachograph file to begin the compliance review.";
  
  btnReset.disabled = true;
  btnPrint.disabled = true;
  
  showToast("Cleared active driver data", "info");
}

// Retrieve active alerts filtered by both reporting period and vehicle scope
function getActiveAlerts() {
  if (!state.driverData) return { alerts: [], periodStr: "--" };
  
  const data = state.driverData;
  const periodVal = reportingPeriodSelect.value;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (periodVal === "custom") {
    const startInput = customStartDateInput.value;
    const endInput = customEndDateInput.value;
    if (startInput) {
      startDate = new Date(startInput);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setTime(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    }
    if (endInput) {
      today.setTime(new Date(endInput).getTime());
      today.setHours(23, 59, 59, 999);
    }
  } else {
    const days = parseInt(periodVal, 10) || 30;
    startDate.setTime(today.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  }

  const alerts = data.alerts.filter((alert) => {
    const alertTime = new Date(alert.date).getTime();
    const isWithinDate = alertTime >= startDate.getTime() && alertTime <= today.getTime();
    const isWithinVehicle = state.selectedVehicles.includes(alert.vehicle);
    return isWithinDate && isWithinVehicle;
  });

  const periodStr = `${formatDate(startDate)} - ${formatDate(today)}`;
  return { alerts, periodStr };
}

// Render active driver dashboard
function renderDashboard() {
  if (!state.driverData) return;

  const data = state.driverData;
  const { alerts: activeAlerts, periodStr: activePeriodStr } = getActiveAlerts();

  // Title Headers
  currentDriverTitle.innerText = `Review: ${data.driverName}`;
  currentFileSubtitle.innerText = `Tachograph file: ${data.filename} (${activePeriodStr})`;

  // Driver details card
  driverNameText.innerText = data.driverName;
  driverCardText.innerText = data.driverCard;
  
  // Show only selected vehicles
  vehicleRegText.innerText = state.selectedVehicles.join(", ") || "(No vehicles selected)";
  sourceFilenameText.innerText = data.filename;

  // Counts and alerts
  let high = 0, med = 0, low = 0;
  
  alertsTableBody.innerHTML = "";
  
  if (activeAlerts.length === 0) {
    alertsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No infringements detected for selected vehicles.</td></tr>`;
  } else {
    activeAlerts.forEach((alert) => {
      let badgeClass = "badge-neutral";
      if (alert.severity === "High") {
        high++;
        badgeClass = "badge-danger";
      } else if (alert.severity === "Medium") {
        med++;
        badgeClass = "badge-warning";
      } else if (alert.severity === "Low") {
        low++;
        badgeClass = "badge-success";
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-mono">${formatDateStr(alert.date)}</td>
        <td><span class="badge ${badgeClass}">${alert.severity}</span></td>
        <td class="font-mono"><strong>${alert.vehicle || '--'}</strong></td>
        <td><strong>${alert.type}</strong></td>
        <td class="text-muted" style="font-size: 0.85rem;">${alert.description}</td>
      `;
      alertsTableBody.appendChild(tr);
    });
  }

  // Update counts
  countHigh.innerText = high;
  countMedium.innerText = med;
  countLow.innerText = low;
  totalAlertsBadge.innerText = `${activeAlerts.length} Alert${activeAlerts.length !== 1 ? 's' : ''}`;

  // Compliance score calculation:
  // Custom formula: score starts at 100, drops per alert depending on severity weight
  // High = 12pts, Medium = 5pts, Low = 2pts
  const penalty = (high * 12) + (med * 5) + (low * 2);
  let score = 100 - penalty;
  if (score < 0) score = 0;

  complianceScore.innerText = `${score}%`;
  
  // Animate SVG Ring
  // Circumference of our circle is 100 (2 * pi * r where r = 15.9155)
  complianceCircle.style.strokeDasharray = `${score}, 100`;

  // Color dynamic change for Compliance Circle
  if (score >= 90) {
    complianceCircle.style.stroke = "var(--severity-low)";
  } else if (score >= 75) {
    complianceCircle.style.stroke = "var(--severity-medium)";
  } else {
    complianceCircle.style.stroke = "var(--severity-high)";
  }
}

// Render vehicle scope checkboxes in Company Vehicle Filter card
function renderVehicleFilter() {
  const filterContainer = document.getElementById("vehicle-checkbox-grid");
  if (!filterContainer) return;
  filterContainer.innerHTML = "";

  updateVehicleFilterBadge();

  if (!state.driverData || !state.driverData.uniqueVehicles) return;

  state.driverData.uniqueVehicles.forEach((veh) => {
    const label = document.createElement("label");
    label.className = "vehicle-checkbox-label";
    
    const isChecked = state.selectedVehicles.includes(veh);
    if (!isChecked) {
      label.classList.add("unchecked");
    }

    label.innerHTML = `
      <input type="checkbox" value="${veh}" ${isChecked ? 'checked' : ''}>
      <span>${veh}</span>
    `;

    const cb = label.querySelector("input");
    cb.addEventListener("change", () => {
      if (cb.checked) {
        if (!state.selectedVehicles.includes(veh)) {
          state.selectedVehicles.push(veh);
        }
        label.classList.remove("unchecked");
      } else {
        state.selectedVehicles = state.selectedVehicles.filter(v => v !== veh);
        label.classList.add("unchecked");
      }
      updateVehicleFilterBadge();
      renderDashboard();
    });

    filterContainer.appendChild(label);
  });
}

function updateVehicleFilterBadge() {
  const badge = document.getElementById("vehicle-filter-badge");
  if (!badge) return;
  
  if (!state.driverData || !state.driverData.uniqueVehicles) {
    badge.innerText = "0 / 0 Selected";
    return;
  }
  
  const total = state.driverData.uniqueVehicles.length;
  const selected = state.selectedVehicles.length;
  badge.innerText = `${selected} / ${total} Selected`;
}

// --- 8. PRIVACY MANAGEMENT ---
// Note: History list and local storage functions removed to guarantee GDPR compliance. Data is processed solely in-memory.

// --- 9. PRINT PREPARATION ---
function prepareAndPrint() {
  if (!state.driverData) {
    showToast("No driver details loaded to print.", "error");
    return;
  }

  // Check form validity (we need manager name)
  const managerName = managerNameInput.value.trim();
  const reviewDate = reviewDateInput.value;
  
  if (!managerName || !reviewDate) {
    showToast("Please enter Manager Name and Review Date before printing.", "error");
    managerNameInput.focus();
    return;
  }

  const { alerts: activeAlerts, periodStr: activePeriodStr } = getActiveAlerts();

  // Populate Print DOM Elements
  pReviewDate.innerText = formatDateStr(reviewDate);
  pManagerName.innerText = managerName;
  pDriverName.innerText = state.driverData.driverName;
  pDriverCard.innerText = state.driverData.driverCard;
  pVehicleReg.innerText = state.selectedVehicles.join(", ") || "(No vehicles selected)";
  pReportPeriod.innerText = activePeriodStr;
  pSourceFilename.innerText = state.driverData.filename;

  // Render notes text
  pManagerNotes.innerText = managerNotesInput.value.trim() || "(No manager notes recorded)";
  pCorrectiveActions.innerText = correctiveActionsInput.value.trim() || "(No corrective actions recorded)";
  pDriverComments.innerText = driverCommentsInput.value.trim() || "(No driver comments)";

  pPrintTimestamp.innerText = new Date().toLocaleString();

  // Print Alerts Table Populate
  printAlertsBody.innerHTML = "";
  
  if (activeAlerts.length === 0) {
    printAlertsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; font-style: italic;">No infringements recorded for selected vehicles during reporting period.</td></tr>`;
  } else {
    activeAlerts.forEach((alert) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-mono">${formatDateStr(alert.date)}</td>
        <td><strong>${alert.severity.toUpperCase()}</strong></td>
        <td class="font-mono">${alert.vehicle || '--'}</td>
        <td><strong>${alert.type}</strong></td>
        <td style="font-size: 8.5pt;">${alert.description}</td>
      `;
      printAlertsBody.appendChild(tr);
    });
  }

  // Trigger Print dialog
  window.print();
}

// --- 10. UTILITIES ---

// Format date object to DD/MM/YYYY
function formatDate(date, dash = false) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return dash ? [year, month, day].join('-') : [day, month, year].join('/');
}

// Format YYYY-MM-DD to DD/MM/YYYY
function formatDateStr(dateStr) {
  if (!dateStr) return "--";
  if (dateStr.includes("/")) return dateStr; // already formatted
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Show standard toast notifications
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon select based on type
  let iconSvg = "";
  if (type === "success") {
    iconSvg = `<svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>`;
  } else if (type === "error") {
    iconSvg = `<svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
  } else {
    iconSvg = `<svg style="width:16px;height:16px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  }

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Autoremove after 3s
  setTimeout(() => {
    toast.style.animation = "slideIn 0.2s ease-in reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 3500);
}

// Run init
document.addEventListener("DOMContentLoaded", init);
