/*
  Requirement: Make the "Manage Assignments" page interactive.

  Instructions:
  1. This file is already linked to `admin.html` via:
         <script src="admin.js" defer></script>

  2. In `admin.html`:
     - The form has id="assignment-form".
     - The submit button has id="add-assignment".
     - The <tbody> has id="assignments-tbody".
     - Columns rendered per row:
       Title | Due Date | Description | Actions.

  3. Implement the TODOs below.

  API base URL: ./api/index.php
  All requests and responses use JSON.
  Successful list response shape: { success: true, data: [ ...assignment objects ] }
  Each assignment object shape:
    {
      id:          number,   // integer primary key from the assignments table
      title:       string,
      due_date:    string,   // "YYYY-MM-DD" — matches the SQL column name
      description: string,
      files:       string[]  // decoded array of URL strings
    }
*/

// --- Global Data Store ---
// Holds the assignments currently displayed in the table.
let assignments = [];

// --- Element Selections ---
// TODO: Select the assignment form by id 'assignment-form'.
let form = document.getElementById("assignment-form");

// TODO: Select the assignments table body by id 'assignments-tbody'.
let tableBody = document.getElementById("assignments-tbody");

// --- Functions ---

function createAssignmentRow(assignment) {
  let tr = document.createElement("tr");

  let td1 = document.createElement("td");
  td1.textContent = assignment.title;

  let td2 = document.createElement("td");
  td2.textContent = assignment.due_date;

  let td3 = document.createElement("td");
  td3.textContent = assignment.description;

  let td4 = document.createElement("td");

  let editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "edit-btn";
  editBtn.dataset.id = assignment.id;

  let deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn";
  deleteBtn.dataset.id = assignment.id;

  td4.appendChild(editBtn);
  td4.appendChild(deleteBtn);

  tr.appendChild(td1);
  tr.appendChild(td2);
  tr.appendChild(td3);
  tr.appendChild(td4);

  return tr;
}

function renderTable() {
  tableBody.innerHTML = "";

  for (let i = 0; i < assignments.length; i++) {
    let row = createAssignmentRow(assignments[i]);
    tableBody.appendChild(row);
  }
}

async function handleAddAssignment(event) {
  event.preventDefault();

  let title = document.getElementById("assignment-title").value;
  let due_date = document.getElementById("assignment-due-date").value;
  let description = document.getElementById("assignment-description").value;
  let filesText = document.getElementById("assignment-files").value;

  let files = filesText.split("\n").filter(f => f.trim() !== "");

  let button = document.getElementById("add-assignment");

  if (button.dataset.editId) {
    await handleUpdateAssignment(button.dataset.editId, {
      title,
      due_date,
      description,
      files
    });
    return;
  }

  let response = await fetch("./api/index.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, due_date, description, files })
  });

  let result = await response.json();

  if (result.success) {
    assignments.push({
      id: result.id,
      title,
      due_date,
      description,
      files
    });

    renderTable();
    form.reset();
  }
}

async function handleUpdateAssignment(id, fields) {
  let response = await fetch("./api/index.php", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: id,
      title: fields.title,
      due_date: fields.due_date,
      description: fields.description,
      files: fields.files
    })
  });

  let result = await response.json();

  if (result.success) {

    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i].id == id) {
        assignments[i] = { id, ...fields };
      }
    }

    renderTable();
    form.reset();

    let button = document.getElementById("add-assignment");
    button.textContent = "Add Assignment";
    delete button.dataset.editId;
  }
}

async function handleTableClick(event) {
  let target = event.target;

  if (target.classList.contains("delete-btn")) {

    let id = target.dataset.id;

    let response = await fetch(`./api/index.php?id=${id}`, {
      method: "DELETE"
    });

    let result = await response.json();

    if (result.success) {
      assignments = assignments.filter(a => a.id != id);
      renderTable();
    }
  }

  if (target.classList.contains("edit-btn")) {

    let id = target.dataset.id;

    let assignment = assignments.find(a => a.id == id);

    document.getElementById("assignment-title").value = assignment.title;
    document.getElementById("assignment-due-date").value = assignment.due_date;
    document.getElementById("assignment-description").value = assignment.description;
    document.getElementById("assignment-files").value = assignment.files.join("\n");

    let button = document.getElementById("add-assignment");
    button.textContent = "Update Assignment";
    button.dataset.editId = id;
  }
}

async function loadAndInitialize() {
  let response = await fetch("./api/index.php");
  let result = await response.json();

  if (result.success) {
    assignments = result.data;
    renderTable();
  }

  form.addEventListener("submit", handleAddAssignment);
  tableBody.addEventListener("click", handleTableClick);
}

// --- Initial Page Load ---
loadAndInitialize();