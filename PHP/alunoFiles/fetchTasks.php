<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

error_log("DEBUG: A iniciar o fetchTasks.php");

// Recebe e decodifica o JSON enviado
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['email'])) {
    error_log("DEBUG: Parâmetro 'email' não fornecido");
    echo json_encode(["error" => "Parâmetro 'email' é obrigatório."]);
    exit;
}

// Aqui, assumimos que o email enviado é o do professor
$email = $data['email'];
// Parâmetro opcional para uma tarefa específica
$tarefa_id = isset($data['tarefa_id']) ? $data['tarefa_id'] : null;

// Se o professor_id foi enviado, usamos-o; senão, procuramos usando o email
if (isset($data['professor_id']) && !empty($data['professor_id'])) {
    $professor_id = $data['professor_id'];
    error_log("DEBUG: professor_id enviado no payload: $professor_id");
} else {
    // Conectar e Procurar o professor na tabela dadosdoutilizador
    $config = include '../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    if ($conn->connect_error) {
        error_log("DEBUG: Erro de conexão: " . $conn->connect_error);
        echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
        exit;
    }
    // Procurar na tabela dadosdoutilizador o registro do professor
    $stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ? AND cargoUtilizador = 'professor' AND estado = 'ativo' LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        error_log("DEBUG: Professor não encontrado para o email: $email");
        echo json_encode(["error" => "Professor não encontrado."]);
        exit;
    }
    $profDados = $result->fetch_assoc();
    $user_prof_id = $profDados['id'];
    error_log("DEBUG: ID do professor na tabela dadosdoutilizador: $user_prof_id");
    $stmt->close();

    // Procurar o registro na tabela professores onde user_id = $user_prof_id
    $stmt = $conn->prepare("SELECT id, disciplina FROM professores WHERE user_id = ?");
    $stmt->bind_param("i", $user_prof_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        error_log("DEBUG: Professor não encontrado na tabela professores para user_id: $user_prof_id");
        echo json_encode(["error" => "Professor não encontrado na tabela professores."]);
        exit;
    }
    $profRecord = $result->fetch_assoc();
    $professor_id = $profRecord['id'];
    error_log("DEBUG: ID do professor na tabela professores: $professor_id");
    $stmt->close();
    
    $conn->close();
}

// Reabrir conexão para a consulta de tarefas
$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("DEBUG: Erro de conexão: " . $conn->connect_error);
    echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
    exit;
}

$sql = "
SELECT 
    t.id AS tarefa_id, 
    t.titulo,
    t.descricao,
    t.dataDeCriacao,
    t.data_da_tarefa,
    t.professor_id,
    dp.email AS professor_email
FROM tarefas t
JOIN professores p ON p.id = t.professor_id
JOIN dadosdoutilizador dp ON dp.id = p.user_id
WHERE t.professor_id = ?
";
if (!empty($tarefa_id)) {
    $sql .= " AND t.id = ?";
}

$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("DEBUG: Erro na preparação da consulta de tarefas: " . $conn->error);
    echo json_encode(["error" => "Erro na consulta de tarefas."]);
    exit;
}

if (!empty($tarefa_id)) {
    $stmt->bind_param("ii", $professor_id, $tarefa_id);
} else {
    $stmt->bind_param("i", $professor_id);
}

$stmt->execute();
$result = $stmt->get_result();

$tasks = [];
while ($row = $result->fetch_assoc()) {
    $tasks[] = $row;
}

error_log("DEBUG: Total de tarefas retornadas: " . count($tasks));
echo json_encode(["success" => true, "tasks" => $tasks]);

$stmt->close();
$conn->close();
?>
