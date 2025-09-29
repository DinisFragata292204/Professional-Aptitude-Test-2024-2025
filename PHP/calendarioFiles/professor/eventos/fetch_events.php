<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Captura e decodifica os dados enviados no corpo da requisição
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($input['email'])) {
        echo json_encode(["error" => "Parâmetro 'email' é obrigatório."]);
        exit;
    }
    
    $email = $input['email'];
    
    $config = include '../../../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    if ($conn->connect_error) {
        echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
        exit;
    }
    
    // procura o user_id a partir do email
    $stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
         echo json_encode(["error" => "Utilizador não encontrado."]);
         exit;
    }
    $userRow = $result->fetch_assoc();
    $user_id = $userRow['id'];
    $stmt->close();
    
    // Obter o professor_id na tabela professores (onde user_id = $user_id)
    $stmt = $conn->prepare("SELECT id FROM professores WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
         echo json_encode(["error" => "Professor não encontrado."]);
         exit;
    }
    $professorRow = $result->fetch_assoc();
    $professor_id = $professorRow['id'];
    $stmt->close();
    
    // Procurar os eventos do professor na tabela "eventos", fazendo join com "turmas" para recuperar os campos turma e ano
    $query = "
        SELECT 
            e.id, 
            e.titulo AS title, 
            e.data_comeco AS start_datetime, 
            e.data_fim AS end_datetime, 
            e.descricao, 
            t.turma, 
            t.ano, 
            e.arquivo, 
            e.cores 
        FROM eventos e
        JOIN turmas t ON e.turma_id = t.id
        WHERE e.professor_id = ?
    ";
              
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $professor_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $events = [];
    while ($row = $result->fetch_assoc()) {
         // Verifica se há uma configuração personalizada de cor para este evento
         $overrideColor = null;
         $stmt2 = $conn->prepare("SELECT cor FROM eventos_config WHERE user_id = ? AND evento_id = ?");
         $stmt2->bind_param("ii", $user_id, $row['id']);
         $stmt2->execute();
         $result2 = $stmt2->get_result();
         if ($result2->num_rows > 0) {
             $configRow = $result2->fetch_assoc();
             $overrideColor = $configRow['cor'];
         }
         $stmt2->close();
         
         // Usa a cor da configuração se existir; caso contrário, usa a cor padrão da coluna "cores"
         $color = $overrideColor ? $overrideColor : $row['cores'];
         
         $events[] = [
             "id"             => $row['id'],
             "title"          => $row['title'],
             "start_datetime" => $row['start_datetime'],
             "end_datetime"   => $row['end_datetime'],
             "descricao"      => $row['descricao'],
             "turma"          => $row['turma'],
             "ano"            => $row['ano'],
             "arquivo"        => $row['arquivo'],
             "color"          => $color
         ];
    }
    
    echo json_encode($events);
    $stmt->close();
    $conn->close();
}
?>