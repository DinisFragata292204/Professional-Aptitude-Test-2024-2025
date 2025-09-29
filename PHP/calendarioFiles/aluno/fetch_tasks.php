<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Verifica se o método é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método não suportado."]);
    exit;
}

// Ler o corpo da requisição e decodificar o JSON
$data = json_decode(file_get_contents('php://input'), true);

$email = isset($data['email']) ? $data['email'] : '';
$tarefa_id = isset($data['tarefa_id']) ? $data['tarefa_id'] : null;

if (empty($email)) {
    echo json_encode(["success" => false, "message" => "Email não informado."]);
    exit;
}

$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
    exit;
}

/*
    Nesta nova estrutura:
    - A tabela tarefas possui a coluna turma_id.
    - A tabela turmas contém os campos 'turma' e 'ano'.
    - Para garantir que o aluno que fez a requisição pertence à turma associada à tarefa,
      fazemos JOIN dos alunos com a tabela turmas (usando a coluna turma_id).
*/

$sql = "
SELECT 
    t.id AS tarefa_id, 
    t.titulo,
    t.professor_id, 
    tr.turma, 
    tr.ano, 
    t.data_da_tarefa, 
    t.dataDeCriacao, 
    t.descricao,
    COALESCE(tc.cor, '#47AD4D') AS cor,  
    tc.notificacao_tipo,
    dp.email AS professor_email
FROM tarefas t
JOIN professores p ON p.id = t.professor_id
JOIN dadosdoutilizador dp ON dp.id = p.user_id
JOIN turmas tr ON tr.id = t.turma_id
JOIN alunos a ON a.turma_id = tr.id
JOIN dadosdoutilizador da ON da.id = a.user_id
LEFT JOIN tarefa_config tc ON tc.tarefa_id = t.id AND tc.user_id = da.id
WHERE da.email = ?
";

$params = [$email];
$types = "s";

if (!empty($tarefa_id)) {
    $sql .= " AND t.id = ?";
    $params[] = $tarefa_id;
    $types .= "i";
}

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Erro na preparação da consulta SQL."]);
    exit;
}

$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

if (!empty($tarefa_id)) {
    // Se foi enviado o tarefa_id, retorna a configuração da tarefa individual
    $configData = $result->fetch_assoc();
    echo json_encode(["success" => true, "config" => $configData]);
} else {
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    echo json_encode(["success" => true, "tasks" => $tasks]);
}

$stmt->close();
$conn->close();
?>