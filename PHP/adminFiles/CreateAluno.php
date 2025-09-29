<?php
session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(["success"=>false,"message"=>"Método não permitido"]);
  exit;
}

// Ler e decodificar JSON
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!$data) {
  http_response_code(400);
  echo json_encode(["success"=>false,"message"=>"JSON inválido"]);
  exit;
}

// Campos obrigatórios
foreach (['email','cargoUtilizador','ano','turma'] as $f) {
  if (empty($data[$f])) {
    http_response_code(422);
    echo json_encode(["success"=>false,"message"=>"Falta o campo $f"]);
    exit;
  }
}
$email           = $data['email'];
$cargo           = $data['cargoUtilizador'];
$ano             = (int)$data['ano'];
$turmaIdRecebido = (int)$data['turma'];

// Só "alunos"
if ($cargo !== 'aluno') {
  http_response_code(422);
  echo json_encode(["success"=>false,"message"=>"Apenas alunos podem ser criados aqui"]);
  exit;
}

$config = include __DIR__.'/../config_api.php';
$conn   = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode(["success"=>false,"message"=>"Erro BD: ".$conn->connect_error]);
  exit;
}

// 1) Verificar "email" duplicado
$chk = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
$chk->bind_param("s", $email);
$chk->execute();
$chk->store_result();
if ($chk->num_rows > 0) {
  http_response_code(409);
  echo json_encode(["success"=>false,"message"=>"Email já existe"]);
  exit;
}
$chk->close();

// 2) Verificar se a "turma" existe e está "ativa"
$stmtT = $conn->prepare(
  "SELECT id 
     FROM turmas 
    WHERE id = ? 
      AND ano = ? 
      AND status = 'ativo'"
);
$stmtT->bind_param("ii", $turmaIdRecebido, $ano);
$stmtT->execute();
$resT = $stmtT->get_result();
if ($resT->num_rows === 0) {
  http_response_code(404);
  echo json_encode(["success"=>false,"message"=>"Turma inválida ou inativa"]);
  exit;
}
$stmtT->close();

// 3) Inserir na tabela "dadosdoutilizador"
$ins1 = $conn->prepare(
  "INSERT INTO dadosdoutilizador 
     (email, cargoUtilizador, estado, password, data_criacao)
   VALUES (?, 'aluno', 'pendente', '', NOW())"
);
$ins1->bind_param("s", $email);
if (!$ins1->execute()) {
  http_response_code(500);
  echo json_encode(["success"=>false,"message"=>"Erro criar utilizador: ".$ins1->error]);
  exit;
}
$userId = $conn->insert_id;
$ins1->close();

// 4) Inserir na tabela "alunos" para uma só "turma"
$ins2 = $conn->prepare(
  "INSERT INTO alunos (user_id, turma_id) VALUES (?, ?)"
);
$ins2->bind_param("ii", $userId, $turmaIdRecebido);
if (!$ins2->execute()) {
  http_response_code(500);
  echo json_encode(["success"=>false,"message"=>"Erro ao criar registo na tabela alunos: ".$ins2->error]);
  exit;
}
$ins2->close();
$conn->close();

// 5) Resposta
echo json_encode([
  "success"  => true,
  "user_id"  => $userId,
  "turma_id" => $turmaIdRecebido
]);
