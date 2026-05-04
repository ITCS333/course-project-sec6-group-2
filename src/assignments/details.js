/*
  Requirement: Populate the assignment detail page and discussion forum.

  Instructions:
  1. This file is already linked to `details.html` via:
         <script src="details.js" defer></script>

  2. The following ids must exist in details.html (already listed in the
     HTML comments):
       #assignment-title       — <h1>
       #assignment-due-date    — <p>
       #assignment-description — <p>
       #assignment-files-list  — <ul>
       #comment-list           — <div>
       #comment-form           — <form>
       #new-comment            — <textarea>

  3. Implement the TODOs below.

  API base URL: ./api/index.php
  Assignment object shape returned by the API:
    {
      id:          number,
      title:       string,
      due_date:    string,
      description: string,
      files:       string[]
    }

  Comment object shape returned by the API
  (from the comments_assignment table):
    {
      id:            number,
      assignment_id: number,
      author:        string,
      text:          string,
      created_at:    string
    }
*/

// --- Global Data Store ---
let currentAssignmentId = null;
let currentComments     = [];

// --- Element Selections ---
// TODO: Select each element by its id:
//   assignmentTitle, assignmentDueDate, assignmentDescription,
//   assignmentFilesList, commentList, commentForm, newCommentInput.

let assignmentTitle = document.getElementById("assignment-title");
let assignmentDueDate = document.getElementById("assignment-due-date");
let assignmentDescription = document.getElementById("assignment-description");
let assignmentFilesList = document.getElementById("assignment-files-list");
let commentList = document.getElementById("comment-list");
let commentForm = document.getElementById("comment-form");
let newCommentInput = document.getElementById("new-comment");

// --- Functions ---

function getAssignmentIdFromURL() {
  // ... your implementation here ...
  let params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderAssignmentDetails(assignment) {
  // ... your implementation here ...

  assignmentTitle.textContent = assignment.title;
  assignmentDueDate.textContent = "Due: " + assignment.due_date;
  assignmentDescription.textContent = assignment.description;

  assignmentFilesList.innerHTML = "";

  for (let i = 0; i < assignment.files.length; i++) {
    let li = document.createElement("li");

    let a = document.createElement("a");
    a.href = assignment.files[i];
    a.textContent = assignment.files[i];

    li.appendChild(a);
    assignmentFilesList.appendChild(li);
  }
}

function createCommentArticle(comment) {
  // ... your implementation here ...

  let article = document.createElement("article");

  let p = document.createElement("p");
  p.textContent = comment.text;

  let footer = document.createElement("footer");
  footer.textContent = "Posted by: " + comment.author;

  article.appendChild(p);
  article.appendChild(footer);

  return article;
}

function renderComments() {
  // ... your implementation here ...

  commentList.innerHTML = "";

  for (let i = 0; i < currentComments.length; i++) {
    let article = createCommentArticle(currentComments[i]);
    commentList.appendChild(article);
  }
}

async function handleAddComment(event) {
  // ... your implementation here ...

  event.preventDefault();

  let text = newCommentInput.value.trim();

  if (text === "") return;

  let response = await fetch("./api/index.php?action=comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      assignment_id: currentAssignmentId,
      author: "Student",
      text: text
    })
  });

  let result = await response.json();

  if (result.success) {
    currentComments.push(result.data);
    renderComments();
    newCommentInput.value = "";
  }
}

async function initializePage() {
  // ... your implementation here ...

  currentAssignmentId = getAssignmentIdFromURL();

  if (!currentAssignmentId) {
    assignmentTitle.textContent = "Assignment not found.";
    return;
  }

  let [assignmentRes, commentsRes] = await Promise.all([
    fetch(`./api/index.php?id=${currentAssignmentId}`),
    fetch(`./api/index.php?action=comments&assignment_id=${currentAssignmentId}`)
  ]);

  let assignmentData = await assignmentRes.json();
  let commentsData = await commentsRes.json();

  if (commentsData.success) {
    currentComments = commentsData.data;
  } else {
    currentComments = [];
  }

  if (assignmentData.success) {
    renderAssignmentDetails(assignmentData.data);
    renderComments();
    commentForm.addEventListener("submit", handleAddComment);
  } else {
    assignmentTitle.textContent = "Assignment not found.";
  }
}

// --- Initial Page Load ---
initializePage();