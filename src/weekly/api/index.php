<?php
/**
 * Weekly Course Breakdown API
 *
 * RESTful API for CRUD operations on weekly course content and discussion
 * comments. Uses PDO to interact with the MySQL database defined in
 * schema.sql.
 *
 * Database Tables (ground truth: schema.sql):
 *
 * Table: weeks
 *   id          INT UNSIGNED  PRIMARY KEY AUTO_INCREMENT
 *   title       VARCHAR(200)  NOT NULL
 *   start_date  DATE          NOT NULL
 *   description TEXT
 *   links       TEXT          — JSON-encoded array of URL strings
 *   created_at  TIMESTAMP
 *   updated_at  TIMESTAMP
 *
 * Table: comments_week
 *   id          INT UNSIGNED  PRIMARY KEY AUTO_INCREMENT
 *   week_id     INT UNSIGNED  NOT NULL   — FK → weeks.id (ON DELETE CASCADE)
 *   author      VARCHAR(100)  NOT NULL
 *   text        TEXT          NOT NULL
 *   created_at  TIMESTAMP
 *
 * HTTP Methods Supported:
 *   GET    — Retrieve week(s) or comments
 *   POST   — Create a new week or comment
 *   PUT    — Update an existing week
 *   DELETE — Delete a week (cascade removes its comments) or a single comment
 *
 * URL scheme (all requests go to index.php):
 *
 *   Weeks:
 *     GET    ./api/index.php                  — list all weeks
 *     GET    ./api/index.php?id={id}           — get one week by integer id
 *     POST   ./api/index.php                  — create a new week
 *     PUT    ./api/index.php                  — update a week (id in JSON body)
 *     DELETE ./api/index.php?id={id}           — delete a week
 *
 *   Comments (action parameter selects the comments sub-resource):
 *     GET    ./api/index.php?action=comments&week_id={id}
 *                                             — list comments for a week
 *     POST   ./api/index.php?action=comment   — create a comment
 *     DELETE ./api/index.php?action=delete_comment&comment_id={id}
 *                                             — delete a single comment
 *
 * Query parameters for GET all weeks:
 *   search — filter rows where title LIKE or description LIKE the term
 *   sort   — column to sort by; allowed: title, start_date (default: start_date)
 *   order  — sort direction; allowed: asc, desc (default: asc)
 *
 * Response format: JSON
 *   Success: { "success": true,  "data": ... }
 *   Error:   { "success": false, "message": "..." }
 */

// ============================================================================
// HEADERS AND INITIALIZATION
// ============================================================================

// TODO: Set headers for JSON response and CORS.
// Set Content-Type to application/json.
// Allow cross-origin requests (CORS) if needed.
// Allow HTTP methods: GET, POST, PUT, DELETE, OPTIONS.
// Allow headers: Content-Type, Authorization.

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// TODO: Read the HTTP request method.
// $method = $_SERVER['REQUEST_METHOD'];
$method = $_SERVER['REQUEST_METHOD'];

// TODO: Handle preflight OPTIONS request.
// If the request method is OPTIONS, return HTTP 200 and exit.
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// TODO: Include the shared database connection file.
// require_once __DIR__ . '/../../common/db.php';
require_once __DIR__ . '/../../common/db.php';

// TODO: Get the PDO database connection.
// $db = getDBConnection();
$db = getDBConnection();

// TODO: Read and decode the request body for POST and PUT requests.
// $rawData = file_get_contents('php://input');
// $data    = json_decode($rawData, true) ?? [];
$rawData = file_get_contents('php://input');
$data    = json_decode($rawData, true) ?? [];

// TODO: Read query parameters.
// $action    = $_GET['action']     ?? null;
// $id        = $_GET['id']         ?? null;
// $weekId    = $_GET['week_id']    ?? null;
// $commentId = $_GET['comment_id'] ?? null;
$action    = $_GET['action']     ?? null;
$id        = $_GET['id']         ?? null;
$weekId    = $_GET['week_id']    ?? null;
$commentId = $_GET['comment_id'] ?? null;


// ============================================================================
// WEEKS FUNCTIONS
// ============================================================================

function getAllWeeks(PDO $db): void
{
    // TODO: Build the base SELECT query.
    $query = "SELECT id, title, start_date, description, links, created_at FROM weeks";

    // TODO: If $_GET['search'] is provided and non-empty...
    if (!empty($_GET['search'])) {
        $query .= " WHERE title LIKE :search OR description LIKE :search";
    }

    // TODO: Validate sort
    $sort = in_array($_GET['sort'] ?? '', ['title','start_date']) ? $_GET['sort'] : 'start_date';

    // TODO: Validate order
    $order = strtolower($_GET['order'] ?? '') === 'desc' ? 'DESC' : 'ASC';

    // TODO: Append ORDER BY
    $query .= " ORDER BY $sort $order";

    // TODO: Prepare, bind, execute
    $stmt = $db->prepare($query);

    if (!empty($_GET['search'])) {
        $stmt->bindValue(':search', '%' . $_GET['search'] . '%');
    }

    $stmt->execute();

    // TODO: Fetch all rows
    $weeks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // TODO: Decode JSON
    foreach ($weeks as &$row) {
        $row['links'] = json_decode($row['links'], true) ?? [];
    }

    // TODO: Send response
    sendResponse(['success' => true, 'data' => $weeks]);
}

function getWeekById(PDO $db, $id): void
{
    // TODO: Validate ID
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false, 'message' => 'Invalid ID'], 400);
    }

    $stmt = $db->prepare("SELECT id, title, start_date, description, links, created_at FROM weeks WHERE id=?");
    $stmt->execute([$id]);

    $week = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($week) {
        $week['links'] = json_decode($week['links'], true) ?? [];
        sendResponse(['success' => true, 'data' => $week]);
    } else {
        sendResponse(['success' => false, 'message' => 'Not found'], 404);
    }
}

function createWeek(PDO $db, array $data): void
{
    // TODO: Validate required fields
    if (empty($data['title']) || empty($data['start_date'])) {
        sendResponse(['success' => false, 'message' => 'Missing fields'], 400);
    }

    $title = trim($data['title']);
    $start_date = trim($data['start_date']);
    $description = trim($data['description'] ?? '');

    // TODO: Validate date
    if (!validateDate($start_date)) {
        sendResponse(['success' => false, 'message' => 'Invalid date'], 400);
    }

    $links = is_array($data['links'] ?? null) ? json_encode($data['links']) : json_encode([]);

    $stmt = $db->prepare("INSERT INTO weeks (title, start_date, description, links) VALUES (?, ?, ?, ?)");
    $stmt->execute([$title, $start_date, $description, $links]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'message' => 'Week created', 'id' => $db->lastInsertId()], 201);
    } else {
        sendResponse(['success' => false, 'message' => 'Failed'], 500);
    }
}

function updateWeek(PDO $db, array $data): void
{
    // TODO: Validate ID
    if (empty($data['id'])) {
        sendResponse(['success' => false, 'message' => 'ID required'], 400);
    }

    $stmt = $db->prepare("SELECT id FROM weeks WHERE id=?");
    $stmt->execute([$data['id']]);
    if (!$stmt->fetch()) {
        sendResponse(['success' => false, 'message' => 'Not found'], 404);
    }

    $fields = [];
    $values = [];

    if (isset($data['title'])) {
        $fields[] = "title=?";
        $values[] = $data['title'];
    }

    if (isset($data['start_date'])) {
        if (!validateDate($data['start_date'])) {
            sendResponse(['success' => false], 400);
        }
        $fields[] = "start_date=?";
        $values[] = $data['start_date'];
    }

    if (isset($data['description'])) {
        $fields[] = "description=?";
        $values[] = $data['description'];
    }

    if (isset($data['links'])) {
        $fields[] = "links=?";
        $values[] = json_encode($data['links']);
    }

    if (empty($fields)) {
        sendResponse(['success' => false], 400);
    }

    $values[] = $data['id'];

    $sql = "UPDATE weeks SET " . implode(',', $fields) . " WHERE id=?";
    $stmt = $db->prepare($sql);

    if ($stmt->execute($values)) {
        sendResponse(['success' => true]);
    } else {
        sendResponse(['success' => false], 500);
    }
}

function deleteWeek(PDO $db, $id): void
{
    // TODO: Validate ID
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM weeks WHERE id=?");
    $stmt->execute([$id]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $stmt = $db->prepare("DELETE FROM weeks WHERE id=?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true]);
    } else {
        sendResponse(['success' => false], 500);
    }
}


// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {

    if ($method === 'GET') {

        if ($action === 'comments') {
            getCommentsByWeek($db, $weekId);
        } elseif ($id) {
            getWeekById($db, $id);
        } else {
            getAllWeeks($db);
        }

    } elseif ($method === 'POST') {

        if ($action === 'comment') {
            createComment($db, $data);
        } else {
            createWeek($db, $data);
        }

    } elseif ($method === 'PUT') {

        updateWeek($db, $data);

    } elseif ($method === 'DELETE') {

        if ($action === 'delete_comment') {
            deleteComment($db, $commentId);
        } else {
            deleteWeek($db, $id);
        }

    } else {
        sendResponse(['success' => false], 405);
    }

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false], 500);
}

function sendResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit();
}

function validateDate(string $date): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

function sanitizeInput(string $data): string
{
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}