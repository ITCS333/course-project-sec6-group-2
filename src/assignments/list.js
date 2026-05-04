/*
  Requirement: Populate the "Course Assignments" list page.

  Instructions:
  1. This file is already linked to `list.html` via:
         <script src="list.js" defer></script>

  2. In `list.html`, the <section id="assignment-list-section"> is the
     container that this script populates.

  3. Implement the TODOs below.

  API base URL: ./api/index.php
  Successful list response shape: { success: true, data: [ ...assignment objects ] }
  Each assignment object shape:
    {
      id:          number,   // integer primary key from the assignments table
      title:       string,
      due_date:    string,   // "YYYY-MM-DD" — matches the SQL column name
      description: string,
      files:       string[]  // already decoded array of URL strings
    }
*/

// --- Element Selections ---
// TODO: Select the section for the assignment list using its
//       id 'assignment-list-section'.

const assignmentListSection = document.getElementById("assignment-list-section");

// --- Functions ---

function createAssignmentArticle(assignment) {
  // ... your implementation here ...

  const article = document.createElement("article");

  const title = document.createElement("h2");
  title.textContent = assignment.title;

  const dueDate = document.createElement("p");
  dueDate.textContent = "Due: " + assignment.due_date;

  const description = document.createElement("p");
  description.textContent = assignment.description;

  const link = document.createElement("a");
  link.href = "details.html?id=" + assignment.id;
  link.textContent = "View Details & Discussion";

  article.appendChild(title);
  article.appendChild(dueDate);
  article.appendChild(description);
  article.appendChild(link);

  return article;
}

async function loadAssignments() {
  // ... your implementation here ...

  try {
    const response = await fetch("./api/index.php");
    const result = await response.json();

    if (!result.success) {
      console.error("API error");
      return;
    }

    assignmentListSection.innerHTML = "";

    result.data.forEach(assignment => {
      const article = createAssignmentArticle(assignment);
      assignmentListSection.appendChild(article);
    });

  } catch (error) {
    console.error("Error loading assignments:", error);
  }
}

// --- Initial Page Load ---
loadAssignments();