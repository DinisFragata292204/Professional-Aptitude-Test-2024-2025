<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// preflight
if ($_SERVER['REQUEST_METHOD']==='OPTIONS') {
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD']!=='POST') {
    http_response_code(405);
    echo json_encode(["success"=>false,"message"=>"Método inválido."]);
    exit;
}

// decodifica JSON ou multipart
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) $payload = $_POST;

// valida obrigatórios
if (empty($payload['tarefa_id']) || empty($payload['email'])) {
    echo json_encode(["success"=>false,"message"=>"'tarefa_id' e 'email' obrigatórios."]);
    exit;
}

// sanitiza
$tarefa_id = intval($payload['tarefa_id']);
$email     = trim($payload['email']);

$config = include '../../../config_api.php';
$conn = new mysqli($config['db_host'],$config['db_user'],$config['db_pass'],$config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success"=>false,"message"=>"Erro de ligação: ".$conn->connect_error]);
    exit;
}

// recupera professor_id
$emailEsc = $conn->real_escape_string($email);
$res = $conn->query("
    SELECT p.id AS prof_id
      FROM dadosdoutilizador d
      JOIN professores p ON p.user_id = d.id
     WHERE d.email = '{$emailEsc}' LIMIT 1
");
if (!$res || $res->num_rows===0) {
    echo json_encode(["success"=>false,"message"=>"Professor não encontrado."]);
    exit;
}
$professor_id = intval($res->fetch_assoc()['prof_id']);

// monta UPDATE dinâmico
$fields = [];
$types  = '';
$values = [];

// título (campo novo)
if (isset($payload['titulo']) && $payload['titulo']!=='') {
    $fields[] = 'titulo = ?';
    $types   .= 's';
    $values[] = trim($payload['titulo']);
}
// descrição
if (isset($payload['descricao'])) {
    $fields[] = 'descricao = ?';
    $types   .= 's';
    $values[] = trim($payload['descricao']);
}
// data da tarefa
if (!empty($payload['data_da_tarefa'])) {
    $fields[] = 'data_da_tarefa = ?';
    $types   .= 's';
    $values[] = trim($payload['data_da_tarefa']);
}
// cor (agora em inglês)
if (!empty($payload['color'])) {
    $fields[] = 'cores = ?';
    $types   .= 's';
    $values[] = trim($payload['color']);
}
// turma
if (isset($payload['turma_id']) && is_numeric($payload['turma_id'])) {
    $fields[] = 'turma_id = ?';
    $types   .= 'i';
    $values[] = intval($payload['turma_id']);
}
// updated_at
$fields[]  = 'updated_at = ?';
$types    .= 's';
$values[]  = date("Y-m-d H:i:s");

if (empty($fields)) {
    echo json_encode(["success"=>false,"message"=>"Nenhum campo para atualizar."]);
    exit;
}

// prepara e executa
$setSql = implode(", ", $fields);
$sql = "UPDATE tarefas SET {$setSql} WHERE id = ? AND professor_id = ?";
$types   .= 'ii';
$values[] = $tarefa_id;
$values[] = $professor_id;

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success"=>false,"message"=>"Erro no prepare: ".$conn->error]);
    exit;
}
$stmt->bind_param($types, ...$values);

if ($stmt->execute()) {
    echo json_encode(["success"=>true,"message"=>"Tarefa atualizada com sucesso."]);
} else {
    echo json_encode(["success"=>false,"message"=>"Erro ao atualizar: ".$stmt->error]);
}

$stmt->close();
$conn->close();
?>