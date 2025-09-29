<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $config = include '../../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
        exit();
    }
    
    // Lê os dados enviados via JSON
    $data = json_decode(file_get_contents('php://input'), true);
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
    
    // procura todos os registros para esse user_id na tabela entradasesaidas ordenados por data (ASC)
    // Aliás 'tipo' como 'type' para que o app possa usar item.type
    $sql = "SELECT id, tipo AS type, data_do_registo FROM entradasesaidas WHERE user_id = ? ORDER BY data_do_registo ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $days = [];
    while ($row = $result->fetch_assoc()) {
        // Agrupa por data (YYYY-MM-DD)
        $date = date("Y-m-d", strtotime($row['data_do_registo']));
        if (!isset($days[$date])) {
            $days[$date] = [
                "date" => $date,
                "records" => [],
                "entrada_count" => 0,
                "saida_count" => 0
            ];
        }
        $days[$date]["records"][] = $row;
        if ($row['type'] === "entrada") {
            $days[$date]["entrada_count"]++;
        } elseif ($row['type'] === "saida") {
            $days[$date]["saida_count"]++;
        }
    }
    
    // Calcula o status para cada dia
    $resultArray = [];
    foreach ($days as $day) {
        $entrada = $day["entrada_count"];
        $saida = $day["saida_count"];
        if ($entrada <= 2 && $saida <= 2) {
            $status = "normal";
        } elseif ($entrada <= 5 && $saida <= 5) {
            $status = "demasia";
        } else {
            $status = "demasiadas";
        }
        $day["status"] = $status;
        // Remove os contadores antes de enviar
        unset($day["entrada_count"]);
        unset($day["saida_count"]);
        $resultArray[] = $day;
    }
    
    echo json_encode([
        "success" => true,
        "days" => $resultArray
    ]);
    
    $stmtUser->close();
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(["success" => false, "message" => "Método de requisição inválido"]);
}
?>