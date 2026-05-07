const STORAGE_KEY = "vhpl_state_v3";
const SESSION_KEY = "vhpl_session_v2";
const SETTINGS_KEY = "vhpl_settings_v2";
const USERS_KEY = "vhpl_users_v1";
const REPAIRS_KEY = "vhpl_repairs_v1";

const defaultLocations = [
  "Thilafushi",
  "Maxx Royal",
  "Hulhumale",
  "Maamigili",
  "Holiday",
  "Sun Island",
  "Fun Island"
];

const initialVehicles = [
  {
    id: "VH-001",
    name: "Dump Truck 01",
    type: "Dump Truck",
    location: "Maxx Royal",
    status: "Active",
    remarks: "Ready for allocation",
    updatedAt: new Date().toISOString()
  },
  {
    id: "VH-002",
    name: "Ashok Leyland Mixer 04",
    type: "Concrete Mixer",
    location: "Thilafushi",
    status: "Mechanical Issue",
    remarks: "Hydraulic seal replacement needed",
    updatedAt: new Date().toISOString()
  },
  {
    id: "VH-003",
    name: "SANY Mobile Pump",
    type: "Concrete Pump",
    location: "Hulhumale",
    status: "Breakdown",
    remarks: "PTO inspection pending",
    updatedAt: new Date().toISOString()
  }
];

const initialUsers = [
  {
    username: "admin",
    password: "admin123",
    role: "Admin",
    active: true,
    createdAt: new Date().toISOString()
  }
];

const defaultSettings = {
  displayName: "Operations Admin",
  defaultPanel: "dashboardPanel",
  refreshSeconds: 5,
  accentColor: "#f17400"
};

const state = loadState();
const settings = loadSettings();
let users = loadUsers();
let repairs = loadRepairs();
let refreshTimer = null;

const el = {
  authView: document.getElementById("authView"),
  appView: document.getElementById("appView"),
  loginForm: document.getElementById("loginForm"),
  logoutBtn: document.getElementById("logoutBtn"),
  sidebarNav: document.getElementById("sidebarNav"),
  panels: document.querySelectorAll(".panel"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  vehicleForm: document.getElementById("vehicleForm"),
  vehicleLocation: document.getElementById("vehicleLocation"),
  locationForm: document.getElementById("locationForm"),
  locationList: document.getElementById("locationList"),
  vehiclesTableBody: document.getElementById("vehiclesTableBody"),
  dashboard: document.getElementById("dashboard"),
  kpiGrid: document.getElementById("kpiGrid"),
  repairForm: document.getElementById("repairForm"),
  repairVehicleId: document.getElementById("repairVehicleId"),
  repairTableBody: document.getElementById("repairTableBody"),
  settingsForm: document.getElementById("settingsForm"),
  displayName: document.getElementById("displayName"),
  defaultPanel: document.getElementById("defaultPanel"),
  refreshSeconds: document.getElementById("refreshSeconds"),
  accentColor: document.getElementById("accentColor"),
  userForm: document.getElementById("userForm"),
  usersTableBody: document.getElementById("usersTableBody"),
  toast: document.getElementById("toast")
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { locations: [...defaultLocations], vehicles: [...initialVehicles] };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      locations: Array.isArray(parsed.locations) ? parsed.locations : [...defaultLocations],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [...initialVehicles]
    };
  } catch (error) {
    return { locations: [...defaultLocations], vehicles: [...initialVehicles] };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { ...defaultSettings };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      displayName: parsed.displayName || defaultSettings.displayName,
      defaultPanel: parsed.defaultPanel || defaultSettings.defaultPanel,
      refreshSeconds: Number(parsed.refreshSeconds) || defaultSettings.refreshSeconds,
      accentColor: parsed.accentColor || defaultSettings.accentColor
    };
  } catch (error) {
    return { ...defaultSettings };
  }
}

function persistSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return [...initialUsers];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      return [...initialUsers];
    }
    const hasAdmin = parsed.some((u) => u.username === "admin");
    if (!hasAdmin) {
      parsed.unshift({ ...initialUsers[0] });
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
    return parsed;
  } catch (error) {
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return [...initialUsers];
  }
}

function persistUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadRepairs() {
  const raw = localStorage.getItem(REPAIRS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function persistRepairs() {
  localStorage.setItem(REPAIRS_KEY, JSON.stringify(repairs));
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2200);
}

function safeText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusPillClass(status) {
  if (status === "Active") {
    return "pill-ok";
  }
  if (status === "Breakdown") {
    return "pill-danger";
  }
  return "pill-warn";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function computeDowntimeHours(startValue, endValue) {
  if (!startValue || !endValue) {
    return "Open";
  }
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return "-";
  }
  const diffMs = end.getTime() - start.getTime();
  return (diffMs / (1000 * 60 * 60)).toFixed(1);
}

function setAccentColor(hexColor) {
  document.documentElement.style.setProperty("--brand", hexColor);
}

function applySettingsToUi() {
  el.displayName.value = settings.displayName;
  el.defaultPanel.value = settings.defaultPanel;
  el.refreshSeconds.value = settings.refreshSeconds;
  el.accentColor.value = settings.accentColor;
  setAccentColor(settings.accentColor);
  scheduleAutoRefresh();
}

function renderLocationOptions() {
  const options = state.locations
    .map((loc) => `<option value="${safeText(loc)}">${safeText(loc)}</option>`)
    .join("");
  el.vehicleLocation.innerHTML = options;
}

function renderRepairVehicleOptions() {
  if (!el.repairVehicleId) {
    return;
  }
  const options = state.vehicles
    .map((vehicle) => `<option value="${safeText(vehicle.id)}">${safeText(vehicle.id)} - ${safeText(vehicle.name)}</option>`)
    .join("");
  el.repairVehicleId.innerHTML = options || "<option value=''>No vehicles available</option>";
}

function renderLocationList() {
  el.locationList.innerHTML = state.locations.map((loc) => `<li>${safeText(loc)}</li>`).join("");
}

function renderKpis() {
  const total = state.vehicles.length;
  const active = state.vehicles.filter((v) => v.status === "Active").length;
  const breakdown = state.vehicles.filter((v) => v.status === "Breakdown").length;
  const issue = state.vehicles.filter((v) => v.status === "Mechanical Issue").length;

  el.kpiGrid.innerHTML = `
    <article class="kpi"><p>Total Vehicles</p><h4>${total}</h4></article>
    <article class="kpi"><p>Active</p><h4>${active}</h4></article>
    <article class="kpi"><p>Breakdown</p><h4>${breakdown}</h4></article>
    <article class="kpi"><p>Mechanical Issue</p><h4>${issue}</h4></article>
  `;
}

function renderDashboard() {
  const cards = state.locations
    .map((location) => {
      const vehicles = state.vehicles.filter((v) => v.location === location);
      const activeCount = vehicles.filter((v) => v.status === "Active").length;
      const breakdownCount = vehicles.filter((v) => v.status === "Breakdown").length;
      const issueCount = vehicles.filter((v) => v.status === "Mechanical Issue").length;

      const list = vehicles.length
        ? vehicles
            .map(
              (v) => `
                <div class="vehicle-mini">
                  <div>
                    <div class="vehicle-mini-title">${safeText(v.id)} - ${safeText(v.name)}</div>
                    <div class="vehicle-mini-sub">${safeText(v.type)}</div>
                  </div>
                  <span class="pill ${statusPillClass(v.status)}">${safeText(v.status)}</span>
                </div>
              `
            )
            .join("")
        : '<div class="vehicle-mini"><div class="vehicle-mini-sub">No vehicles currently assigned.</div></div>';

      return `
        <article class="location-card">
          <div class="location-head">
            <h4 class="location-name">${safeText(location)}</h4>
            <span class="count-chip">${vehicles.length} Vehicles</span>
          </div>
          <div class="status-row">
            <span class="pill pill-ok">Active: ${activeCount}</span>
            <span class="pill pill-danger">Breakdown: ${breakdownCount}</span>
            <span class="pill pill-warn">Mechanical Issue: ${issueCount}</span>
          </div>
          ${list}
        </article>
      `;
    })
    .join("");

  el.dashboard.innerHTML = cards;
}

function renderVehiclesTable() {
  if (!state.vehicles.length) {
    el.vehiclesTableBody.innerHTML = '<tr><td colspan="6">No vehicles available.</td></tr>';
    return;
  }

  const locationOptions = state.locations
    .map((loc) => `<option value="${safeText(loc)}">${safeText(loc)}</option>`)
    .join("");

  el.vehiclesTableBody.innerHTML = state.vehicles
    .map(
      (vehicle) => `
        <tr>
          <td>${safeText(vehicle.id)}</td>
          <td>${safeText(vehicle.name)}</td>
          <td>${safeText(vehicle.type)}</td>
          <td><select class="inline-location" data-id="${safeText(vehicle.id)}">${locationOptions}</select></td>
          <td>
            <select class="inline-status" data-id="${safeText(vehicle.id)}">
              <option value="Active">Active</option>
              <option value="Breakdown">Breakdown</option>
              <option value="Mechanical Issue">Mechanical Issue</option>
            </select>
          </td>
          <td>${safeText(vehicle.remarks || "-")}</td>
        </tr>
      `
    )
    .join("");

  state.vehicles.forEach((vehicle) => {
    const loc = el.vehiclesTableBody.querySelector(`.inline-location[data-id="${CSS.escape(vehicle.id)}"]`);
    const stat = el.vehiclesTableBody.querySelector(`.inline-status[data-id="${CSS.escape(vehicle.id)}"]`);
    if (loc) {
      loc.value = vehicle.location;
    }
    if (stat) {
      stat.value = vehicle.status;
    }
  });
}

function renderRepairTable() {
  if (!repairs.length) {
    el.repairTableBody.innerHTML = '<tr><td colspan="7">No repair logs added.</td></tr>';
    return;
  }

  el.repairTableBody.innerHTML = repairs
    .map(
      (item) => `
        <tr>
          <td>${safeText(item.vehicleId)}</td>
          <td>${safeText(item.serviceType)}</td>
          <td>${formatDateTime(item.downtimeStart)}</td>
          <td>${formatDateTime(item.downtimeEnd)}</td>
          <td>${computeDowntimeHours(item.downtimeStart, item.downtimeEnd)}</td>
          <td>${safeText(item.repairStatus)}</td>
          <td>${safeText(item.repairNotes || "-")}</td>
        </tr>
      `
    )
    .join("");
}

function renderUsersTable() {
  const session = getSession();
  const activeUser = session?.userName;

  el.usersTableBody.innerHTML = users
    .map((user) => {
      const isActive = user.active ? "Active" : "Disabled";
      const disableToggle = user.username === activeUser ? "disabled" : "";
      const toggleLabel = user.active ? "Disable" : "Enable";
      return `
        <tr>
          <td>${safeText(user.username)}</td>
          <td>${safeText(user.role)}</td>
          <td>${safeText(isActive)}</td>
          <td>
            <button class="btn btn-muted user-action" type="button" data-action="toggle" data-user="${safeText(user.username)}" ${disableToggle}>${toggleLabel}</button>
            <button class="btn btn-muted user-action" type="button" data-action="reset" data-user="${safeText(user.username)}">Reset Password</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAll() {
  renderLocationOptions();
  renderRepairVehicleOptions();
  renderLocationList();
  renderKpis();
  renderDashboard();
  renderVehiclesTable();
  renderRepairTable();
  renderUsersTable();
}

function switchPanel(panelId) {
  el.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === panelId);
  });

  const navButtons = el.sidebarNav.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-panel") === panelId);
  });
}

function addVehicle(formData) {
  const id = String(formData.get("vehicleCode") || "").trim();
  const name = String(formData.get("vehicleName") || "").trim();
  const type = String(formData.get("vehicleType") || "").trim();
  const location = String(formData.get("vehicleLocation") || "").trim();
  const status = String(formData.get("vehicleStatus") || "").trim();
  const remarks = String(formData.get("vehicleRemarks") || "").trim();

  if (!id || !name || !type || !location || !status) {
    showToast("Fill all required vehicle fields.");
    return false;
  }

  const duplicate = state.vehicles.some((v) => v.id.toLowerCase() === id.toLowerCase());
  if (duplicate) {
    showToast("Vehicle code already exists.");
    return false;
  }

  state.vehicles.unshift({
    id,
    name,
    type,
    location,
    status,
    remarks,
    updatedAt: new Date().toISOString()
  });

  persistState();
  renderAll();
  showToast("Vehicle added.");
  return true;
}

function addLocation(formData) {
  const location = String(formData.get("newLocation") || "").trim();
  if (!location) {
    showToast("Enter a location name.");
    return false;
  }

  const exists = state.locations.some((loc) => loc.toLowerCase() === location.toLowerCase());
  if (exists) {
    showToast("Location already exists.");
    return false;
  }

  state.locations.push(location);
  persistState();
  renderAll();
  showToast("Location added.");
  return true;
}

function addRepair(formData) {
  const vehicleId = String(formData.get("repairVehicleId") || "").trim();
  const serviceType = String(formData.get("serviceType") || "").trim();
  const downtimeStart = String(formData.get("downtimeStart") || "").trim();
  const downtimeEnd = String(formData.get("downtimeEnd") || "").trim();
  const repairStatus = String(formData.get("repairStatus") || "").trim();
  const repairNotes = String(formData.get("repairNotes") || "").trim();

  if (!vehicleId || !serviceType || !downtimeStart || !repairStatus) {
    showToast("Fill required repair fields.");
    return false;
  }

  if (downtimeEnd) {
    const start = new Date(downtimeStart);
    const end = new Date(downtimeEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      showToast("Downtime end must be after start.");
      return false;
    }
  }

  repairs.unshift({
    id: `R-${Date.now()}`,
    vehicleId,
    serviceType,
    downtimeStart,
    downtimeEnd,
    repairStatus,
    repairNotes,
    createdAt: new Date().toISOString()
  });

  persistRepairs();
  renderRepairTable();
  showToast("Repair log added.");
  return true;
}

function updateVehicleLocation(vehicleId, nextLocation) {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    return;
  }
  vehicle.location = nextLocation;
  vehicle.updatedAt = new Date().toISOString();
  persistState();
  renderAll();
}

function updateVehicleStatus(vehicleId, nextStatus) {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    return;
  }
  vehicle.status = nextStatus;
  vehicle.updatedAt = new Date().toISOString();
  persistState();
  renderAll();
}

function addUser(formData) {
  const username = String(formData.get("newUsername") || "").trim();
  const password = String(formData.get("newPassword") || "").trim();
  const role = String(formData.get("userRole") || "Operator").trim();

  if (!username || !password) {
    showToast("Username and password are required.");
    return false;
  }

  const exists = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    showToast("Username already exists.");
    return false;
  }

  users.push({
    username,
    password,
    role,
    active: true,
    createdAt: new Date().toISOString()
  });
  persistUsers();
  renderUsersTable();
  showToast("User added.");
  return true;
}

function toggleUser(username) {
  const session = getSession();
  if (session?.userName === username) {
    showToast("You cannot disable the current user.");
    return;
  }

  const target = users.find((u) => u.username === username);
  if (!target) {
    return;
  }
  target.active = !target.active;
  persistUsers();
  renderUsersTable();
  showToast(`User ${target.active ? "enabled" : "disabled"}.`);
}

function resetUserPassword(username) {
  const target = users.find((u) => u.username === username);
  if (!target) {
    return;
  }
  const next = window.prompt(`Enter new password for ${username}`);
  if (!next) {
    return;
  }
  target.password = String(next).trim();
  persistUsers();
  showToast("Password reset completed.");
}

function exportExcel() {
  const vehicleRows = state.vehicles.map((v) => ({
    "Vehicle Code": v.id,
    "Vehicle Name": v.name,
    "Vehicle Type": v.type,
    "Location": v.location,
    "Status": v.status,
    "Remarks": v.remarks || "",
    "Last Updated": v.updatedAt
  }));

  const repairRows = repairs.map((r) => ({
    "Vehicle": r.vehicleId,
    "Service Type": r.serviceType,
    "Downtime Start": r.downtimeStart,
    "Downtime End": r.downtimeEnd || "",
    "Downtime Hours": computeDowntimeHours(r.downtimeStart, r.downtimeEnd),
    "Repair Status": r.repairStatus,
    "Repair Notes": r.repairNotes || ""
  }));

  if (typeof XLSX !== "undefined") {
    const wb = XLSX.utils.book_new();
    const vehiclesSheet = XLSX.utils.json_to_sheet(vehicleRows);
    XLSX.utils.book_append_sheet(wb, vehiclesSheet, "Vehicles");
    const repairsSheet = XLSX.utils.json_to_sheet(repairRows);
    XLSX.utils.book_append_sheet(wb, repairsSheet, "Repairs");
    XLSX.writeFile(wb, "VHPL_Vehicle_Data.xlsx");
    showToast("Excel export complete.");
    return;
  }

  showToast("Excel library unavailable.");
}

function scheduleAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  const seconds = Math.min(60, Math.max(3, Number(settings.refreshSeconds) || 5));
  refreshTimer = window.setInterval(() => {
    renderKpis();
    renderDashboard();
    renderRepairTable();
  }, seconds * 1000);
}

function setSession(userName, role) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userName, role, loggedInAt: new Date().toISOString() }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function showAuthView() {
  el.authView.hidden = false;
  el.appView.hidden = true;
}

function showAppView() {
  el.authView.hidden = true;
  el.appView.hidden = false;
}

function initializeAuth() {
  const existing = getSession();
  if (existing) {
    showAppView();
    switchPanel(settings.defaultPanel);
    renderAll();
    return;
  }
  showAuthView();
}

function attachEvents() {
  el.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const userName = String(new FormData(el.loginForm).get("loginUsername") || "").trim();
    const password = String(new FormData(el.loginForm).get("loginPassword") || "").trim();

    const matchedUser = users.find((u) => u.username === userName && u.password === password);
    if (!matchedUser) {
      showToast("Invalid credentials.");
      return;
    }
    if (!matchedUser.active) {
      showToast("This user is disabled.");
      return;
    }

    setSession(matchedUser.username, matchedUser.role);
    showAppView();
    switchPanel(settings.defaultPanel);
    renderAll();
    showToast("Login successful.");
    el.loginForm.reset();
  });

  el.logoutBtn.addEventListener("click", () => {
    clearSession();
    showAuthView();
    showToast("Logged out.");
  });

  el.sidebarNav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) {
      return;
    }
    switchPanel(button.getAttribute("data-panel"));
  });

  el.vehicleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ok = addVehicle(new FormData(el.vehicleForm));
    if (ok) {
      el.vehicleForm.reset();
      switchPanel("fleetPanel");
    }
  });

  el.locationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ok = addLocation(new FormData(el.locationForm));
    if (ok) {
      el.locationForm.reset();
    }
  });

  el.repairForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ok = addRepair(new FormData(el.repairForm));
    if (ok) {
      el.repairForm.reset();
      renderRepairVehicleOptions();
    }
  });

  el.vehiclesTableBody.addEventListener("change", (event) => {
    const locationSelect = event.target.closest(".inline-location");
    if (locationSelect) {
      updateVehicleLocation(locationSelect.getAttribute("data-id"), locationSelect.value);
      showToast("Vehicle location updated.");
      return;
    }

    const statusSelect = event.target.closest(".inline-status");
    if (statusSelect) {
      updateVehicleStatus(statusSelect.getAttribute("data-id"), statusSelect.value);
      showToast("Vehicle status updated.");
    }
  });

  el.exportExcelBtn.addEventListener("click", exportExcel);

  el.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(el.settingsForm);

    settings.displayName = String(data.get("displayName") || defaultSettings.displayName).trim();
    settings.defaultPanel = String(data.get("defaultPanel") || defaultSettings.defaultPanel);
    settings.refreshSeconds = Math.min(60, Math.max(3, Number(data.get("refreshSeconds") || defaultSettings.refreshSeconds)));
    settings.accentColor = String(data.get("accentColor") || defaultSettings.accentColor);

    persistSettings();
    applySettingsToUi();
    showToast("Settings saved.");
  });

  el.userForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const ok = addUser(new FormData(el.userForm));
    if (ok) {
      el.userForm.reset();
    }
  });

  el.usersTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".user-action");
    if (!button) {
      return;
    }
    const action = button.getAttribute("data-action");
    const username = button.getAttribute("data-user");

    if (action === "toggle") {
      toggleUser(username);
      return;
    }
    if (action === "reset") {
      resetUserPassword(username);
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const latest = JSON.parse(event.newValue);
        state.locations = Array.isArray(latest.locations) ? latest.locations : state.locations;
        state.vehicles = Array.isArray(latest.vehicles) ? latest.vehicles : state.vehicles;
        renderAll();
      } catch (error) {
        // Ignore malformed data.
      }
    }

    if (event.key === USERS_KEY && event.newValue) {
      users = loadUsers();
      renderUsersTable();
    }

    if (event.key === REPAIRS_KEY && event.newValue) {
      repairs = loadRepairs();
      renderRepairTable();
    }
  });
}

function boot() {
  applySettingsToUi();
  renderAll();
  attachEvents();
  initializeAuth();
}

boot();
