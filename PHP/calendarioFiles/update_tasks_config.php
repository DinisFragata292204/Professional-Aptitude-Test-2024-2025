<?php  
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $data = json_decode(file_get_contents("php://input"), true);
  if (!$data) {
      echo json_encode([
        "success" => false,
        "message" => "Nenhum dado enviado."
      ]);
      exit;
  }
  
  $config = include '../config_api.php';
  $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

  if ($conn->connect_error) {
      echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
      exit;
  }

  // Obtendo os dados enviados
  $tarefa_id = isset($data['tarefa_id']) ? intval($data['tarefa_id']) : 0;
  $email = isset($data['email']) ? $conn->real_escape_string($data['email']) : "";
  $cor = isset($data['cor']) ? $conn->real_escape_string($data['cor']) : "#000000";
  $descricao = isset($data['descricao']) ? $conn->real_escape_string($data['descricao']) : "";
  $notificacao_tipo = isset($data['notificacao_tipo']) ? $conn->real_escape_string($data['notificacao_tipo']) : "notificacao";
  // Para compatibilidade, podemos definir um valor padrão para tempo_notificacao, mas agora vamos usar a tabela separada
  $tempo_notificacao = 0; 
  
  if ($tarefa_id <= 0 || empty($email)) {
      echo json_encode([
        "success" => false,
        "message" => "tarefa_id ou email inválido."
      ]);
      exit;
  }
  
  // Consulta o id do utilizador na tabela dadosdoutilizador
  $userQuery = "SELECT id FROM dadosdoutilizador WHERE email = '$email' LIMIT 1";
  $userResult = $conn->query($userQuery);
  
  if ($userResult && $userResult->num_rows > 0) {
      $userRow = $userResult->fetch_assoc();
      $user_id = intval($userRow['id']);
  } else {
      echo json_encode([
        "success" => false,
        "message" => "utilizador não encontrado."
      ]);
      exit;
  }
  
  // Verifica se já existe configuração para essa tarefa e utilizador
  $checkSql = "SELECT id FROM tarefas_config WHERE tarefa_id = $tarefa_id AND user_id = $user_id";
  $result = $conn->query($checkSql);
  
  if ($result && $result->num_rows > 0) {
      // Atualiza a configuração existente
      $row = $result->fetch_assoc();
      $tarefa_config_id = intval($row['id']);
      
      $updateSql = "
        UPDATE tarefas_config 
        SET cor='$cor', descricao='$descricao', notificacao_tipo='$notificacao_tipo'
        WHERE id = $tarefa_config_id
      ";
      if ($conn->query($updateSql) !== TRUE) {
          echo json_encode([
            "success" => false,
            "message" => "Erro ao atualizar: " . $conn->error
          ]);
          exit;
      }
  } else {
      // Insere nova configuração para a tarefa e utilizador
      $insertSql = "
        INSERT INTO tarefas_config (tarefa_id, user_id, cor, descricao, notificacao_tipo, tempo_notificacao) 
        VALUES ($tarefa_id, $user_id, '$cor', '$descricao', '$notificacao_tipo', $tempo_notificacao)
      ";
      if ($conn->query($insertSql) === TRUE) {
          $tarefa_config_id = $conn->insert_id;
      } else {
          echo json_encode([
            "success" => false,
            "message" => "Erro ao inserir: " . $conn->error
          ]);
          exit;
      }
  }
  
  // Agora, tratamos os múltiplos tempos de notificação
  // Remove notificações antigas, caso esteja atualizando
  $conn->query("DELETE FROM tarefas_notificacoes WHERE tarefa_config_id = $tarefa_config_id");
  
  if (isset($data['notification_times']) && is_array($data['notification_times'])) {
    foreach ($data['notification_times'] as $tempo) {
      $tempo = intval($tempo);
      $insertNotifSql = "INSERT INTO tarefas_notificacoes (tarefa_config_id, tempo_notificacao) VALUES ($tarefa_config_id, $tempo)";
      $conn->query($insertNotifSql);
    }
  }
  
  echo json_encode([
    "success" => true,
    "message" => "Configuração da tarefa salva/atualizada com notificações múltiplas."
  ]);
  
  $conn->close();
}
?>