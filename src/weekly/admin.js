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
// Holds the weeks currently displayed in the table.
let weeks = [];

// --- Element Selections ---
// TODO: Select the week form by id 'week-form'.
let form = document.getElementById('week-form');

// TODO: Select the weeks table body by id 'weeks-tbody'.
let tableBody = document.getElementById('weeks-tbody');

// --- Functions ---

/**
 * TODO: Implement createWeekRow.
 *
 * Parameters:
 *   week — one week object with shape:
 *     { id, title, start_date, description, links }
 *
 * Returns a <tr> element with four <td>s:
 *   1. title
 *   2. start_date  (the "YYYY-MM-DD" string from the weeks table)
 *   3. description
 *   4. Actions — two buttons:
 *        <button class="edit-btn"   data-id="{id}">Edit</button>
 *        <button class="delete-btn" data-id="{id}">Delete</button>
 *      The data-id holds the integer primary key from the weeks table.
 */
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
  editBtn.dataset.id = week.id;

  let deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn";
  deleteBtn.dataset.id = week.id;

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
 *
 * It should:
 * 1. Clear the weeks table body (set innerHTML to "").
 * 2. Loop through the global `weeks` array.
 * 3. For each week, call createWeekRow(week) and append the <tr>
 *    to the table body.
 */
function renderTable() {
  // ... your implementation here ...

  tableBody.innerHTML = "";

  for (let i = 0; i < weeks.length; i++) {
    let row = createWeekRow(weeks[i]);
    tableBody.appendChild(row);
  }
}

/**
 * TODO: Implement handleAddWeek (async).
 *
 * This is the event handler for the form's 'submit' event.
 * It should:
 * 1. Call event.preventDefault().
 * 2. Read values from:
 *      - #week-title       → title (string)
 *      - #week-start-date  → start_date (string, "YYYY-MM-DD")
 *      - #week-description → description (string)
 *      - #week-links       → split by newlines (\n) and filter empty
 *                            strings to produce a links array.
 * 3. Check if the submit button (#add-week) has a data-edit-id attribute.
 *    - If it does, call handleUpdateWeek() with that id and the field values.
 *    - If it does not, send a POST to './api/index.php' with the body:
 *        { title, start_date, description, links }
 *      On success (result.success === true):
 *        - Add the new week (with the id from result.id) to the global
 *          `weeks` array.
 *        - Call renderTable().
 *        - Reset the form.
 */
async function handleAddWeek(event) {
  // ... your implementation here ...

  event.preventDefault();

  let title = document.getElementById("week-title").value;
  let start_date = document.getElementById("week-start-date").value;
  let description = document.getElementById("week-description").value;
  let linksText = document.getElementById("week-links").value;

  let links = linksText.split("\n").filter(l => l.trim() !== "");

  let button = document.getElementById("add-week");

  // if data-edit-id exists, we're updating an existing week instead of adding a new one
  if (button.dataset.editId) {
    await handleUpdateWeek(button.dataset.editId, {
      title,
      start_date,
      description,
      links
    });
    return;
  }

  // adding a new week
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
      id: result.id,
      title,
      start_date,
      description,
      links
    });

    renderTable();
    form.reset();
  }
}

/**
 * TODO: Implement handleUpdateWeek (async).
 *
 * Parameters:
 *   id     — the integer primary key of the week being edited.
 *   fields — object with { title, start_date, description, links }.
 *
 * It should:
 * 1. Send a PUT to './api/index.php' with the body:
 *      { id, title, start_date, description, links }
 * 2. On success:
 *    - Update the matching entry in the global `weeks` array.
 *    - Call renderTable().
 *    - Reset the form.
 *    - Restore the submit button text to "Add Week" and remove
 *      its data-edit-id attribute.
 */
async function handleUpdateWeek(id, fields) {
  // ... your implementation here ...

  let response = await fetch("./api/index.php", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: id,
      title: fields.title,
      start_date: fields.start_date,
      description: fields.description,
      links: fields.links
    })
  });

  let result = await response.json();

  if (result.success) {

    for (let i = 0; i < weeks.length; i++) {
      if (weeks[i].id == id) {
        weeks[i] = { id, ...fields };
      }
    }

    renderTable();
    form.reset();

    let button = document.getElementById("add-week");
    button.textContent = "Add Week";
    delete button.dataset.editId;
  }
}

/**
 * TODO: Implement handleTableClick (async).
 *
 * This is a delegated click listener on the weeks table body.
 * It should:
 * 1. If event.target has class "delete-btn":
 *    a. Read the integer id from event.target.dataset.id.
 *    b. Send a DELETE to './api/index.php?id=<id>'.
 *    c. On success, remove the week from the global `weeks` array
 *       and call renderTable().
 *
 * 2. If event.target has class "edit-btn":
 *    a. Read the integer id from event.target.dataset.id.
 *    b. Find the matching week in the global `weeks` array.
 *    c. Populate the form fields (#week-title, #week-start-date,
 *       #week-description, #week-links) with the week's data.
 *       For #week-links, join the links array with newlines (\n).
 *    d. Change the submit button (#add-week) text to "Update Week"
 *       and set its data-edit-id attribute to the week's id.
 */
async function handleTableClick(event) {
  // ... your implementation here ...

  let target = event.target;

  // delete
  if (target.classList.contains("delete-btn")) {

    let id = target.dataset.id;

    let response = await fetch(`./api/index.php?id=${id}`, {
      method: "DELETE"
    });

    let result = await response.json();

    if (result.success) {
      weeks = weeks.filter(w => w.id != id);
      renderTable();
    }
  }

  // edit
  if (target.classList.contains("edit-btn")) {

    let id = target.dataset.id;

    let week = weeks.find(w => w.id == id);

    document.getElementById("week-title").value = week.title;
    document.getElementById("week-start-date").value = week.start_date;
    document.getElementById("week-description").value = week.description;
    document.getElementById("week-links").value = week.links.join("\n");

    let button = document.getElementById("add-week");
    button.textContent = "Update Week";
    button.dataset.editId = id;
  }
}

/**
 * TODO: Implement loadAndInitialize (async).
 *
 * It should:
 * 1. Send a GET to './api/index.php'.
 *    Response shape: { success: true, data: [ ...week objects ] }
 * 2. Store the data array in the global `weeks` variable.
 * 3. Call renderTable() to populate the table.
 * 4. Attach the 'submit' event listener to the week form
 *    (calls handleAddWeek).
 * 5. Attach a 'click' event listener to the weeks table body
 *    (calls handleTableClick — event delegation for edit and delete).
 */
async function loadAndInitialize() {
  // ... your implementation here ...

  let response = await fetch("./api/index.php");
  let result = await response.json();

  if (result.success) {
    weeks = result.data;
    renderTable();
  }

  form.addEventListener("submit", handleAddWeek);
  tableBody.addEventListener("click", handleTableClick);
}
// --- Initial Page Load ---
loadAndInitialize();
