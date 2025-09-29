<?php
// signInFiles/saveSelectedTurma.php

// Evita que notices/warnings sejam impressos em HTML
ini_set('display_errors', 0);
error_reporting(0);

// CORS e JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

session_start();
error_log("[DEBUG saveSelectedTurma] A iniciar");

// Recebe JSON
$data = json_decode(file_get_contents("php://input"), true);
error_log("[DEBUG saveSelectedTurma] Payload: " . json_encode($data));

if (empty($data['email']) || empty($data['turma_id'])) {
    echo json_encode(["success" => false, "message" => "Dados incompletos"]);
    exit;
}

$email    = $data['email'];
$turma_id = intval($data['turma_id']);

// Usa caminho absoluto para incluir o config
$config = include __DIR__ . '/../config_api.php';
$conn   = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    error_log("[ERROR saveSelectedTurma] Conexão falhou: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro na conexão"]);
    exit;
}

// 1) procura user_id
$stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->bind_result($user_id);
if (!$stmt->fetch()) {
    error_log("[ERROR saveSelectedTurma] utilizador não encontrado para email: $email");
    echo json_encode(["success" => false, "message" => "utilizador não encontrado"]);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();
error_log("[DEBUG saveSelectedTurma] Encontrado user_id = $user_id");

// 2) Insere na tabela alunos
$stmt2 = $conn->prepare("INSERT INTO alunos (user_id, turma_id) VALUES (?, ?)");
$stmt2->bind_param("ii", $user_id, $turma_id);
$ok = $stmt2->execute();
if ($ok) {
    error_log("[DEBUG saveSelectedTurma] Inserção na tabela alunos OK");
    echo json_encode(["success" => true, "message" => "Turma selecionada com sucesso"]);
} else {
    error_log("[ERROR saveSelectedTurma] Falha ao inserir: " . $stmt2->error);
    echo json_encode(["success" => false, "message" => "Erro ao salvar turma"]);
}
$stmt2->close();
$conn->close();
