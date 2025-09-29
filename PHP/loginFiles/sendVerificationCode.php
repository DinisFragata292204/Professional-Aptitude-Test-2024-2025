<?php
session_start();

// Cabeçalhos CORS para requisições (incluindo preflight OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    exit(0);
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Inclui as configurações
$config = include '../config_api.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

require '../vendor/autoload.php';
$sendgridApiKey = $config['sendgrid_api_key'];
$sendgrid = new \SendGrid($sendgridApiKey);

function generateAuthCode() {
    return rand(10000, 99999);
}

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Email inválido.']);
    exit;
}

$email = $data['email'];

// Verifica se o email existe na base e se a conta está pendente e sem senha
$stmt = $conn->prepare("SELECT password, estado FROM dadosdoutilizador WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Email não encontrado na base de dados.']);
    $stmt->close();
    $conn->close();
    exit;
}
$row = $result->fetch_assoc();
$password = $row['password'];
$estado = $row['estado'];
$stmt->close();

if ($estado !== 'pendente') {
    echo json_encode(['success' => false, 'message' => 'A conta não está pendente.']);
    $conn->close();
    exit;
}

if (!empty($password)) {
    echo json_encode(['success' => false, 'message' => 'A conta já possui uma password configurada.']);
    $conn->close();
    exit;
}

// Gera o novo código
$authCode = generateAuthCode();

// Insere ou atualiza o código usando upsert (garanta que a coluna email tem UNIQUE)
$stmtInsert = $conn->prepare("INSERT INTO codigosautenticacao (email, auth_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE auth_code = VALUES(auth_code), created_at = NOW()");
$stmtInsert->bind_param("ss", $email, $authCode);
$stmtInsert->execute();
$stmtInsert->close();
$conn->close();

// Monta o conteúdo do email (HTML)
$htmlContent = '
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: rgb(60, 28, 28);
                    }
                    .header {
                        font-size: 24px;
                        color: #333;
                        text-align: center;
                    }
                    .code {
                        font-size: 32px;
                        font-weight: bold;
                        color: #2a7f62;
                        text-align: center;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        font-size: 14px;
                        color: #777;
                        margin-top: 30px;
                    }
                    .copy-instructions {
                        text-align: center;
                        font-size: 16px;
                        color: #555;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                    <h3>O seu Código de Verificação</h3>
                    <p>Verificamos que está a tentar alterar a palavra-passe da sua conta na nossa aplicação.<br>Por isso enviamos abaixo um código único <strong>válido por 5 minutos</strong>!</p>
                    </div>
                    <div class="code">
                        ' . $authCode . '
                    </div>
                    <div class="copy-instructions">
                        <p>Copie o código acima e insira-o no campo de verificação.</p>
                    </div>
                    <div class="footer">
                        <p>Se não reconhece esta solicitação, pedimos que ignore este e-mail.</p>
                        <p>Com os melhores cumprimentos,<br><strong>Dinis Fragata e Rui Cotrim</strong></p>
                    </div>
                </div>
            </body>
        </html>';

$mail = new \SendGrid\Mail\Mail();
$mail->setFrom("dinisfragata.292204@etps.com.pt", "PAP de Dinis e Rui");
$mail->setSubject("Código de verificação");
$mail->addTo($email);
$mail->addContent("text/html", $htmlContent);

try {
    $sendgrid->send($mail);
    echo json_encode(['success' => true, 'message' => "Código enviado para $email com sucesso!"]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Não foi possível enviar o email. Verifique se o email está correto.']);
}
?>
