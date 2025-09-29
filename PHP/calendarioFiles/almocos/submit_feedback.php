<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido']);
    exit;
}

$email     = trim($data['email']     ?? '');
$dia       =           $data['dia']   ?? null;
$avaliacao =           $data['avaliacao'] ?? null;
$opiniao   = trim($data['opiniao'] ?? '');

if ($email === '' || $dia === null || !is_numeric($avaliacao)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dados em falta ou inválidos']);
    exit;
}

$config = include '../../config_api.php';
$conn = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Erro na conexão à BD']);
    exit;
}
$conn->set_charset('utf8mb4');

// Buscar o id do utilizador
$stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erro na preparação da query']);
    exit;
}
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->bind_result($user_id);
if (!$stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Utilizador não encontrado']);
    exit;
}
$stmt->close();

// Verificar se já existe feedback para o dia
$stmt = $conn->prepare("
    SELECT feedback_timestamp
    FROM quem_almoca
    WHERE user_id = ? AND dia = ?
");
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erro na preparação da query']);
    exit;
}
$stmt->bind_param('is', $user_id, $dia);
$stmt->execute();
$stmt->bind_result($feedback_ts);
if (!$stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Sem almoço marcado nesse dia']);
    exit;
}
$stmt->close();

if ($feedback_ts !== null && substr($feedback_ts, 0, 10) === $dia) {
    echo json_encode(['success' => false, 'message' => 'Feedback já registado hoje']);
    exit;
}

// Atualizar feedback
$stmt = $conn->prepare("
    UPDATE quem_almoca
    SET avaliacao = ?, opiniao = ?, feedback_timestamp = NOW()
    WHERE user_id = ? AND dia = ?
");
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erro na preparação da query']);
    exit;
}
$stmt->bind_param('isis', $avaliacao, $opiniao, $user_id, $dia);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Falha ao gravar feedback']);
}

$stmt->close();
$conn->close();
?>
