<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    exit(0);
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require '../config_api.php';
$config = include '../config_api.php';
require '../vendor/autoload.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("Erro na conexão com a base de dados: " . $conn->connect_error);
    die("Erro na conexão: " . $conn->connect_error);
}

// Ícone público (para Android)
$logoURL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYMXOEhBG1zCdZEo7rOtfGEGyAsvX7AgJOlQ&s";

// Instância do SendGrid
$sendgrid = new \SendGrid($config['sendgrid_api_key']);

/**
 * Converte minutos numa string amigável (minutos, horas, dias, semanas).
 */
function convertMinutes($minutes) {
    if ($minutes < 60) {
        return $minutes . " minuto" . ($minutes > 1 ? "s" : "");
    } elseif ($minutes < 1440) { // menos de 24 horas
        $hours = floor($minutes / 60);
        return $hours . " hora" . ($hours > 1 ? "s" : "");
    } elseif ($minutes < 10080) { // menos de 7 dias
        $days = floor($minutes / 1440);
        return $days . " dia" . ($days > 1 ? "s" : "");
    } else {
        $weeks = floor($minutes / 10080);
        return $weeks . " semana" . ($weeks > 1 ? "s" : "");
    }
}

/**
 * Envia push notification via Expo.
 */
function sendExpoPushNotification($deviceToken, $title, $body, $logoURL) {
    $data = [
        "to"    => $deviceToken,
        "title" => $title,
        "body"  => $body,
        "icon"  => $logoURL,
        "data"  => ["logo" => $logoURL]
    ];
    
    $ch = curl_init("https://exp.host/--/api/v2/push/send");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_exec($ch);
    curl_close($ch);
}

/**
 * Monta o HTML para envio de e-mail (para tarefas, eventos ou aprovação).
 */
function buildEmailContent($tipo, $titulo, $tempoConvertido) {
    if ($tipo === "evento") {
        $headerTitle = "Lembrete de Evento";
        $mensagem   = "O evento cujo título é: <strong>$titulo</strong> está programado para iniciar dentro de $tempoConvertido.";
        $footerName = "Dinis Fragata e Rui Cotrim";
    } else if ($tipo === "tarefa") {
        $headerTitle = "Lembrete de Tarefa";
        $mensagem   = "A tarefa cujo título é: <strong>$titulo</strong> está programada para iniciar dentro de $tempoConvertido.";
        $footerName = "Dinis Fragata e Rui Cotrim";
    } else { // Para aprovação de conta
        $headerTitle = "Aprovação de Conta";
        $mensagem   = "A sua conta foi aprovada. Pode agora iniciar sessão.";
        $footerName = "Equipa da ETPS";
    }
    
    return '
    <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: rgb(60, 28, 28);
                    color: #333;
                }
                .container {
                    padding: 20px;
                }
                .header {
                    font-size: 24px;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 18px;
                    text-align: center;
                    margin-bottom: 30px;
                }
                .footer {
                    text-align: center;
                    font-size: 14px;
                    color: #777;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h3>' . $headerTitle . '</h3>
                </div>
                <div class="message">
                    <p>' . $mensagem . '</p>
                </div>
                <div class="footer">
                    <p>Se não reconhece esta solicitação, por favor, ignore este e-mail.</p>
                    <p>Atenciosamente,<br><strong>' . $footerName . '</strong></p>
                </div>
            </div>
        </body>
    </html>
    ';
}

/**
 * Envia E-mail via SendGrid.
 */
function sendEmail($sendgrid, $fromEmail, $fromName, $toEmail, $subject, $htmlContent) {
    $mail = new \SendGrid\Mail\Mail();
    $mail->setFrom($fromEmail, $fromName);
    $mail->setSubject($subject);
    $mail->addTo($toEmail);
    $mail->addContent("text/html", $htmlContent);
    
    try {
        $sendgrid->send($mail);
        return true;
    } catch (Exception $e) {
        error_log("DEBUG: Erro ao enviar e-mail para $toEmail: " . $e->getMessage());
        return false;
    }
}

// Data/hora atual
$now = date("Y-m-d H:i:s");

// --------------------------------------------------
//               PROCESSAMENTO DE TAREFAS
// --------------------------------------------------
$stmt = $conn->prepare("
    SELECT 
       tc.id,
       tc.tempo_notificacao,
       tc.tipo_notificacao,
       tc.data_notificacao,
       t.titulo AS titulo_tarefa,
       d.email,
       d.device_token
    FROM tarefa_configuracoes tc
    INNER JOIN tarefa_config tconf ON tc.tarefa_config_id = tconf.id
    INNER JOIN dadosdoutilizador d ON tconf.user_id = d.id
    INNER JOIN tarefas t ON tconf.tarefa_id = t.id
    WHERE tc.enviado = 0
      AND tc.data_notificacao <= ?
");
$stmt->bind_param("s", $now);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $tipo         = $row['tipo_notificacao']; // "email" ou "notificacao"
    $titulo       = $row['titulo_tarefa'] ?? "Tarefa sem título";
    $tempoNot     = (int)$row['tempo_notificacao'];
    $tempoConvertido = convertMinutes($tempoNot);
    $email        = $row['email'];
    $deviceToken  = $row['device_token'];
    $idTarefaConf = $row['id'];

    if ($tipo === "email") {
        $subject     = "Lembrete de Tarefa: $titulo";
        $htmlContent = buildEmailContent("tarefa", $titulo, $tempoConvertido);
        sendEmail($sendgrid, "dinisfragata.292204@etps.com.pt", "A tua equipa", $email, $subject, $htmlContent);
    } else if ($tipo === "notificacao") {
        $title = "Lembrete de Tarefa: $titulo";
        $body  = "A tarefa $titulo está marcada para começar em $tempoConvertido.";
        sendExpoPushNotification($deviceToken, $title, $body, $logoURL);
    }

    $update = $conn->prepare("UPDATE tarefa_configuracoes SET enviado = 1 WHERE id = ?");
    if ($update) {
        $update->bind_param("i", $idTarefaConf);
        $update->execute();
        $update->close();
    }
}
$stmt->close();

// --------------------------------------------------
//              PROCESSAMENTO DE EVENTOS
// --------------------------------------------------
$stmt = $conn->prepare("
    SELECT 
        en.id,
        en.tempo_notificacao,
        en.tipo_notificacao,
        en.data_notificacao,
        e.titulo AS titulo_evento,
        d.email,
        d.device_token,
        econf.id AS evento_config_id
    FROM eventos_notificacoes en
    INNER JOIN eventos_config econf ON en.evento_config_id = econf.id
    INNER JOIN dadosdoutilizador d ON econf.user_id = d.id
    INNER JOIN eventos e ON econf.evento_id = e.id
    WHERE en.enviado = 0
      AND en.data_notificacao <= ?
");
$stmt->bind_param("s", $now);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $tipo        = $row['tipo_notificacao'];    // "email" ou "notificacao"
    $titulo      = $row['titulo_evento'] ?? "Evento sem título";
    $tempoNot    = (int)$row['tempo_notificacao'];
    $tempoConvertido = convertMinutes($tempoNot);
    $email       = $row['email'];
    $deviceToken = $row['device_token'];
    $idEventoNot = $row['id'];

    error_log("DEBUG: A Processar evento ID: $idEventoNot | Tipo: $tipo | Título: $titulo | Tempo: $tempoNot minutos");

    if ($tipo === "email") {
        $subject     = "Lembrete de Evento: $titulo";
        $htmlContent = buildEmailContent("evento", $titulo, $tempoConvertido);
        sendEmail($sendgrid, "dinisfragata.292204@etps.com.pt", "Equipa da ETPS", $email, $subject, $htmlContent);
    } else if ($tipo === "notificacao") {
        $title = "Lembrete de Evento: $titulo";
        $body  = "O seu evento $titulo começa em $tempoConvertido.";
        sendExpoPushNotification($deviceToken, $title, $body, $logoURL);
    }

    $update = $conn->prepare("UPDATE eventos_notificacoes SET enviado = 1 WHERE id = ?");
    if ($update) {
        $update->bind_param("i", $idEventoNot);
        $update->execute();
        $update->close();
    }    
}
$stmt->close();

// --------------------------------------------------
//       PROCESSAMENTO DE APROVAÇÃO DE CONTAS
// --------------------------------------------------
$stmt = $conn->prepare("
    SELECT 
       ar.id,
       d.email,
       d.device_token,
       ar.approval_method
    FROM approval_requests ar
    INNER JOIN dadosdoutilizador d ON ar.user_id = d.id
    WHERE ar.status = 'approved' AND ar.notified = 0
");
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $approvalId = $row['id'];
    $approvalMethod = $row['approval_method'];
    $email = $row['email'];
    $deviceToken = $row['device_token'];
    
    if ($approvalMethod === "email") {
        $subject = "Aprovação de Conta";
        $htmlContent = buildEmailContent("aproval", "", ""); // Nota: ajuste o conteúdo conforme necessário
        sendEmail($sendgrid, "dinisfragata.292204@etps.com.pt", "Equipa da ETPS", $email, $subject, $htmlContent);
    } else if ($approvalMethod === "notificacao" && $deviceToken) {
        $title = "Aprovação de Conta";
        $body = "Sua conta foi aprovada. Você já pode iniciar sessão.";
        sendExpoPushNotification($deviceToken, $title, $body, $logoURL);
    }
    
    // Atualiza o registro para indicar que o utilizador já foi notificado
    $update = $conn->prepare("UPDATE approval_requests SET notified = 1 WHERE id = ?");
    if ($update) {
        $update->bind_param("i", $approvalId);
        $update->execute();
        $update->close();
    }
}
$stmt->close();

$conn->close();

echo json_encode(["success" => true, "message" => "Tudo certo, notificações enviadas quando aplicável."]);
?>