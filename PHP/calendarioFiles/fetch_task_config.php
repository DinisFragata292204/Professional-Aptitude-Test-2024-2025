<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Verifica se os parâmetros necessários foram enviados
    if (!isset($_GET['tarefa_id']) || !isset($_GET['email'])) {
        echo json_encode(["success" => false, "message" => "Parâmetros em falta."]);
        exit;
    }
    
    $tarefa_id = intval($_GET['tarefa_id']);
    $email = $_GET['email'];
    
    // Conecta ao base de dados
    $config = include '../config_api.php';
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
        echo json_encode(["success" => false, "message" => "utilizador não encontrado."]);
        exit;
    }
    
    // Consulta a configuração da tarefa para esse utilizador
    $configQuery = "SELECT id, cor, descricao, notificacao_tipo FROM tarefas_config WHERE tarefa_id = $tarefa_id AND user_id = $user_id LIMIT 1";
    $configResult = $conn->query($configQuery);
    if ($configResult && $configResult->num_rows > 0) {
        $configRow = $configResult->fetch_assoc();
        $tarefa_config_id = intval($configRow['id']);
        
        // procura os tempos de notificação na tabela separada
        $notifTimes = [];
        $notifQuery = "SELECT tempo_notificacao FROM tarefas_notificacoes WHERE tarefa_config_id = $tarefa_config_id";
        $notifResult = $conn->query($notifQuery);
        if ($notifResult && $notifResult->num_rows > 0) {
            while ($row = $notifResult->fetch_assoc()) {
                $notifTimes[] = intval($row['tempo_notificacao']);
            }
        }
        
        $configData = [
            "cor" => $configRow['cor'],
            "descricao" => $configRow['descricao'],
            "notificacao_tipo" => $configRow['notificacao_tipo'],
            "notification_times" => $notifTimes
        ];
        
        echo json_encode(["success" => true, "config" => $configData]);
    } else {
        echo json_encode(["success" => false, "message" => "Configuração não encontrada para esta tarefa."]);
    }
    
    $conn->close();
} else {
    echo json_encode(["success" => false, "message" => "Método inválido."]);
}
?>