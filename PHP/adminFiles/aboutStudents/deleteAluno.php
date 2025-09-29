<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
session_start();

error_log("[DEBUG deleteAluno] Método: " . $_SERVER['REQUEST_METHOD']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método inválido"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (empty($data['id'])) {
    echo json_encode(["success" => false, "message" => "ID não fornecido"]);
    exit;
}

$id = intval($data['id']);
$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("[ERROR deleteAluno] Conexão: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro de conexão"]);
    exit;
}

$stmt = $conn->prepare("DELETE FROM dadosdoutilizador WHERE id = ?");
$stmt->bind_param("i", $id);
$ok = $stmt->execute();
error_log("[DEBUG deleteAluno] DELETE executado para ID $id: " . ($ok ? "sucesso" : $stmt->error));
$stmt->close();
$conn->close();

if ($ok) {
    echo json_encode(["success" => true, "message" => "Aluno removido"]);
} else {
    echo json_encode(["success" => false, "message" => "Falha ao remover"]);
}
