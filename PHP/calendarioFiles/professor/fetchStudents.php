<?php
// signInFiles/alunosProf.php

// ——————————————————————————————————————————————————————————————
// Configurações iniciais
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

// ——————————————————————————————————————————————————————————————
// Lê o JSON de entrada
$raw      = file_get_contents("php://input");
$postData = json_decode($raw, true);

// ——————————————————————————————————————————————————————————————
// Validação dos campos obrigatórios
if (
    empty($postData['professor_id']) ||
    !isset($postData['turma'])       ||
    !isset($postData['ano'])         ||
    !isset($postData['disciplina'])  ||
    !isset($postData['moduloNum'])
) {
    error_log("[ERROR] Campos obrigatórios em falta (professor_id, turma, ano, disciplina, moduloNum)");
    echo json_encode([
      "success" => false,
      "message" => "Dados obrigatórios em falta: professor_id, turma, ano, disciplina e moduloNum"
    ]);
    exit();
}

$professor_user_id = intval($postData['professor_id']);
$turma             = $postData['turma'];
$ano               = intval($postData['ano']);
$disciplina        = intval($postData['disciplina']);
$moduloNum         = intval($postData['moduloNum']);

error_log("[DEBUG] Entrada: professor_user_id={$professor_user_id}, turma={$turma}, ano={$ano}, disciplina={$disciplina}, moduloNum={$moduloNum}");

// ——————————————————————————————————————————————————————————————
// Conexão ao banco
$config = include '../../config_api.php';
$conn   = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("[ERROR] Falha na conexão com a base: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// ——————————————————————————————————————————————————————————————
// 1) Traduz user_id → professor_id interno
$stmt = $conn->prepare("SELECT id FROM professores WHERE user_id = ? LIMIT 1");
$stmt->bind_param("i", $professor_user_id);
$stmt->execute();
$stmt->bind_result($professor_id);
if (!$stmt->fetch()) {
    error_log("[ERROR] Professor não encontrado (user_id={$professor_user_id})");
    echo json_encode(["success" => false, "message" => "Professor não encontrado"]);
    exit();
}
$stmt->close();
error_log("[DEBUG] professor_id interno = {$professor_id}");

// ——————————————————————————————————————————————————————————————
// 2) Verifica existência da turma e obtém turma_id
$stmt = $conn->prepare("SELECT id FROM turmas WHERE turma = ? AND ano = ? LIMIT 1");
$stmt->bind_param("si", $turma, $ano);
$stmt->execute();
$stmt->bind_result($turma_id);
if (!$stmt->fetch()) {
    error_log("[ERROR] Turma não encontrada (turma={$turma}, ano={$ano})");
    echo json_encode(["success" => false, "message" => "Turma não encontrada"]);
    exit();
}
$stmt->close();
error_log("[DEBUG] turma_id = {$turma_id}");

// ——————————————————————————————————————————————————————————————
// 3) Confirma que o professor leciona essa turma
$stmt = $conn->prepare("
  SELECT 1
  FROM professor_turmas
  WHERE professor_id = ? AND turma_id = ?
  LIMIT 1
");
$stmt->bind_param("ii", $professor_id, $turma_id);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows === 0) {
    error_log("[ERROR] Professor {$professor_id} não leciona turma_id {$turma_id}");
    echo json_encode(["success" => false, "message" => "Você não leciona essa turma"]);
    exit();
}
$stmt->close();
error_log("[DEBUG] Professor autorizado para turma_id {$turma_id}");

// ——————————————————————————————————————————————————————————————
// 4) Lista alunos ativos dessa turma que AINDA NÃO TÊM nota para este módulo
$sql = "
  SELECT 
    d.email,
    t.ano,
    t.turma
  FROM dadosdoutilizador d
  JOIN alunos a 
    ON a.user_id = d.id
  JOIN turmas t 
    ON t.id = a.turma_id

  -- associa o módulo para saber módulo_id
  JOIN modulos m 
    ON m.numero_do_modulo = ?

  -- tenta encontrar nota já lançada
  LEFT JOIN notas n
    ON n.aluno_id     = a.id
   AND n.professor_id = ?
   AND n.disciplina   = ?
   AND n.modulo_id    = m.id

  WHERE 
    d.cargoUtilizador = 'aluno'
    AND d.estado       = 'ativo'
    AND a.turma_id     = ?
    AND n.id IS NULL    -- só traz quem não tem nota lançada
";
$stmt = $conn->prepare($sql);
$stmt->bind_param(
  "iiii",    // m.numero_do_modulo, professor_id, disciplina, turma_id
  $moduloNum,
  $professor_id,
  $disciplina,
  $turma_id
);
$stmt->execute();
$res = $stmt->get_result();

$students = [];
while ($row = $res->fetch_assoc()) {
    $students[] = $row;
}
$stmt->close();
$conn->close();

error_log("[DEBUG] Total alunos sem nota neste módulo: " . count($students));
echo json_encode([
  "success"  => true,
  "students" => $students
]);
