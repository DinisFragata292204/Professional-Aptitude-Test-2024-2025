<?php
// signInFiles/fetchTurmas.php

// Evita HTML de erro
ini_set('display_errors', 0);
error_reporting(0);

// CORS e JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

session_start();
error_log("[DEBUG fetchTurmas] A iniciar");

$config = include __DIR__ . '/../config_api.php';
$conn   = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    error_log("[ERROR fetchTurmas] Conexão falhou: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro na conexão"]);
    exit;
}

// Só 10º ano E status = 'ativo'
$sql = "SELECT id, turma 
        FROM turmas 
        WHERE ano = 10 
          AND status = 'ativo'";
error_log("[DEBUG fetchTurmas] SQL: $sql");

$result = $conn->query($sql);
if ($result === false) {
    error_log("[ERROR fetchTurmas] Query falhou: " . $conn->error);
    echo json_encode(["success" => false, "message" => "Erro na query"]);
    $conn->close();
    exit;
}

$turmas = [];
while ($row = $result->fetch_assoc()) {
    $turmas[] = $row;
}
error_log("[DEBUG fetchTurmas] Encontradas " . count($turmas) . " turmas");

echo json_encode(["success" => true, "turmas" => $turmas]);
$conn->close();
