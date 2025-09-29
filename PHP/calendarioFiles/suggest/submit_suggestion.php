<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

$config = include '../../config_api.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([ "success" => false, "message" => "Método não permitido" ]);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$email          = isset($input['email'])          ? trim($input['email'])          : '';
$suggestion     = isset($input['suggestion'])     ? trim($input['suggestion'])     : '';

if (empty($email) || empty($suggestion)) {
    echo json_encode([
        "success" => false,
        "message" => "Parâmetros inválidos ou em falta"
    ]);
    exit();
}

$conn = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Erro na conexão com a base de dados"
    ]);
    exit();
}

$stmt = $conn->prepare(
    "INSERT INTO `sugestoes_users` (`email`, `message`)
     VALUES (?, ?)"
);
if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Erro na preparação da query"
    ]);
    exit();
}

$stmt->bind_param("ss", $email, $suggestion);
if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Sugestão guardada com sucesso"
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Erro ao guardar sugestão"
    ]);
}

$stmt->close();
$conn->close();
?>
