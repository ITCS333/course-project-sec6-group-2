<?php
/**
 * Weekly Course Breakdown API
 *
 * RESTful API for CRUD operations on weekly course content and discussion
 * comments. Uses PDO to interact with the MySQL database defined in
 * schema.sql.
 *
 * (ALL ORIGINAL COMMENTS PRESERVED)
 */

// ============================================================================
// HEADERS AND INITIALIZATION
// ============================================================================

// TODO: Set headers for JSON response and CORS.
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// TODO: Read the HTTP request method.
$method = $_SERVER['REQUEST_METHOD'];

// TODO: Handle preflight OPTIONS request.
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// TODO: Include the shared database connection file.
require_once __DIR__ . '/../../common/db.php';

// TODO: Get the PDO database connection.
$db = getDBConnection();

// TODO: Read and decode the request body
$rawData = file_get_contents('php://input');
$data    = json_decode($rawData, true) ?? [];

// TODO: Read query parameters.
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

    // TODO: search
    if (!empty($_GET['search'])) {
        $query .= " WHERE title LIKE :search OR description LIKE :search";
    }

    // TODO: sort + order
    $sort = in_array($_GET['sort'] ?? '', ['title','start_date']) ? $_GET['sort'] : 'start_date';
    $order = strtolower($_GET['order'] ?? '') === 'desc' ? 'DESC' : 'ASC';

    $query .= " ORDER BY $sort $order";

    $stmt = $db->prepare($query);

    if (!empty($_GET['search'])) {
        $stmt->bindValue(':search', '%' . $_GET['search'] . '%');
    }

    $stmt->execute();

    $weeks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($weeks as &$row) {
        $row['links'] = json_decode($row['links'], true) ?? [];
    }

    sendResponse(['success' => true, 'data' => $weeks]);
}

function getWeekById(PDO $db, $id): void
{
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT * FROM weeks WHERE id=?");
    $stmt->execute([$id]);

    $week = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($week) {
        $week['links'] = json_decode($week['links'], true) ?? [];
        sendResponse(['success' => true, 'data' => $week]);
    } else {
        sendResponse(['success' => false], 404);
    }
}

function createWeek(PDO $db, array $data): void
{
    if (empty($data['title']) || empty($data['start_date'])) {
        sendResponse(['success' => false], 400);
    }

    $title = trim($data['title']);
    $start_date = trim($data['start_date']);
    $description = trim($data['description'] ?? '');

    if (!validateDate($start_date)) {
        sendResponse(['success' => false], 400);
    }

    $links = is_array($data['links'] ?? null) ? json_encode($data['links']) : json_encode([]);

    $stmt = $db->prepare("INSERT INTO weeks (title, start_date, description, links) VALUES (?, ?, ?, ?)");
    $stmt->execute([$title, $start_date, $description, $links]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
    } else {
        sendResponse(['success' => false], 500);
    }
}

function updateWeek(PDO $db, array $data): void
{
    if (empty($data['id'])) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM weeks WHERE id=?");
    $stmt->execute([$data['id']]);
    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $fields = [];
    $values = [];

    if (isset($data['title'])) {
        $fields[] = 'title=?';
        $values[] = $data['title'];
    }

    if (isset($data['start_date'])) {
        if (!validateDate($data['start_date'])) {
            sendResponse(['success' => false], 400);
        }
        $fields[] = 'start_date=?';
        $values[] = $data['start_date'];
    }

    if (isset($data['description'])) {
        $fields[] = 'description=?';
        $values[] = $data['description'];
    }

    if (isset($data['links'])) {
        $fields[] = 'links=?';
        $values[] = json_encode($data['links']);
    }

    if (empty($fields)) {
        sendResponse(['success' => false], 400);
    }

    $values[] = $data['id'];

    $sql = "UPDATE weeks SET " . implode(', ', $fields) . " WHERE id=?";
    $stmt = $db->prepare($sql);

    if ($stmt->execute($values)) {
        sendResponse(['success' => true]);
    } else {
        sendResponse(['success' => false], 500);
    }
}

function deleteWeek(PDO $db, $id): void
{
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
// COMMENTS
// ============================================================================

function getCommentsByWeek(PDO $db, $weekId): void
{
    if (!$weekId || !is_numeric($weekId)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT * FROM comments_week WHERE week_id=? ORDER BY created_at ASC");
    $stmt->execute([$weekId]);

    sendResponse(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function createComment(PDO $db, array $data): void
{
    if (empty($data['week_id']) || empty($data['author']) || empty(trim($data['text'] ?? ''))) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM weeks WHERE id=?");
    $stmt->execute([$data['week_id']]);
    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $stmt = $db->prepare("INSERT INTO comments_week (week_id, author, text) VALUES (?, ?, ?)");
    $stmt->execute([$data['week_id'], trim($data['author']), trim($data['text'])]);

    sendResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
}

function deleteComment(PDO $db, $commentId): void
{
    if (!$commentId || !is_numeric($commentId)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("DELETE FROM comments_week WHERE id=?");
    $stmt->execute([$commentId]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true]);
    } else {
        sendResponse(['success' => false], 404);
    }
}

// ============================================================================
// ROUTER
// ============================================================================

try {

    if ($method === 'GET') {
        if ($action === 'comments') getCommentsByWeek($db, $weekId);
        elseif ($id) getWeekById($db, $id);
        else getAllWeeks($db);
    }

    elseif ($method === 'POST') {
        if ($action === 'comment') createComment($db, $data);
        else createWeek($db, $data);
    }

    elseif ($method === 'PUT') {
        updateWeek($db, $data);
    }

    elseif ($method === 'DELETE') {
        if ($action === 'delete_comment') deleteComment($db, $commentId);
        else deleteWeek($db, $id);
    }

    else {
        sendResponse(['success' => false], 405);
    }

} catch (Exception $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false], 500);
}

// ============================================================================
// HELPERS
// ============================================================================

function sendResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

function validateDate(string $date): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}