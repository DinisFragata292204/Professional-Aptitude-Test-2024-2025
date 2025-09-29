<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método inválido"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

$email       = isset($data['email']) ? $data['email'] : '';
$title       = isset($data['title']) ? $data['title'] : '';
$description = isset($data['description']) ? $data['description'] : '';
$start_date  = isset($data['start_date']) ? $data['start_date'] : '';
$start_time  = isset($data['start_time']) ? $data['start_time'] : '';
$end_date    = isset($data['end_date']) ? $data['end_date'] : '';
$end_time    = isset($data['end_time']) ? $data['end_time'] : '';
$turma       = isset($data['turma']) ? $data['turma'] : '';
$ano         = isset($data['ano']) ? $data['ano'] : '';
$color       = isset($data['color']) ? $data['color'] : '';

// Validação mínima
if(empty($email) || empty($title) || empty($start_date) || empty($start_time) || empty($end_date) || empty($end_time) || empty($turma)) {
    echo json_encode(["success" => false, "message" => "Campos obrigatórios não preenchidos"]);
    exit();
}

$config = include '../../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Obtém o id do utilizador
$stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if($result->num_rows === 0){
    echo json_encode(["success" => false, "message" => "Utilizador não encontrado"]);
    exit();
}
$user = $result->fetch_assoc();
$user_id = $user['id'];
$stmt->close();

// Obtém o professor_id a partir da tabela professores (usando o user_id)
$stmt = $conn->prepare("SELECT id FROM professores WHERE user_id = ? LIMIT 1");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
if($result->num_rows === 0){
    echo json_encode(["success" => false, "message" => "Professor não encontrado"]);
    exit();
}
$professor = $result->fetch_assoc();
$professor_id = $professor['id'];
$stmt->close();

// Converte data e hora usando o formato 'd/m/Y H:i'
$start_datetime = DateTime::createFromFormat('d/m/Y H:i', "$start_date $start_time");
$end_datetime   = DateTime::createFromFormat('d/m/Y H:i', "$end_date $end_time");

if (!$start_datetime || !$end_datetime) {
    echo json_encode(["success" => false, "message" => "Erro no formato de data/hora"]);
    exit();
}

// Formata para o padrão que a base de dados espera: yyyy-mm-dd HH:ii:ss
$data_comeco = $start_datetime->format("Y-m-d H:i:s");
$data_fim    = $end_datetime->format("Y-m-d H:i:s");

// Obtém o turma_id da tabela "turmas" com base no valor de turma e ano
$stmt = $conn->prepare("SELECT id FROM turmas WHERE turma = ? AND ano = ? LIMIT 1");
$stmt->bind_param("si", $turma, $ano);
$stmt->execute();
$result = $stmt->get_result();
if($result->num_rows === 0){
    echo json_encode(["success" => false, "message" => "Turma ou ano não encontrado"]);
    exit();
}
$turmaData = $result->fetch_assoc();
$turma_id = $turmaData['id'];
$stmt->close();

// Insere na tabela "eventos", agora utilizando o campo turma_id
$stmt = $conn->prepare("INSERT INTO eventos (professor_id, titulo, data_comeco, data_fim, turma_id, descricao, cores) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("isssiss", $professor_id, $title, $data_comeco, $data_fim, $turma_id, $description, $color);

if($stmt->execute()){
    echo json_encode(["success" => true, "message" => "Evento adicionado com sucesso"]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao adicionar evento"]);
}

$stmt->close();
$conn->close();
?>