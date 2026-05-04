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
      id:          number,
      title:       string,
      due_date:    string,
      description: string,
      files:       string[]
    }
*/

// --- Global Data Store ---
let assignments = [];

// --- Element Selections ---
// TODO: Select the assignment form by id 'assignment-form'.
const form = document.getElementById("assignment-form");

// TODO: Select the assignments table body by id 'assignments-tbody'.
const tableBody = document.getElementById("assignments-tbody");

// --- Functions ---

/**
 * TODO: Implement createAssignmentRow.
 */
function createAssignmentRow(assignment) {
  // ... your implementation here ...

  const tr = document.createElement("tr");

  const td1 = document.createElement("td");
  td1.textContent = assignment.title;

  const td2 = document.createElement("td");
  td2.textContent = assignment.due_date;

  const td3 = document.createElement("td");
  td3.textContent = assignment.description;

  const td4 = document.createElement("td");

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.className = "edit-btn";
  editBtn.dataset.id = assignment.id;

  const deleteBtn = document.createElement("button");
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

/**
 * TODO: Implement renderTable.
 */
function renderTable() {
  // ... your implementation here ...

  tableBody.innerHTML = "";

  assignments.forEach(assignment => {
    const row = createAssignmentRow(assignment);
    tableBody.appendChild(row);
  });
}

/**
 * TODO: Implement handleAddAssignment (async).
 */
async function handleAddAssignment(event) {
  // ... your implementation here ...

  event.preventDefault();

  const title = document.getElementById("assignment-title").value;
  const due_date = document.getElementById("assignment-due-date").value;
  const description = document.getElementById("assignment-description").value;
  const filesText = document.getElementById("assignment-files").value;

  const files = filesText.split("\n").filter(f => f.trim() !== "");

  const button = document.getElementById("add-assignment");

  const editId = button.dataset.editId;

  if (editId) {
    await handleUpdateAssignment(Number(editId), {
      title,
      due_date,
      description,
      files
    });
    return;
  }

  const response = await fetch("./api/index.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, due_date, description, files })
  });

  const result = await response.json();

  if (result.success) {
    assignments.push({
      id: Number(result.id),
      title,
      due_date,
      description,
      files
    });

    renderTable();
    form.reset();
  }
}

/**
 * TODO: Implement handleUpdateAssignment (async).
 */
async function handleUpdateAssignment(id, fields) {
  // ... your implementation here ...

  const response = await fetch("./api/index.php", {
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

  const result = await response.json();

  if (result.success) {

    assignments = assignments.map(a =>
      a.id === id ? { id, ...fields } : a
    );

    renderTable();
    form.reset();

    const button = document.getElementById("add-assignment");
    button.textContent = "Add Assignment";
    delete button.dataset.editId;
  }
}

/**
 * TODO: Implement handleTableClick (async).
 */
async function handleTableClick(event) {
  // ... your implementation here ...

  const target = event.target;

  if (target.classList.contains("delete-btn")) {

    const id = Number(target.dataset.id);

    const response = await fetch(`./api/index.php?id=${id}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (result.success) {
      assignments = assignments.filter(a => a.id !== id);
      renderTable();
    }
  }

  if (target.classList.contains("edit-btn")) {

    const id = Number(target.dataset.id);

    const assignment = assignments.find(a => a.id === id);

    document.getElementById("assignment-title").value = assignment.title;
    document.getElementById("assignment-due-date").value = assignment.due_date;
    document.getElementById("assignment-description").value = assignment.description;
    document.getElementById("assignment-files").value = assignment.files.join("\n");

    const button = document.getElementById("add-assignment");
    button.textContent = "Update Assignment";
    button.dataset.editId = id;
  }
}

/**
 * TODO: Implement loadAndInitialize (async).
 */
async function loadAndInitialize() {
  // ... your implementation here ...

  const response = await fetch("./api/index.php");
  const result = await response.json();

  if (result.success) {
    assignments = result.data;
    renderTable();
  }

  form.addEventListener("submit", handleAddAssignment);
  tableBody.addEventListener("click", handleTableClick);
}

// --- Initial Page Load ---
loadAndInitialize();