<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-type");
header("Access-Control-Allow-Credentials: true");
header("Content-type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {    
    $config = include '../../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
        exit();
    }

    // Lê os dados enviados via JSON
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Verifica se o email foi enviado
    $email = isset($data['email']) ? $data['email'] : null;
    if (empty($email)) {
        echo json_encode(["success" => false, "message" => "Email é obrigatório"]);
        exit();
    }
    
    // procura o user_id na tabela dadosdoutilizador com base no email
    $sqlUser = "SELECT id FROM dadosdoutilizador WHERE email = ?";
    $stmtUser = $conn->prepare($sqlUser);
    $stmtUser->bind_param("s", $email);
    $stmtUser->execute();
    $resultUser = $stmtUser->get_result();
    $user = $resultUser->fetch_assoc();
    if (!$user) {
        echo json_encode(["success" => false, "message" => "Utilizador não encontrado"]);
        exit();
    }
    $user_id = $user['id'];
    
    // Consulta o último registro para o user_id obtido na tabela entradasesaidas
    $sql = "SELECT * FROM entradasesaidas WHERE user_id = ? ORDER BY data_do_registo DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $lastRecord = $result->fetch_assoc();
    
    $currentDate = date("Y-m-d");
    $newtipo = "entrada"; // padrão: se não houver registro hoje, define como entrada
    
    if ($lastRecord) {
        // Extrai a data do último registro
        $lastDate = date("Y-m-d", strtotime($lastRecord['data_do_registo']));
        if ($lastDate == $currentDate) {
            // Se o registro de hoje já existir, alterna o tipo
            $newtipo = ($lastRecord['tipo'] === "entrada") ? "saida" : "entrada";
        }
    }
    
    // Insere o novo registro na tabela entradasesaidas
    $insertSql = "INSERT INTO entradasesaidas (user_id, tipo) VALUES (?, ?)";
    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->bind_param("is", $user_id, $newtipo);
    
    if ($insertStmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Registro inserido",
            "tipo" => $newtipo,
            "data_do_registo" => date("Y-m-d H:i:s")
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Falha na inserção"]);
    }
    
    $stmtUser->close();
    $stmt->close();
    $insertStmt->close();
    $conn->close();
} else {
    echo json_encode(["success" => false, "message" => "Método de requisição inválido"]);
}
?>