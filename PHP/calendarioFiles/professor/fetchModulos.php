<?php
// calendarioFiles/professor/fetchModulos.php

ini_set('display_errors', 1);
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
error_log("===== DEBUG fetchModulos.php iniciado =====");

// 1) Lê JSON e valida
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);
error_log("DEBUG: JSON bruto: $raw");

if (empty($data['professor_id']) || empty($data['disciplina']) || empty($data['turma_id'])) {
    error_log("ERROR: Parâmetros em falta(professor_id, disciplina, turma_id)");
    echo json_encode([
        "success" => false,
        "message" => "Campos obrigatórios em falta: professor_id, disciplina, turma_id"
    ]);
    exit();
}

$professor_id = intval($data['professor_id']);
$disciplina   = intval($data['disciplina']);
$turma_id     = intval($data['turma_id']);
error_log("DEBUG: professor_id=$professor_id, disciplina=$disciplina, turma_id=$turma_id");

// 2) Conecta ao BD
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

// 3) Monta e executa query
$sql = "
    SELECT m.numero_do_modulo, m.nome
    FROM modulos m
    WHERE m.turma_id   = ?
      AND m.disciplina = ?
    ORDER BY m.numero_do_modulo ASC
";
error_log("DEBUG: SQL fetchModulos: $sql");

$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("ERROR: prepare() falhou: " . $conn->error);
    echo json_encode(["success" => false, "message" => "Erro interno na query"]);
    exit();
}
$stmt->bind_param("ii", $turma_id, $disciplina);
$stmt->execute();
$res = $stmt->get_result();

$modulos = [];
while ($row = $res->fetch_assoc()) {
    error_log("DEBUG: Módulo retornado: " . print_r($row, true));
    $modulos[] = $row;
}
$stmt->close();
$conn->close();

error_log("DEBUG: Total módulos retornados: " . count($modulos));

echo json_encode([
    "success" => true,
    "modulos" => $modulos
]);
