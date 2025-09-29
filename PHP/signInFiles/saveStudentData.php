<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Não foi possível conectar com a base de dados."]));
}

$data = json_decode(file_get_contents('php://input'), true);

if (isset($data["emailDoUser"], $data["ano"], $data["turma"], $data["approvalMethod"])) {
    $email = $data["emailDoUser"];
    $ano = $data["ano"];
    $turma = $data["turma"];
    $approvalMethod = $data["approvalMethod"]; // "email" ou "notification"
    $deviceToken = isset($data["deviceToken"]) ? $data["deviceToken"] : null;
    $cargoUtilizador = "aluno";
    $estado = "pendente"; // Conta fica pendente até aprovação

    // Verifica se o utilizador existe e obtém o ID
    $checkUserQuery = "SELECT id FROM dadosdoutilizador WHERE email = ?";
    $stmt = $conn->prepare($checkUserQuery);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->bind_result($user_id);
    $stmt->fetch();
    $stmt->close();

    if ($user_id) {
        // Atualiza o cargo, estado e device token do utilizador na tabela dadosdoutilizador
        $updateUserQuery = "UPDATE dadosdoutilizador SET cargoUtilizador = ?, estado = ?, device_token = ? WHERE email = ?";
        $stmt = $conn->prepare($updateUserQuery);
        $stmt->bind_param("ssss", $cargoUtilizador, $estado, $deviceToken, $email);
        $stmt->execute();
        $stmt->close();

        // Atualiza o método de aprovação na tabela approval_requests para o user_id correspondente
        $updateApprovalQuery = "UPDATE approval_requests SET approval_method = ? WHERE user_id = ?";
        $stmt = $conn->prepare($updateApprovalQuery);
        $stmt->bind_param("si", $approvalMethod, $user_id);
        $stmt->execute();
        $stmt->close();

        // Se não houver registro em approval_requests, insere um novo
        $checkApprovalStmt = $conn->prepare("SELECT id FROM approval_requests WHERE user_id = ?");
        $checkApprovalStmt->bind_param("i", $user_id);
        $checkApprovalStmt->execute();
        $checkApprovalStmt->store_result();
        if ($checkApprovalStmt->num_rows == 0) {
            $checkApprovalStmt->close();
            $insertApprovalStmt = $conn->prepare("INSERT INTO approval_requests (user_id, approval_method, status, notified) VALUES (?, ?, 'pending', 0)");
            $insertApprovalStmt->bind_param("is", $user_id, $approvalMethod);
            $insertApprovalStmt->execute();
            $insertApprovalStmt->close();
        } else {
            $checkApprovalStmt->close();
        }

        // ============================
        // Passo adicional: Obter o turma_id a partir da tabela turmas usando o $turma e $ano informados
        // ============================
        $selectTurmaStmt = $conn->prepare("SELECT id FROM turmas WHERE turma = ? AND ano = ?");
        if (!$selectTurmaStmt) {
            echo json_encode(["success" => false, "message" => "Erro na preparação da consulta da turma."]);
            exit;
        }
        // Observação: Assumindo que o campo 'ano' é armazenado como INT na tabela turmas
        $selectTurmaStmt->bind_param("si", $turma, $ano);
        $selectTurmaStmt->execute();
        $selectTurmaStmt->bind_result($turma_id);
        if (!$selectTurmaStmt->fetch()) {
            // Se não encontrar, pode optar por inserir a turma ou retornar erro.
            $selectTurmaStmt->close();
            echo json_encode(["success" => false, "message" => "Turma não encontrada."]);
            exit;
        }
        $selectTurmaStmt->close();

        // ============================
        // Insere os dados na tabela alunos utilizando o turma_id obtido
        // ============================
        $insertAlunoQuery = "INSERT INTO alunos (user_id, turma_id) VALUES (?, ?)";
        $stmt = $conn->prepare($insertAlunoQuery);
        $stmt->bind_param("ii", $user_id, $turma_id);
        
        if ($stmt->execute()) {
            $stmt->close();
            echo json_encode(["success" => true, "message" => "Dados guardados com sucesso. Aguarda aprovação do administrador."]);
        } else {
            echo json_encode(["success" => false, "message" => "Erro ao guardar esses dados na base de dados."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Utilizador não encontrado."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Dados incompletos."]);
}

$conn->close();
?>