<?php 

session_start();

// Configuração CORS 
$allowedOrigins = [
    'https://minhaapp.loca.lt', 
    'http://localhost:19006',
    'http://localhost:3000'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    error_log("[" . date('Y-m-d H:i:s') . "] Origin não permitido: " . $origin);
}
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override");
header("Content-Type: application/json");

// Tratamento de OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log("[" . date('Y-m-d H:i:s') . "] Requisição OPTIONS detectada. Responder com 200.");
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $method = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'];
    error_log("[" . date('Y-m-d H:i:s') . "] X-HTTP-Method-Override detectado: " . $method);
}
error_log("[" . date('Y-m-d H:i:s') . "] Método HTTP efetivo: " . $method);

if ($method !== 'POST') {
    error_log("[" . date('Y-m-d H:i:s') . "] Método não permitido: " . $method);
    echo json_encode(["success" => false, "message" => "Método não permitido"]);
    http_response_code(405);
    exit();
}

// Obtenção do JSON
$rawInput = file_get_contents("php://input");
error_log("[" . date('Y-m-d H:i:s') . "] Corpo bruto recebido: " . $rawInput);
$data = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("[" . date('Y-m-d H:i:s') . "] JSON inválido, tentar\$_POST");
    $data = $_POST;
}

if (empty($data)) {
    error_log("[" . date('Y-m-d H:i:s') . "] Dados não recebidos ou JSON inválido.");
    echo json_encode(["success" => false, "message" => "JSON inválido"]);
    exit();
}

// Verifica os parâmetros obrigatórios
if (!isset($data['nomeDisciplina']) || !isset($data['professorId'])) {
    error_log("[" . date('Y-m-d H:i:s') . "] Parâmetros obrigatórios ausentes.");
    echo json_encode(["success" => false, "message" => "Parâmetros 'nomeDisciplina' e 'professorId' são obrigatórios."]);
    exit();
}

$nomeDisciplina = trim($data['nomeDisciplina']);
$userId = (int)$data['professorId']; // "professorId" vem do "user_id"

// Conexão com a BD
$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("[" . date('Y-m-d H:i:s') . "] Erro de conexão: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro de conexão: " . $conn->connect_error]);
    http_response_code(500);
    exit();
}
error_log("[" . date('Y-m-d H:i:s') . "] Conexão estabelecida.");

// Se "professorId" for maior que "0", tenta Procurar o "professor"; caso contrário, ignora essa parte
if ($userId > 0) {
    $stmtProf = $conn->prepare("SELECT id FROM professores WHERE user_id = ?");
    $stmtProf->bind_param("i", $userId);
    $stmtProf->execute();
    $stmtProf->bind_result($professorId);
    if (!$stmtProf->fetch()) {
        error_log("[" . date('Y-m-d H:i:s') . "] Nenhum professor encontrado com user_id = $userId");
        echo json_encode(["success" => false, "message" => "Professor não encontrado"]);
        $stmtProf->close();
        $conn->close();
        exit();
    }
    $stmtProf->close();
    error_log("[" . date('Y-m-d H:i:s') . "] ID real do professor encontrado: $professorId");
} else {
    // Se não houver "professor" (valor 0), definimos "$professorId" como 0
    $professorId = 0;
}

// Verifica se já existe na tabela "disciplinas"
$stmt = $conn->prepare("SELECT id FROM disciplinas WHERE disciplina = ?");
$stmt->bind_param("s", $nomeDisciplina);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    error_log("[" . date('Y-m-d H:i:s') . "] Disciplina já existe: " . $nomeDisciplina);
    echo json_encode(["success" => false, "message" => "Disciplina já existe"]);
    $stmt->close();
    $conn->close();
    exit();
}
$stmt->close();

// Inicia a transação
$conn->begin_transaction();
try {
    // 1. Inserir na tabela "disciplinas"
    $stmtIns = $conn->prepare("INSERT INTO disciplinas (disciplina) VALUES (?)");
    $stmtIns->bind_param("s", $nomeDisciplina);
    $stmtIns->execute();
    $disciplinaId = $conn->insert_id;
    $stmtIns->close();
    error_log("[" . date('Y-m-d H:i:s') . "] Disciplina inserida com ID: $disciplinaId");

    // Se o "professor" foi encontrado ("professorId" > "0"), insere na tabela intermediária; se não, pode ser ignorado
    if ($professorId > 0) {
        $stmtInterm = $conn->prepare("INSERT INTO professor_disciplinas (professor_id, disciplina_id) VALUES (?, ?)");
        if (!$stmtInterm) {
            throw new Exception("Erro na preparação para inserir professor_disciplinas na : " . $conn->error);
        }
        $stmtInterm->bind_param("ii", $professorId, $disciplinaId);
        if (!$stmtInterm->execute()) {
            throw new Exception("Erro ao inserir na tabela professor_disciplinas: " . $stmtInterm->error);
        }
        $stmtInterm->close();
    }
    
    $conn->commit();
    error_log("[" . date('Y-m-d H:i:s') . "] Transação commitada com sucesso.");

    echo json_encode([
        "success" => true,
        "message" => "Disciplina criada com sucesso",
        "disciplinaId" => $disciplinaId
    ]);
} catch (Exception $e) {
    $conn->rollback();
    error_log("[" . date('Y-m-d H:i:s') . "] ERRO COMPLETO: " . print_r($e, true));
    echo json_encode([
        "success" => false,
        "message" => "Erro interno detalhado: " . $e->getMessage()
    ]);
    http_response_code(500);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>
