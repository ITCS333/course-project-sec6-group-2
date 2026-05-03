<?php
/**
 * Assignment Management API
 *
 * RESTful API for CRUD operations on course assignments and their
 * discussion comments. Uses PDO to interact with the MySQL database
 * defined in schema.sql.
 *
 * Database Tables (ground truth: schema.sql):
 *
 * Table: assignments
 *   id          INT UNSIGNED  PRIMARY KEY AUTO_INCREMENT
 *   title       VARCHAR(200)  NOT NULL
 *   description TEXT
 *   due_date    DATE          NOT NULL
 *   files       TEXT          — JSON-encoded array of file URL strings
 *   created_at  TIMESTAMP
 *   updated_at  TIMESTAMP     — updated automatically by MySQL ON UPDATE
 *
 * Table: comments_assignment
 *   id            INT UNSIGNED  PRIMARY KEY AUTO_INCREMENT
 *   assignment_id INT UNSIGNED  NOT NULL — FK → assignments.id (ON DELETE CASCADE)
 *   author        VARCHAR(100)  NOT NULL
 *   text          TEXT          NOT NULL
 *   created_at    TIMESTAMP
 *
 * HTTP Methods Supported:
 *   GET, POST, PUT, DELETE
 */

// ============================================================================
// HEADERS AND INITIALIZATION
// ============================================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../common/db.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true) ?? [];

$action       = $_GET['action'] ?? null;
$id           = $_GET['id'] ?? null;
$assignmentId = $_GET['assignment_id'] ?? null;
$commentId    = $_GET['comment_id'] ?? null;

// ============================================================================
// ASSIGNMENT FUNCTIONS
// ============================================================================

function getAllAssignments(PDO $db): void
{
    $query = "SELECT id, title, description, due_date, files, created_at, updated_at FROM assignments";
    $params = [];

    if (!empty($_GET['search'])) {
        $query .= " WHERE title LIKE :search OR description LIKE :search";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    $allowedSort = ['title', 'due_date', 'created_at'];
    $sort = in_array($_GET['sort'] ?? '', $allowedSort) ? $_GET['sort'] : 'due_date';

    $order = strtolower($_GET['order'] ?? 'asc');
    $order = ($order === 'desc') ? 'desc' : 'asc';

    $query .= " ORDER BY $sort $order";

    $stmt = $db->prepare($query);
    $stmt->execute($params);

    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($assignments as &$row) {
        $row['files'] = json_decode($row['files'], true) ?? [];
    }

    sendResponse(['success' => true, 'data' => $assignments]);
}

function getAssignmentById(PDO $db, $id): void
{
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("
        SELECT id, title, description, due_date, files, created_at, updated_at
        FROM assignments WHERE id=?
    ");
    $stmt->execute([$id]);

    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($assignment) {
        $assignment['files'] = json_decode($assignment['files'], true) ?? [];
        sendResponse(['success' => true, 'data' => $assignment]);
    } else {
        sendResponse(['success' => false], 404);
    }
}

function createAssignment(PDO $db, array $data): void
{
    if (empty($data['title']) || empty($data['description']) || empty($data['due_date'])) {
        sendResponse(['success' => false], 400);
    }

    $title = trim($data['title']);
    $description = trim($data['description']);
    $due_date = trim($data['due_date']);

    if (!validateDate($due_date)) {
        sendResponse(['success' => false], 400);
    }

    $files = json_encode(is_array($data['files'] ?? null) ? $data['files'] : []);

    $stmt = $db->prepare("
        INSERT INTO assignments (title, description, due_date, files)
        VALUES (?, ?, ?, ?)
    ");

    $stmt->execute([$title, $description, $due_date, $files]);

    if ($stmt->rowCount() > 0) {
        sendResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
    } else {
        sendResponse(['success' => false], 500);
    }
}

function updateAssignment(PDO $db, array $data): void
{
    if (!isset($data['id']) || !is_numeric($data['id'])) {
        sendResponse(['success' => false], 400);
    }

    $id = (int)$data['id'];

    $stmt = $db->prepare("SELECT id FROM assignments WHERE id=?");
    $stmt->execute([$id]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $fields = [];
    $params = [];

    if (isset($data['title'])) {
        $fields[] = "title = ?";
        $params[] = trim($data['title']);
    }

    if (isset($data['description'])) {
        $fields[] = "description = ?";
        $params[] = trim($data['description']);
    }

    if (isset($data['due_date'])) {
        if (!validateDate($data['due_date'])) {
            sendResponse(['success' => false], 400);
        }
        $fields[] = "due_date = ?";
        $params[] = $data['due_date'];
    }

    if (isset($data['files'])) {
        $fields[] = "files = ?";
        $params[] = json_encode($data['files']);
    }

    if (empty($fields)) {
        sendResponse(['success' => false], 400);
    }

    $query = "UPDATE assignments SET " . implode(', ', $fields) . " WHERE id = ?";
    $params[] = $id;

    $stmt = $db->prepare($query);

    if ($stmt->execute($params)) {
        sendResponse(['success' => true]);
    } else {
        sendResponse(['success' => false], 500);
    }
}

function deleteAssignment(PDO $db, $id): void
{
    if (!$id || !is_numeric($id)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM assignments WHERE id=?");
    $stmt->execute([$id]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $stmt = $db->prepare("DELETE FROM assignments WHERE id=?");

    if ($stmt->execute([$id]) && $stmt->rowCount() > 0) {
        sendResponse(['success' => true]);
    } else {
        sendResponse(['success' => false], 500);
    }
}

// ============================================================================
// COMMENTS FUNCTIONS
// ============================================================================

function getCommentsByAssignment(PDO $db, $assignmentId): void
{
    if (!$assignmentId || !is_numeric($assignmentId)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("
        SELECT id, assignment_id, author, text, created_at
        FROM comments_assignment
        WHERE assignment_id = ?
        ORDER BY created_at ASC
    ");

    $stmt->execute([$assignmentId]);

    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(['success' => true, 'data' => $comments]);
}

function createComment(PDO $db, array $data): void
{
    if (empty($data['assignment_id']) || empty($data['author']) || empty(trim($data['text']))) {
        sendResponse(['success' => false], 400);
    }

    if (!is_numeric($data['assignment_id'])) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM assignments WHERE id=?");
    $stmt->execute([$data['assignment_id']]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $author = trim($data['author']);
    $text = trim($data['text']);

    $stmt = $db->prepare("
        INSERT INTO comments_assignment (assignment_id, author, text)
        VALUES (?, ?, ?)
    ");

    if ($stmt->execute([$data['assignment_id'], $author, $text])) {

        $newId = $db->lastInsertId();

        $comment = [
            'id' => $newId,
            'assignment_id' => (int)$data['assignment_id'],
            'author' => $author,
            'text' => $text,
            'created_at' => date('Y-m-d H:i:s')
        ];

        sendResponse([
            'success' => true,
            'id' => $newId,
            'data' => $comment
        ], 201);

    } else {
        sendResponse(['success' => false], 500);
    }
}

function deleteComment(PDO $db, $commentId): void
{
    if (!$commentId || !is_numeric($commentId)) {
        sendResponse(['success' => false], 400);
    }

    $stmt = $db->prepare("SELECT id FROM comments_assignment WHERE id=?");
    $stmt->execute([$commentId]);

    if (!$stmt->fetch()) {
        sendResponse(['success' => false], 404);
    }

    $stmt = $db->prepare("DELETE FROM comments_assignment WHERE id=?");

    if ($stmt->execute([$commentId]) && $stmt->rowCount() > 0) {
        sendResponse(['success' => true]);
    } else {
        sendResponse(['success' => false], 500);
    }
}

// ============================================================================
// ROUTER
// ============================================================================

try {

    if ($method === 'GET') {

        if ($action === 'comments') {
            getCommentsByAssignment($db, $assignmentId);
        } elseif ($id) {
            getAssignmentById($db, $id);
        } else {
            getAllAssignments($db);
        }

    } elseif ($method === 'POST') {

        if ($action === 'comment') {
            createComment($db, $data);
        } else {
            createAssignment($db, $data);
        }

    } elseif ($method === 'PUT') {

        updateAssignment($db, $data);

    } elseif ($method === 'DELETE') {

        if ($action === 'delete_comment') {
            deleteComment($db, $commentId);
        } else {
            deleteAssignment($db, $id);
        }

    } else {
        sendResponse(['success' => false], 405);
    }

} catch (PDOException $e) {
    error_log($e->getMessage());
    sendResponse(['success' => false], 500);

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