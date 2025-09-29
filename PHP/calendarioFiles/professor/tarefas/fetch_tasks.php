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
    
    // Valida se o parâmetro "email" foi enviado via POST
    if (!isset($input['email'])) {
        echo json_encode([
            "success" => false,
            "message" => "Parâmetro 'email' é obrigatório."
        ]);
        exit;
    }
    
    // Recebe o email do corpo da requisição
    $userEmail = $input['email'];

    $config = include '../../../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    if ($conn->connect_error) {
        echo json_encode([
            "success" => false,
            "message" => "Não foi possível conectar à base de dados."
        ]);
        exit;
    }
    
    // Escapa o email para evitar injeção SQL
    $userEmailEscaped = $conn->real_escape_string($userEmail);
    
    $sqlUser = "SELECT id FROM dadosdoutilizador WHERE email = '$userEmailEscaped'";
    $resultUser = $conn->query($sqlUser);
    if ($resultUser && $resultUser->num_rows > 0) {
        $rowUser = $resultUser->fetch_assoc();
        $userId = $rowUser['id'];
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Utilizador não encontrado."
        ]);
        exit;
    }
    
    // procura o id do professor na tabela professores usando o user_id
    $sqlProfessor = "SELECT id FROM professores WHERE user_id = '$userId'";
    $resultProfessor = $conn->query($sqlProfessor);
    if ($resultProfessor && $resultProfessor->num_rows > 0) {
        $rowProfessor = $resultProfessor->fetch_assoc();
        $professorId = $rowProfessor['id'];
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Professor não encontrado."
        ]);
        exit;
    }
    
    // Atualização: Fazemos JOIN com a tabela 'turmas' para obter os valores de 'turma' e 'ano'
    $sqlTasks = "
    SELECT 
        t.id,
        tr.turma,
        tr.ano,
        t.titulo,
        t.descricao,
        DATE_FORMAT(t.data_da_tarefa, '%Y-%m-%d %H:%i') AS data_da_tarefa,
        t.dataDeCriacao,
        COALESCE(tc.cor, t.cores, '#47AD4D') AS cores
    FROM tarefas t
    JOIN turmas tr ON t.turma_id = tr.id
    LEFT JOIN tarefa_config tc 
         ON tc.tarefa_id = t.id AND tc.user_id = '$userId'
    WHERE t.professor_id = '$professorId'
    ";
    
    $resultTasks = $conn->query($sqlTasks);
    $tasks = [];
    if ($resultTasks) {
        while ($rowTask = $resultTasks->fetch_assoc()) {
            $tasks[] = $rowTask;
        }
        echo json_encode([
            "success" => true,
            "tasks" => $tasks
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Erro na consulta de tarefas: " . $conn->error
        ]);
    }
    
    $conn->close();
}
?>