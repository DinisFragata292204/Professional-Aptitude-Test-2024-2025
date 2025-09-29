<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// ler JSON de input
$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? null;
if (!$email) {
    echo json_encode(['success' => false, 'message' => 'E-mail em falta']);
    exit;
}

// ligar à base de dados
$config = include '../../config_api.php';
$conn = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Erro na conexão com a base de dados']);
    exit;
}

// 1) obter o user_id a partir do email
$stmt = $conn->prepare('SELECT id FROM dadosdoutilizador WHERE email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Utilizador não encontrado']);
    exit;
}
$row = $res->fetch_assoc();
$user_id = (int) $row['id'];
$stmt->close();

// 2) buscar dias em que já deu feedback (feedback_timestamp IS NOT NULL)
$query = "
    SELECT dia
    FROM quem_almoca
    WHERE user_id = ?
      AND feedback_timestamp IS NOT NULL
";
$stmt = $conn->prepare($query);
$stmt->bind_param('i', $user_id);
$stmt->execute();
$res = $stmt->get_result();

$days = [];
while ($r = $res->fetch_assoc()) {
    $days[] = $r['dia'];  // formato YYYY-MM-DD
}
$stmt->close();
$conn->close();

// devolver JSON
echo json_encode([
    'success' => true,
    'data'    => array_map(function($d){ return ['dia' => $d]; }, $days)
]);
?>