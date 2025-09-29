<?php
header("Content-Type: application/json");

$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Não foi possível conectar à base de dados."]);
    exit;
}

// Obtém os dados do corpo da requisição (JSON)
$input = json_decode(file_get_contents("php://input"), true);
if (!$input) {
    echo json_encode(["success" => false, "message" => "Dados não informados."]);
    exit;
}

$email = isset($input['email']) ? $input['email'] : '';
if (empty($email)) {
    echo json_encode(["success" => false, "message" => "Email não informado."]);
    exit;
}

$evento_id = isset($input['event_id']) ? $input['event_id'] : '';
$cor = isset($input['cor']) ? $input['cor'] : '';
$notificacao_tipo = isset($input['notificacao_tipo']) ? $input['notificacao_tipo'] : '';
$notification_times = isset($input['notification_times']) ? $input['notification_times'] : [];

// Recupera o user_id a partir do email na tabela dadosdoutilizador
$stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Utilizador não encontrado."]);
    exit;
}
$stmt->bind_result($user_id);
$stmt->fetch();
$stmt->close();

// Recupera a data de início do evento
$stmt = $conn->prepare("SELECT data_comeco FROM eventos WHERE id = ?");
$stmt->bind_param("i", $evento_id);
$stmt->execute();
$stmt->bind_result($data_comeco);
$stmt->fetch();
$stmt->close();

// Verifica se já existe uma configuração para esse utilizador e evento
$stmt = $conn->prepare("SELECT id FROM eventos_config WHERE user_id = ? AND evento_id = ?");
$stmt->bind_param("ii", $user_id, $evento_id);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    $stmt->bind_result($config_id);
    $stmt->fetch();
    $stmt->close();
    // Atualiza a configuração existente
    $stmt = $conn->prepare("UPDATE eventos_config SET cor = ?, notificacao_tipo = ? WHERE id = ?");
    $stmt->bind_param("ssi", $cor, $notificacao_tipo, $config_id);
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "message" => "Erro ao atualizar configuração do evento."]);
        exit;
    }
    $stmt->close();
} else {
    $stmt->close();
    // Insere nova configuração
    $stmt = $conn->prepare("INSERT INTO eventos_config (user_id, evento_id, cor, notificacao_tipo) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iiss", $user_id, $evento_id, $cor, $notificacao_tipo);
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "message" => "Erro ao salvar configuração do evento."]);
        exit;
    }
    $config_id = $stmt->insert_id;
    $stmt->close();
}

// Remove notificações anteriores para essa configuração
$stmt = $conn->prepare("DELETE FROM eventos_notificacoes WHERE evento_config_id = ?");
$stmt->bind_param("i", $config_id);
$stmt->execute();
$stmt->close();

// Insere as novas notificações (se houver)
if (is_array($notification_times)) {
    // Atualize a query para incluir o campo data_notificacao
    $stmt = $conn->prepare("INSERT INTO eventos_notificacoes (evento_config_id, tipo_notificacao, tempo_notificacao, data_notificacao) VALUES (?, ?, ?, ?)");
    foreach ($notification_times as $time) {
        $tipo = $notificacao_tipo;
        $tempo = $time; // Valor em minutos
        // Calcula o horário absoluto da notificação
        $notificationDatetime = date("Y-m-d H:i:s", strtotime($data_comeco) - ($time * 60));
        $stmt->bind_param("isis", $config_id, $tipo, $tempo, $notificationDatetime);
        $stmt->execute();
    }
    $stmt->close();
}

echo json_encode(["success" => true, "message" => "Configuração do evento atualizada com sucesso."]);
$conn->close();
?>