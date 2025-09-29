<?php
// calendarioFiles/professor/fetchProfessorInfo.php

// para debug você pode ativar:
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
error_log("===== DEBUG fetchProfessorInfo.php iniciado =====");

// 1) JSON -> array
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);
error_log("DEBUG: JSON bruto: $raw");

if (empty($data['email'])) {
  error_log("DEBUG: email não fornecido");
  echo json_encode(["success" => false, "message" => "Email não fornecido"]);
  exit();
}
$email = $data['email'];
error_log("DEBUG: email = $email");

// 2) include correto do config
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
  error_log("ERROR: Falha de conexão: " . $conn->connect_error);
  echo json_encode(["success" => false, "message" => "Erro na conexão com o BD"]);
  exit();
}
error_log("DEBUG: Conexão MySQL OK");

// 3) Obter user_id do utilizador
$stmt0 = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ? LIMIT 1");
$stmt0->bind_param("s", $email);
$stmt0->execute();
$stmt0->bind_result($user_id);
if (!$stmt0->fetch()) {
  error_log("DEBUG: Utilizador não encontrado para email: $email");
  echo json_encode(["success" => false, "message" => "Utilizador não encontrado"]);
  $stmt0->close();
  $conn->close();
  exit();
}
$stmt0->close();
error_log("DEBUG: Encontrado dadosdoutilizador.id = $user_id");

// 4) procura id interno do professor
$stmt1 = $conn->prepare("SELECT id FROM professores WHERE user_id = ? LIMIT 1");
$stmt1->bind_param("i", $user_id);
$stmt1->execute();
$stmt1->bind_result($professor_id);
if (!$stmt1->fetch()) {
  error_log("DEBUG: Professor não encontrado p/ user_id = $user_id");
  echo json_encode(["success" => false, "message" => "Professor não encontrado"]);
  $stmt1->close();
  $conn->close();
  exit();
}
$stmt1->close();
error_log("DEBUG: Encontrado professores.id = $professor_id");

// 5) procura disciplina_id
$stmt1b = $conn->prepare("SELECT disciplina_id FROM professor_disciplinas WHERE professor_id = ? LIMIT 1");
$stmt1b->bind_param("i", $professor_id);
$stmt1b->execute();
$stmt1b->bind_result($disciplina_id);
if (!$stmt1b->fetch()) {
  error_log("DEBUG: disciplina_id não encontrado p/ professor_id = $professor_id");
  echo json_encode(["success" => false, "message" => "Disciplina não atribuída ao professor"]);
  $stmt1b->close();
  $conn->close();
  exit();
}
$stmt1b->close();
error_log("DEBUG: Encontrado disciplina_id = $disciplina_id");

// 6) procura turmas do professor
$sql2 = "
  SELECT t.id, t.ano, t.turma
  FROM professor_turmas pt
  JOIN turmas t ON t.id = pt.turma_id
  WHERE pt.professor_id = ?
";
error_log("DEBUG: SQL fetchTurmas: $sql2");
$stmt2 = $conn->prepare($sql2);
$stmt2->bind_param("i", $professor_id);
$stmt2->execute();
$res2 = $stmt2->get_result();

$turmas = [];
while ($row = $res2->fetch_assoc()) {
  error_log("DEBUG: Turma retornada: " . print_r($row, true));
  $turmas[] = $row;
}
$stmt2->close();
$conn->close();

error_log("DEBUG: Total turmas retornadas: " . count($turmas));

echo json_encode([
  "success"   => true,
  "professor" => [
    "user_id"   => $user_id,
    "disciplina"=> $disciplina_id
  ],
  "turmas"    => $turmas
]);
