<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

error_log("DEBUG: A iniciar o fetchDiscEventos.php");

// Le os dados enviados
$data = json_decode(file_get_contents('php://input'), true);
if (!isset($data['email']) || !isset($data['disciplina_id'])) {
    error_log("DEBUG: Parâmetros 'email' e 'disciplina_id' não fornecidos");
    echo json_encode(["error" => "Parâmetros 'email' e 'disciplina_id' são obrigatórios."]);
    exit;
}

$email = $data['email'];
$disciplina_id = $data['disciplina_id'];
error_log("DEBUG: Email recebido: $email; disciplina_id: $disciplina_id");

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("DEBUG: Erro de conexão: " . $conn->connect_error);
    echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
    exit;
}

// Procura o ID do utilizador a partir do email
$stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    error_log("DEBUG: Utilizador não encontrado para o email: $email");
    echo json_encode(["error" => "Utilizador não encontrado."]);
    exit;
}
$userRow = $result->fetch_assoc();
$user_id = $userRow['id'];
error_log("DEBUG: ID do utilizador: $user_id");
$stmt->close();

// Procura a turma e o ano do aluno via JOIN com a tabela "turmas" (usando o campo "turma_id")
$stmt = $conn->prepare("
    SELECT turmas.turma, turmas.ano, turmas.id AS turma_id
    FROM alunos
    INNER JOIN turmas ON alunos.turma_id = turmas.id
    WHERE alunos.user_id = ?
    LIMIT 1
");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    error_log("DEBUG: Aluno não encontrado para user_id: $user_id");
    echo json_encode(["error" => "Aluno não encontrado."]);
    exit;
}
$turmaEAnoAluno = $result->fetch_assoc();
$turma = $turmaEAnoAluno['turma']; // Valor textual da turma (ex. "A", "B")
$ano = $turmaEAnoAluno['ano'];     // Ano do aluno
$turma_id = $turmaEAnoAluno['turma_id']; // "ID" da turma na tabela "turmas"
$stmt->close();

// Procura o professor responsável pela disciplina
$stmt = $conn->prepare("SELECT professor_id FROM professor_disciplinas WHERE disciplina_id = ? LIMIT 1");
$stmt->bind_param("i", $disciplina_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["error" => "Não existem eventos nesta disciplina."]);
    exit;
}
$profRow = $result->fetch_assoc();
$professor_id = $profRow['professor_id'];
$stmt->close();

// Procura eventos filtrando por "turma_id" e "professor_id" para conectar à disciplina
$query = "SELECT 
            id,
            titulo AS title,
            data_comeco AS start_datetime,
            data_fim AS end_datetime
          FROM eventos
          WHERE turma_id = ? AND professor_id = ?";
$stmt = $conn->prepare($query);
if (!$stmt) {
    echo json_encode(["error" => "Erro na consulta dos eventos."]);
    exit;
}
$stmt->bind_param("ii", $turma_id, $professor_id);
$stmt->execute();
$result = $stmt->get_result();

$events = [];
while ($row = $result->fetch_assoc()) {
    $events[] = $row;
}

echo json_encode($events);
$stmt->close();
$conn->close();
?>