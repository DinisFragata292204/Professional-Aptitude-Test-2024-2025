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

$tarefa_id = isset($input['tarefa_id']) ? $input['tarefa_id'] : '';
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

// Recupera a data da tarefa (horário original)
$stmt = $conn->prepare("SELECT data_da_tarefa FROM tarefas WHERE id = ?");
$stmt->bind_param("i", $tarefa_id);
$stmt->execute();
$stmt->bind_result($data_tarefa);
$stmt->fetch();
$stmt->close();

// Verifica se já existe uma configuração para esse utilizador e tarefa
$stmt = $conn->prepare("SELECT id FROM tarefa_config WHERE user_id = ? AND tarefa_id = ?");
$stmt->bind_param("ii", $user_id, $tarefa_id);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    $stmt->bind_result($config_id);
    $stmt->fetch();
    $stmt->close();
    // Atualiza a configuração existente
    $stmt = $conn->prepare("UPDATE tarefa_config SET cor = ?, notificacao_tipo = ? WHERE id = ?");
    $stmt->bind_param("ssi", $cor, $notificacao_tipo, $config_id);
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "message" => "Erro ao atualizar configuração da tarefa."]);
        exit;
    }
    $stmt->close();
} else {
    $stmt->close();
    // Insere nova configuração
    $stmt = $conn->prepare("INSERT INTO tarefa_config (user_id, tarefa_id, cor, notificacao_tipo) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iiss", $user_id, $tarefa_id, $cor, $notificacao_tipo);
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "message" => "Erro ao salvar configuração da tarefa."]);
        exit;
    }
    $config_id = $stmt->insert_id;
    $stmt->close();
}

// Remove notificações anteriores para essa configuração
$stmt = $conn->prepare("DELETE FROM tarefa_configuracoes WHERE tarefa_config_id = ?");
$stmt->bind_param("i", $config_id);
$stmt->execute();
$stmt->close();

// Insere as novas notificações (se houver)
if (is_array($notification_times)) {
    // Inclua o novo campo data_notificacao na query
    $stmt = $conn->prepare("INSERT INTO tarefa_configuracoes (tarefa_config_id, tipo_notificacao, tempo_notificacao, data_notificacao) VALUES (?, ?, ?, ?)");
    foreach ($notification_times as $time) {
        $tipo = $notificacao_tipo;
        $tempo = $time; // Valor em minutos
        // Calcula o horário absoluto da notificação
        $notificationDatetime = date("Y-m-d H:i:s", strtotime($data_tarefa) - ($time * 60));
        $stmt->bind_param("isis", $config_id, $tipo, $tempo, $notificationDatetime);
        $stmt->execute();
    }
    $stmt->close();
}

echo json_encode(["success" => true, "message" => "Configuração da tarefa atualizada com sucesso."]);
$conn->close();
?>
