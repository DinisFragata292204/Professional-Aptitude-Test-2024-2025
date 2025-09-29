<?php
session_start();

// --- CORS e JSON headers ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método inválido."]);
    exit;
}

$postData = json_decode(file_get_contents("php://input"), true);
if (!isset($postData['event_id'], $postData['email'])) {
    echo json_encode(["success" => false, "message" => "Campos 'event_id' e 'email' são obrigatórios."]);
    exit;
}

// **–– Declaração correta das variáveis ––**
$event_id = intval($postData['event_id']);
$email    = trim($postData['email']);

$config = include '../../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro de conexão: " . $conn->connect_error]);
    exit;
}

$emailEscaped = $conn->real_escape_string($email);

// procura o id do utilizador
$userQuery   = "SELECT id FROM dadosdoutilizador WHERE email = '$emailEscaped' LIMIT 1";
$userResult  = $conn->query($userQuery);
if (!$userResult || $userResult->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Utilizador não encontrado."]);
    exit;
}
$userRow = $userResult->fetch_assoc();
$user_id = intval($userRow['id']);

// procura o professor correspondente
$stmtProf = $conn->prepare("SELECT id FROM professores WHERE user_id = ?");
$stmtProf->bind_param("i", $user_id);
$stmtProf->execute();
$resultProf = $stmtProf->get_result();
$stmtProf->close();

if (!$resultProf || $resultProf->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Professor não encontrado."]);
    exit;
}
$professor_id = intval($resultProf->fetch_assoc()['id']);

// Executa a exclusão do evento
$stmt = $conn->prepare("DELETE FROM eventos WHERE id = ? AND professor_id = ?");
$stmt->bind_param("ii", $event_id, $professor_id);
if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Evento apagado com sucesso."]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao apagar o evento."]);
}
$stmt->close();
$conn->close();
?>