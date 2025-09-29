<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método inválido"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

// Verifica o tipo de registro: Tarefa ou Evento
$type = isset($data['type']) ? $data['type'] : '';

// Inclui as configurações da base de dados
$config = include '../../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Consulta o utilizador para obter o user_id
$email = isset($data['email']) ? $data['email'] : '';

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

// Consulta o professor a partir do user_id
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

if($type === "Tarefa") {
    // Caso seja tarefa, valida os campos necessários
    $title         = isset($data['title']) ? $data['title'] : '';
    $description   = isset($data['description']) ? $data['description'] : '';
    $data_da_tarefa = isset($data['data_da_tarefa']) ? $data['data_da_tarefa'] : '';
    $turma         = isset($data['turma']) ? $data['turma'] : '';
    $ano           = isset($data['ano']) ? $data['ano'] : '';
    $color         = isset($data['color']) ? $data['color'] : '';

    if(empty($title) || empty($data_da_tarefa) || empty($turma) || empty($ano) || empty($color)) {
        echo json_encode(["success" => false, "message" => "Campos obrigatórios não preenchidos"]);
        exit();
    }

    // Converte a data da tarefa usando o formato 'd/m/Y H:i'
    $task_datetime = DateTime::createFromFormat('d/m/Y H:i', $data_da_tarefa);
    if (!$task_datetime) {
        echo json_encode(["success" => false, "message" => "Erro no formato da data da tarefa"]);
        exit();
    }
    $data_da_tarefa_formatted = $task_datetime->format("Y-m-d H:i:s");

    // --- NOVA PARTE ---
    // Consulta a tabela 'turmas' para obter o ID da turma (turma_id) a partir do nome da turma e do ano
    $stmtTurma = $conn->prepare("SELECT id FROM turmas WHERE turma = ? AND ano = ? LIMIT 1");
    $stmtTurma->bind_param("si", $turma, $ano);
    $stmtTurma->execute();
    $resultTurma = $stmtTurma->get_result();
    if ($resultTurma->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Turma ou ano não encontrado"]);
        exit();
    }
    $turmaData = $resultTurma->fetch_assoc();
    $turma_id = $turmaData['id'];
    $stmtTurma->close();
    // --- FIM NOVA PARTE ---

    // Insere na tabela "tarefas" usando o campo turma_id
    $stmt = $conn->prepare("INSERT INTO tarefas (professor_id, turma_id, data_da_tarefa, descricao, titulo, cores) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iissss", $professor_id, $turma_id, $data_da_tarefa_formatted, $description, $title, $color);

    if($stmt->execute()){
        echo json_encode(["success" => true, "message" => "Tarefa adicionada com sucesso"]);
    } else {
        echo json_encode(["success" => false, "message" => "Erro ao adicionar tarefa"]);
    }
    $stmt->close();
}

$conn->close();
?>