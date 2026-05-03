/*
  Requirement: Populate the weekly detail page and handle the discussion forum.

  Instructions:
  1. This file is already linked to `details.html` via:
         <script src="details.js" defer></script>

  2. The following ids must exist in details.html (already listed in the
     HTML comments):
       #week-title          — <h1>
       #week-start-date     — <p>
       #week-description    — <p>
       #week-links-list     — <ul>
       #comment-list        — <div>
       #comment-form        — <form>
       #new-comment         — <textarea>

  3. Implement the TODOs below.

  API base URL: ./api/index.php
  Week object shape returned by the API:
    {
      id:          number,   // integer primary key from the weeks table
      title:       string,
      start_date:  string,   // "YYYY-MM-DD"
      description: string,
      links:       string[]  // decoded array of URL strings
    }

  Comment object shape returned by the API
  (from the comments_week table):
    {
      id:          number,
      week_id:     number,
      author:      string,
      text:        string,
      created_at:  string
    }
*/

// --- Global Data Store ---
let currentWeekId = null;  // integer id from the weeks table
let currentComments = [];

// --- Element Selections ---
// TODO: Select each element by its id:
let weekTitle = document.getElementById("week-title");
let weekStartDate = document.getElementById("week-start-date");
let weekDescription = document.getElementById("week-description");
let weekLinksList = document.getElementById("week-links-list");
let commentList = document.getElementById("comment-list");
let commentForm = document.getElementById("comment-form");
let newCommentInput = document.getElementById("new-comment");
//   weekTitle, weekStartDate, weekDescription,
//   weekLinksList, commentList, commentForm, newCommentInput.

// --- Functions ---

/**
 * TODO: Implement getWeekIdFromURL.
 */
function getWeekIdFromURL() {
  let params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/**
 * TODO: Implement renderWeekDetails.
 */
function renderWeekDetails(week) {

  weekTitle.textContent = week.title;
  weekStartDate.textContent = "Starts on: " + week.start_date;
  weekDescription.textContent = week.description;

  weekLinksList.innerHTML = "";

  // FIX: handle undefined links safely
  let links = Array.isArray(week.links) ? week.links : [];

  for (let i = 0; i < links.length; i++) {
    let li = document.createElement("li");

    let a = document.createElement("a");
    a.href = links[i];
    a.textContent = links[i];

    li.appendChild(a);
    weekLinksList.appendChild(li);
  }
}

/**
 * TODO: Implement createCommentArticle.
 */
function createCommentArticle(comment) {

  let article = document.createElement("article");

  let p = document.createElement("p");
  p.textContent = comment.text;

  let footer = document.createElement("footer");
  footer.textContent = "Posted by: " + comment.author;

  article.appendChild(p);
  article.appendChild(footer);

  return article;
}

/**
 * TODO: Implement renderComments.
 */
function renderComments() {

  commentList.innerHTML = "";

  for (let i = 0; i < currentComments.length; i++) {
    let article = createCommentArticle(currentComments[i]);
    commentList.appendChild(article);
  }
}

/**
 * TODO: Implement handleAddComment (async).
 */
async function handleAddComment(event) {

  event.preventDefault();

  let text = newCommentInput.value.trim();

  if (text === "") {
    return;
  }

  let response = await fetch("./api/index.php?action=comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      week_id: Number(currentWeekId), // FIX: ensure integer
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

/**
 * TODO: Implement initializePage (async).
 */
async function initializePage() {

  currentWeekId = getWeekIdFromURL();

  if (!currentWeekId) {
    weekTitle.textContent = "Week not found.";
    return;
  }

  // FIX: convert to number once
  currentWeekId = Number(currentWeekId);

  let [weekRes, commentsRes] = await Promise.all([
    fetch(`./api/index.php?id=${currentWeekId}`),
    fetch(`./api/index.php?action=comments&week_id=${currentWeekId}`)
  ]);

  let weekData = await weekRes.json();
  let commentsData = await commentsRes.json();

  if (commentsData.success) {
    currentComments = commentsData.data || [];
  } else {
    currentComments = [];
  }

  if (weekData.success) {
    renderWeekDetails(weekData.data);
    renderComments();
    commentForm.addEventListener("submit", handleAddComment);
  } else {
    weekTitle.textContent = "Week not found.";
  }
}

// --- Initial Page Load ---
initializePage();