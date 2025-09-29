<?php 
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  // já retorna os CORS headers e sai
  http_response_code(200);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Captura e decodifica os dados enviados no corpo da requisição
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($input['tarefa_id']) || !isset($input['email'])) {
        echo json_encode(["success" => false, "message" => "Parâmetros em falta."]);
        exit;
    }
    
    $tarefa_id = intval($input['tarefa_id']);
    $email = $input['email'];
    
    $config = include '../../../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    if ($conn->connect_error) {
         echo json_encode(["success" => false, "message" => "Erro de conexão: " . $conn->connect_error]);
         exit;
    }
    
    // procura o id do utilizador na tabela dadosdoutilizador
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
    
    // procura o id do professor na tabela professores, onde user_id é o id obtido acima
    $stmtProf = $conn->prepare("SELECT id FROM professores WHERE user_id = ?");
    $stmtProf->bind_param("i", $user_id);
    $stmtProf->execute();
    $resultProf = $stmtProf->get_result();
    if ($resultProf && $resultProf->num_rows > 0) {
         $profRow = $resultProf->fetch_assoc();
         $professor_id = intval($profRow['id']);
    } else {
         echo json_encode(["success" => false, "message" => "Professor não encontrado."]);
         exit;
    }
    $stmtProf->close();
    
    // procura a tarefa na tabela "tarefas" usando o tarefa_id e o professor_id
    $stmt = $conn->prepare("SELECT titulo, descricao, data_da_tarefa, cores   AS cor FROM tarefas WHERE id = ? AND professor_id = ?");
    $stmt->bind_param("ii", $tarefa_id, $professor_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result && $result->num_rows > 0) {
         $task = $result->fetch_assoc();
         echo json_encode(["success" => true, "config" => $task]);
    } else {
         echo json_encode(["success" => false, "message" => "Tarefa não encontrada."]);
    }
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(["success" => false, "message" => "Método inválido."]);
}
?>