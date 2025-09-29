<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {    
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

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Email inválido.']);
        exit;
    }

    $email = $data['email'];
    $authCode = generateAuthCode();

    // 📌 Verifica se o email já existe na base de dados
    $stmt = $conn->prepare("SELECT email FROM dadosdoutilizador WHERE LOWER(email) = LOWER(?)");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows === 0) { // Email não encontrado
        echo json_encode(['success' => false, 'message' => 'Não foi possível encontrar o email fornecido na nossa base de dados.']);
        $stmt->close();
        $conn->close();
        exit;
    }

    $stmt->close();

    // 📌 Insere ou atualiza o código de autenticação
    $stmt = $conn->prepare("INSERT INTO codigosautenticacao (email, auth_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE auth_code = ?");
    $stmt->bind_param("sss", $email, $authCode, $authCode);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    // 📩 Conteúdo do e-mail
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
                        <p>Você solicitou um pedido para alterar a palavra-passe que está associada ao email ' . $email . ' na nossa aplicação.<br>Por isso, enviamos abaixo um código único <strong>válido por 5 minutos</strong>!</p>
                    </div>
                    <div class="code">
                        ' . $authCode . '
                    </div>
                    <div class="copy-instructions">
                        <p>Pedimos que copie o código acima e insira-o no campo de verificação.</p>
                    </div>
                    <div class="footer">
                        <p>Se não reconhece esta solicitação, pedimos que ignore este e-mail.</p>
                        <p>Com os melhores cumprimentos,<br><strong>Dinis Fragata e Rui Cotrim</strong></p>
                    </div>
                </div>
            </body>
        </html>';
        
    // 📩 Envio do e-mail
    $mail = new \SendGrid\Mail\Mail();
    $mail->setFrom("dinisfragata.292204@etps.com.pt", "PAP de Dinis e Rui");
    $mail->setSubject("Código de verificação");
    $mail->addTo($email);
    $mail->addContent("text/html", $htmlContent);

    try {
        $response = $sendgrid->send($mail);
        echo json_encode(['success' => true, 'message' => "Código enviado para $email com sucesso!"]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Não foi possível enviar o email.', 'error' => $e->getMessage()]);
    }
}
?>
