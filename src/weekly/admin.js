/*
  Requirement: Make the "Manage Weekly Breakdown" page interactive.

  Instructions:
  1. This file is already linked to `admin.html` via:
         <script src="admin.js" defer></script>

  2. In `admin.html`:
     - The form has id="week-form".
     - The submit button has id="add-week".
     - The <tbody> has id="weeks-tbody".
     - Columns rendered per row: Week Title | Start Date | Description | Actions.

  3. Implement the TODOs below.

  API base URL: ./api/index.php
  All requests and responses use JSON.
  Successful list response shape: { success: true, data: [ ...week objects ] }
  Each week object shape:
    {
      id:          number,   // integer primary key from the weeks table
      title:       string,
      start_date:  string,   // "YYYY-MM-DD"
      description: string,
      links:       string[]  // decoded array of URL strings
    }
*/

// --- Global Data Store ---
let weeks = [];

// --- Element Selections ---
// TODO: Select the week form by id 'week-form'.
let form = document.getElementById('week-form');

// TODO: Select the weeks table body by id 'weeks-tbody'.
let tableBody = document.getElementById('weeks-tbody');

// --- Functions ---

function createWeekRow(week) {
  // ... your implementation here ...

  let tr = document.createElement("tr");

  let td1 = document.createElement("td");
  td1.textContent = week.title;

  let td2 = document.createElement("td");
  td2.textContent = week.start_date;

  let td3 = document.createElement("td");
  td3.textContent = week.description;

  let td4 = document.createElement("td");

  let editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "edit-btn";
  editBtn.dataset.id = String(week.id); // مهم

  let deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn";
  deleteBtn.dataset.id = String(week.id); // مهم

  td4.appendChild(editBtn);
  td4.appendChild(deleteBtn);

  tr.appendChild(td1);
  tr.appendChild(td2);
  tr.appendChild(td3);
  tr.appendChild(td4);

  return tr;
}

function renderTable() {
  // ... your implementation here ...

  tableBody.innerHTML = "";

  weeks.forEach(week => {
    let row = createWeekRow(week);
    tableBody.appendChild(row);
  });
}

async function handleAddWeek(event) {
  // ... your implementation here ...

  event.preventDefault();

  let title = document.getElementById("week-title").value.trim();
  let start_date = document.getElementById("week-start-date").value;
  let description = document.getElementById("week-description").value.trim();
  let linksText = document.getElementById("week-links").value;

  let links = linksText
    .split("\n")
    .map(l => l.trim())
    .filter(l => l !== "");

  let button = document.getElementById("add-week");

  // update mode
  if (button.dataset.editId) {
    await handleUpdateWeek(Number(button.dataset.editId), {
      title,
      start_date,
      description,
      links
    });
    return;
  }

  // add mode
  let response = await fetch("./api/index.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, start_date, description, links })
  });

  let result = await response.json();

  if (result.success) {
    weeks.push({
      id: Number(result.id), // مهم
      title,
      start_date,
      description,
      links
    });

    renderTable();
    form.reset();
  }
}

async function handleUpdateWeek(id, fields) {
  // ... your implementation here ...

  let response = await fetch("./api/index.php", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: Number(id), // مهم
      title: fields.title,
      start_date: fields.start_date,
      description: fields.description,
      links: fields.links
    })
  });

  let result = await response.json();

  if (result.success) {

    weeks = weeks.map(w =>
      w.id === Number(id) ? { id: Number(id), ...fields } : w
    );

    renderTable();
    form.reset();

    let button = document.getElementById("add-week");
    button.textContent = "Add Week";
    delete button.dataset.editId;
  }
}

async function handleTableClick(event) {
  // ... your implementation here ...

  let target = event.target;

  // delete
  if (target.classList.contains("delete-btn")) {

    let id = Number(target.dataset.id);

    let response = await fetch(`./api/index.php?id=${id}`, {
      method: "DELETE"
    });

    let result = await response.json();

    if (result.success) {
      weeks = weeks.filter(w => w.id !== id);
      renderTable();
    }
  }

  // edit
  if (target.classList.contains("edit-btn")) {

    let id = Number(target.dataset.id);

    let week = weeks.find(w => w.id === id);
    if (!week) return;

    document.getElementById("week-title").value = week.title;
    document.getElementById("week-start-date").value = week.start_date;
    document.getElementById("week-description").value = week.description;
    document.getElementById("week-links").value = (week.links || []).join("\n");

    let button = document.getElementById("add-week");
    button.textContent = "Update Week";
    button.dataset.editId = String(id);
  }
}

async function loadAndInitialize() {
  // ... your implementation here ...

  let response = await fetch("./api/index.php");
  let result = await response.json();

  if (result.success && Array.isArray(result.data)) {
    weeks = result.data.map(w => ({
      ...w,
      id: Number(w.id),
      links: Array.isArray(w.links) ? w.links : []
    }));

    renderTable();
  }

  form.addEventListener("submit", handleAddWeek);
  tableBody.addEventListener("click", handleTableClick);
}

// --- Initial Page Load ---
loadAndInitialize();