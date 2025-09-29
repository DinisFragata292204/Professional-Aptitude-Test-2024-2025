<?php
header("Content-Type: application/json");

// Ajuste o caminho abaixo conforme a localização real do seu arquivo de configuração
// Exemplo: require_once __DIR__ . "/../config_db.php";
$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
    exit;
}

$email = isset($_GET['email']) ? $_GET['email'] : '';

if(empty($email)){
    echo json_encode(["success" => false, "message" => "Email não informado."]);
    exit;
}

/*
   A query realiza os seguintes passos:
   - Seleciona as tarefas (tabela tarefas)
   - Junta com a tabela professores para obter o professor_id e, por meio de dadosdoutilizador, o email do professor.
   - Junta com a tabela turmas para obter os dados de "ano" e "turma", e com alunos (que possui turma_id) e dadosdoutilizador para obter o aluno e filtrar pelo email recebido.
   - LEFT JOIN com tarefa_config para Procurar a configuração da tarefa para o aluno.
   Se não houver configuração, a cor retornada é a default "#47AD4D".
*/
$sql = "
SELECT 
    t.id AS tarefa_id, 
    t.professor_id, 
    tur.turma, 
    tur.ano, 
    t.data_da_tarefa, 
    t.dataDeCriacao, 
    COALESCE(tc.cor, '#47AD4D') AS cor, 
    tc.descricao, 
    tc.notificacao_tipo,
    dp.email AS professor_email
FROM tarefas t
JOIN professores p ON p.id = t.professor_id
JOIN dadosdoutilizador dp ON dp.id = p.user_id
JOIN turmas tur ON tur.id = t.turma_id
JOIN alunos a ON a.turma_id = tur.id
JOIN dadosdoutilizador da ON da.id = a.user_id
LEFT JOIN tarefa_config tc ON tc.tarefa_id = t.id AND tc.user_id = da.id
WHERE da.email = ?
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Erro na preparação da consulta SQL."]);
    exit;
}

$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

$tasks = [];
while ($row = $result->fetch_assoc()) {
    $tasks[] = $row;
}

echo json_encode(["success" => true, "tasks" => $tasks]);
$stmt->close();
$conn->close();
?>