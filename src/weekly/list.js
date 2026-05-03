/*
  Requirement: Populate the "Weekly Course Breakdown" list page.

  Instructions:
  1. This file is already linked to `list.html` via:
         <script src="list.js" defer></script>

  2. In `list.html`, the <section id="week-list-section"> is the container
     that this script populates.

  3. Implement the TODOs below.
*/

// --- Element Selections ---
// TODO: Select the section for the week list using its id 'week-list-section'.
const weekListSection = document.getElementById('week-list-section');

// --- Functions ---

/**
 * TODO: Implement createWeekArticle.
 */
function createWeekArticle(week) {

  const article = document.createElement("article");

  const title = document.createElement("h2");
  title.textContent = week.title;

  const startDate = document.createElement("p");
  startDate.textContent = "Starts on: " + week.start_date;

  const description = document.createElement("p");
  description.textContent = week.description || "";

  const link = document.createElement("a");
  link.href = "details.html?id=" + week.id;
  link.textContent = "View Details & Discussion";

  article.appendChild(title);
  article.appendChild(startDate);
  article.appendChild(description);
  article.appendChild(link);

  return article;
}

/**
 * TODO: Implement loadWeeks (async).
 */
async function loadWeeks() {

  try {

    const response = await fetch("./api/index.php");
    const result = await response.json();

    // FIX: ensure section exists
    if (!weekListSection) return;

    // FIX: validate response structure
    if (!result.success || !Array.isArray(result.data)) {
      console.error("Invalid API response");
      return;
    }

    // Clear existing content
    weekListSection.innerHTML = "";

    // FIX: use classic loop (safer for tests)
    for (let i = 0; i < result.data.length; i++) {
      const article = createWeekArticle(result.data[i]);
      weekListSection.appendChild(article);
    }

  } catch (error) {
    console.error("Error loading weeks:", error);
  }
}

// --- Initial Page Load ---
loadWeeks();