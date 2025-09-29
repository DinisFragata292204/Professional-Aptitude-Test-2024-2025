<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
session_start();

// DEBUG: método recebido
error_log("[DEBUG fetchAlunosPendentes] Método: " . $_SERVER['REQUEST_METHOD']);

$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("[ERROR fetchAlunosPendentes] Conexão falhou: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro de conexão"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT id, email FROM dadosdoutilizador WHERE cargoUtilizador = 'aluno' AND estado = 'pendente'";
    error_log("[DEBUG fetchAlunosPendentes] SQL: $sql");
    $result = $conn->query($sql);

    if ($result === false) {
        error_log("[ERROR fetchAlunosPendentes] Query falhou: " . $conn->error);
        echo json_encode(["success" => false, "message" => "Erro na query"]);
        $conn->close();
        exit;
    }

    $alunos = [];
    while ($row = $result->fetch_assoc()) {
        $alunos[] = $row;
    }
    error_log("[DEBUG fetchAlunosPendentes] Encontrados " . count($alunos) . " alunos pendentes.");

    echo json_encode([
        "success" => true,
        "alunos" => $alunos
    ]);
    $conn->close();
    exit;
}

// Para maior segurança, negar outros métodos
echo json_encode(["success" => false, "message" => "Método não suportado"]);
$conn->close();
