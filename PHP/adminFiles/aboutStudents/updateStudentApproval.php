<?php
// adminFiles/aboutStudents/updateStudentApproval.php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require '../../config_api.php';
$config = include '../../config_api.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Erro na conexão com a base de dados."]));
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['user_id'], $data['action'])) {
    echo json_encode(["success" => false, "message" => "Dados incompletos."]);
    exit;
}

$user_id = $data['user_id'];
$action = $data['action']; // "approve" ou "reject"

// Verifica se o "aluno" existe e está "pendente"
$checkStmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE id = ? AND estado = 'pendente'");
$checkStmt->bind_param("i", $user_id);
$checkStmt->execute();
$checkStmt->store_result();
if ($checkStmt->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Aluno não encontrado ou já processado."]);
    exit;
}
$checkStmt->close();

if ($action === "approve") {
    // Se houver novos valores de "ano" e "turma", atualizar também na tabela "alunos" (utilizando "turma_id")
    $newAno = isset($data['ano']) ? $data['ano'] : null;
    $newTurma = isset($data['turma']) ? $data['turma'] : null;

    // Atualiza o "estado" para "ativo" na tabela "dadosdoutilizador"
    $updateStmt = $conn->prepare("UPDATE dadosdoutilizador SET estado = 'ativo' WHERE id = ?");
    $updateStmt->bind_param("i", $user_id);
    $updateStmt->execute();
    $updateStmt->close();

    // Se os novos valores forem enviados, atualiza na tabela "alunos" através do "turma_id"
    if ($newAno !== null && $newTurma !== null) {
        // Procura o "id" da "turma" correspondente na tabela "turmas"
        $selectTurmaStmt = $conn->prepare("SELECT id FROM turmas WHERE ano = ? AND turma = ?");
        $selectTurmaStmt->bind_param("is", $newAno, $newTurma);
        $selectTurmaStmt->execute();
        $resultTurma = $selectTurmaStmt->get_result();
        if ($resultTurma->num_rows === 0) {
            echo json_encode(["success" => false, "message" => "Turma não encontrada para o ano e turma informados."]);
            exit;
        }
        $turmaRow = $resultTurma->fetch_assoc();
        $turma_id = $turmaRow['id'];
        $selectTurmaStmt->close();

        // Atualiza o campo "turma_id" na tabela "alunos" para o "utilizador" informado
        $updateAlunoStmt = $conn->prepare("UPDATE alunos SET turma_id = ? WHERE user_id = ?");
        $updateAlunoStmt->bind_param("ii", $turma_id, $user_id);
        $updateAlunoStmt->execute();
        $updateAlunoStmt->close();
    }
    
    // Atualiza o pedido de aprovação para "approved" na tabela "approval_requests"
    $approvalStmt = $conn->prepare("UPDATE approval_requests SET status = 'approved' WHERE user_id = ?");
    $approvalStmt->bind_param("i", $user_id);
    $approvalStmt->execute();
    $approvalStmt->close();

    echo json_encode(["success" => true, "message" => "Aluno aprovado com sucesso."]);
} elseif ($action === "reject") {
    // Atualiza o estado para "rejeitado" na tabela "dadosdoutilizador"
    $updateStmt = $conn->prepare("UPDATE dadosdoutilizador SET estado = 'rejeitado' WHERE id = ?");
    $updateStmt->bind_param("i", $user_id);
    $updateStmt->execute();
    $updateStmt->close();
    
    // Atualiza o pedido de aprovação para "rejected" na tabela "approval_requests"
    $approvalStmt = $conn->prepare("UPDATE approval_requests SET status = 'rejected' WHERE user_id = ?");
    $approvalStmt->bind_param("i", $user_id);
    $approvalStmt->execute();
    $approvalStmt->close();
    
    echo json_encode(["success" => true, "message" => "Aluno rejeitado com sucesso."]);
} else {
    echo json_encode(["success" => false, "message" => "Ação inválida."]);
}

$conn->close();
?>