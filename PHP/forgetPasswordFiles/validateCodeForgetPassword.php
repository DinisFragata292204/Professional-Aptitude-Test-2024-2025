<?php
session_start();

// Trata requisições preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    exit(0);
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');
$code = trim($data['code'] ?? '');
$action = trim($data['action'] ?? 'update'); // 'resend' para reenvio, 'update' para validar código

if (empty($email)) {
    echo json_encode(["success" => false, "message" => "Email é obrigatório."]);
    exit();
}

if ($action === 'resend') {
    // Gera novo código de verificação
    $newCode = rand(10000, 99999);
    
    // Insere um novo registro na tabela de códigos
    $stmt = $conn->prepare("INSERT INTO codigosautenticacao (email, auth_code) VALUES (?, ?)");
    $stmt->bind_param("ss", $email, $newCode);
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "message" => "Erro ao gerar novo código: " . $stmt->error]);
        $stmt->close();
        $conn->close();
        exit();
    }
    $stmt->close();
    
    // Envia o novo código por e-mail utilizando SendGrid
    require '../vendor/autoload.php';
    $sendgridApiKey = $config['sendgrid_api_key'];
    $sendgrid = new \SendGrid($sendgridApiKey);
    
    $htmlContent = '
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { padding: 20px; }
          .code { font-size: 24px; font-weight: bold; color: #2a7f62; }
        </style>
      </head>
      <body>
        <div class="container">
          <p>Seu novo código de verificação é:</p>
          <p class="code">' . $newCode . '</p>
          <p>Use este código para atualizar sua senha.</p>
        </div>
      </body>
    </html>';
    
    $mail = new \SendGrid\Mail\Mail();
    $mail->setFrom("dinisfragata.292204@etps.com.pt", "PAP de Dinis e Rui");
    $mail->setSubject("Novo Código de Verificação");
    $mail->addTo($email);
    $mail->addContent("text/html", $htmlContent);
    
    try {
        $sendgrid->send($mail);
        echo json_encode(["success" => true, "message" => "Novo código enviado para $email com sucesso."]);
    } catch (Exception $e) {
        echo json_encode(["success" => false, "message" => "Erro ao enviar email: " . $e->getMessage()]);
    }
    
    $conn->close();
    exit();
} else {
    // Ação "update": valida o código e, se correto, instrui o cliente a redirecionar para "PutNewPassForgetPassword.tsx"
    if (empty($code)) {
        echo json_encode(["success" => false, "message" => "Código é obrigatório."]);
        exit();
    }
    
    // Seleciona o código mais recente para o email
    $stmt = $conn->prepare("SELECT auth_code FROM codigosautenticacao WHERE email = ? ORDER BY id DESC LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Código não encontrado."]);
        exit();
    }
    $row = $result->fetch_assoc();
    $storedCode = trim((string)$row['auth_code']);
    $stmt->close();
    
    if ($storedCode !== $code) {
        echo json_encode(["success" => false, "message" => "Código de verificação incorreto."]);
        exit();
    }
    
    // Se o código estiver correto, retorna sucesso e instrução de redirecionamento
    echo json_encode([
        "success" => true,
        "message" => "Código verificado com sucesso.",
        "redirect" => "PutNewPassForgetPassword"
    ]);
    
    $conn->close();
    exit();
}
?>
