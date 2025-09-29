<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['token']) || empty($data['token'])) {
    echo json_encode(["success" => false, "message" => "Token não fornecido."]);
    exit();
}

$token = $data['token'];

// Exclui a sessão correspondente da tabela de sessões
$stmt = $conn->prepare("DELETE FROM sessoes_do_utilizador WHERE token = ?");
$stmt->bind_param("s", $token);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Sessão encerrada com sucesso."]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao encerrar a sessão."]);
}

$stmt->close();
$conn->close();
?>
