<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['tarefa_id'], $data['email'])) {
         echo json_encode(["success" => false, "message" => "Parâmetros em falta."]);
         exit;
    }
    
    $tarefa_id = intval($data['tarefa_id']);
    $email = $data['email'];
    
    $config = include '../../../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    if ($conn->connect_error) {
         echo json_encode(["success" => false, "message" => "Erro de conexão: " . $conn->connect_error]);
         exit;
    }
    
    // procura o id do utilizador
    $emailEscaped = $conn->real_escape_string($email);
    $userQuery = "SELECT id FROM dadosdoutilizador WHERE email = '$emailEscaped' LIMIT 1";
    $userResult = $conn->query($userQuery);
    if ($userResult && $userResult->num_rows > 0) {
         $userRow = $userResult->fetch_assoc();
         $user_id = intval($userRow['id']);
    } else {
         echo json_encode(["success" => false, "message" => "Utilizador não encontrado."]);
         exit;
    }
    
    // procura o professor correspondente
    $stmtProf = $conn->prepare("SELECT id FROM professores WHERE user_id = ?");
    $stmtProf->bind_param("i", $user_id);
    $stmtProf->execute();
    $resultProf = $stmtProf->get_result();
    if ($resultProf && $resultProf->num_rows > 0) {
         $rowProf = $resultProf->fetch_assoc();
         $professor_id = intval($rowProf['id']);
    } else {
         echo json_encode(["success" => false, "message" => "Professor não encontrado."]);
         exit;
    }
    $stmtProf->close();
    
    // Exclui as configurações relacionadas à tarefa
    $stmtConfig = $conn->prepare("DELETE FROM tarefa_config WHERE tarefa_id = ?");
    $stmtConfig->bind_param("i", $tarefa_id);
    $stmtConfig->execute();
    $stmtConfig->close();
    
    // Agora, apaga a tarefa utilizando o professor_id
    $stmt = $conn->prepare("DELETE FROM tarefas WHERE id = ? AND professor_id = ?");
    $stmt->bind_param("ii", $tarefa_id, $professor_id);
    if ($stmt->execute()) {
         echo json_encode(["success" => true, "message" => "Tarefa apagada com sucesso."]);
    } else {
         echo json_encode(["success" => false, "message" => "Erro ao apagar a tarefa."]);
    }
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(["success" => false, "message" => "Método inválido."]);
}
?>