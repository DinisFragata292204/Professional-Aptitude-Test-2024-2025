<?php
// signInFiles/alunosProf.php

ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();
error_log("===== DEBUG alunosProf.php iniciado =====");

// 1) Receber JSON e validar
$raw = file_get_contents("php://input");
$post = json_decode($raw, true);
error_log("DEBUG: JSON bruto recebido: $raw");
if (empty($post['email'])) {
    error_log("DEBUG: email não fornecido");
    echo json_encode(["success" => false, "message" => "Email não fornecido"]);
    exit;
}
$email = $post['email'];

// 2) Conectar ao BD
$config = include __DIR__ . '/../../config_api.php';
error_log("DEBUG: Config carregada: " . print_r($config, true));

$conn = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    error_log("ERROR: Falha na conexão: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro na conexão com o BD"]);
    exit();
}
error_log("DEBUG: Conexão MySQL OK");

// 3) Obter professor_id
$userEmail = $conn->real_escape_string($email);
$q = "
    SELECT p.id 
    FROM dadosdoutilizador d
    JOIN professores p ON p.user_id = d.id
    WHERE d.email = '{$userEmail}'
    LIMIT 1
";
error_log("DEBUG: Query professor_id: $q");
$r = $conn->query($q);
if (!$r || $r->num_rows === 0) {
    error_log("DEBUG: Professor não encontrado para email={$email}");
    echo json_encode(["success" => false, "message" => "Professor não encontrado"]);
    exit;
}
$professor_id = intval($r->fetch_assoc()['id']);
error_log("DEBUG: Encontrado professor_id = $professor_id");

// 4) Procurar turmas ativas atribuídas ao professor
$sql = "
    SELECT t.id, t.ano, t.turma
    FROM professor_turmas pt
    JOIN turmas t ON t.id = pt.turma_id
    WHERE pt.professor_id = {$professor_id}
      AND t.status <> 'desativado'
";
error_log("DEBUG: Query turmas ativas: $sql");
$res = $conn->query($sql);
if (!$res) {
    error_log("ERROR: falha na query turmas: " . $conn->error);
    echo json_encode(["success" => false, "message" => "Erro ao Procurar turmas"]);
    exit;
}

$turmas = [];
while ($row = $res->fetch_assoc()) {
    error_log("DEBUG: Turma retornada: " . print_r($row, true));
    $turmas[] = $row;
}

error_log("DEBUG: Total de turmas retornadas: " . count($turmas));

echo json_encode([
    "success" => true,
    "turmas"  => $turmas
]);

$conn->close();
