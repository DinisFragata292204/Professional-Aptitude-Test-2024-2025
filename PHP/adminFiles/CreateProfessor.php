<?php  

session_start();

// ==================== CONFIGURAÇÃO CORS DINÂMICA ====================
$allowedOrigins = [
    'http://localhost:19006',
    'http://localhost:3000'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
error_log("[" . date('Y-m-d H:i:s') . "] Origin recebido: " . $origin);
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    error_log("[" . date('Y-m-d H:i:s') . "] Origin não permitido: " . $origin);
}
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// ==================== TRATAMENTO DE OPTIONS ====================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log("[" . date('Y-m-d H:i:s') . "] Responder à requisição OPTIONS");
    http_response_code(200);
    exit();
}

// ==================== PROCESSAMENTO DA REQUISIÇÃO POST ====================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Leitura dos dados enviados (JSON)
        $rawInput = file_get_contents("php://input");
        error_log("[" . date('Y-m-d H:i:s') . "] Raw input: " . $rawInput);
        $data = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Erro ao decodificar JSON: " . json_last_error_msg());
        }
        
        // Parâmetros obrigatórios
        $requiredParams = ['email', 'cargoUtilizador', 'disciplina', 'ano', 'turma'];
        $missingParams = [];
        foreach ($requiredParams as $param) {
            if (!isset($data[$param])) {
                $missingParams[] = $param;
            }
        }
        if (!empty($missingParams)) {
            throw new Exception("Parâmetros obrigatórios em falta: " . implode(', ', $missingParams));
        }
        
        error_log("[" . date('Y-m-d H:i:s') . "] Dados recebidos: " . print_r($data, true));
        
        // Sanitização e validação
        $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Formato de email inválido");
        }
        $cargoUtilizador = $data['cargoUtilizador'];
        if ($cargoUtilizador !== 'professor') {
            throw new Exception("Cargo inválido para este endpoint. Apenas 'professor' é permitido.");
        }
        // disciplina deve ser o ID da "disciplina" existente na base de dados
        $disciplina = (int)$data['disciplina'];
        $ano = $data['ano'];
        $turmas = $data['turma'];
        if (!is_array($turmas) || empty($turmas)) {
            throw new Exception("Formato inválido para turmas");
        }
        
        // ==================== CONEXÃO COM A BD ====================
        error_log("[" . date('Y-m-d H:i:s') . "] Conectar à base de dados...");
        $config = include '../config_api.php';
        $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
        if ($conn->connect_error) {
            throw new Exception("Erro de conexão: " . $conn->connect_error);
        }
        error_log("[" . date('Y-m-d H:i:s') . "] Conexão bem sucedida");
        
        // Verifica se já existe um "email" na tabela "dadosdoutilizador"
        $stmtCheck = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
        if (!$stmtCheck) throw new Exception("Erro na preparação (duplicidade): " . $conn->error);
        $stmtCheck->bind_param("s", $email);
        $stmtCheck->execute();
        $stmtCheck->store_result();
        if ($stmtCheck->num_rows > 0) {
            $stmtCheck->close();
            throw new Exception("O email informado já está registrado.");
        }
        $stmtCheck->close();
        
        // ==================== TRANSAÇÃO ====================
        $conn->begin_transaction();
        error_log("[" . date('Y-m-d H:i:s') . "] Iniciar a transação...");
        
        try {
            // 1. Inserir na tabela "dadosdoutilizador"
            $stmtDados = $conn->prepare("INSERT INTO dadosdoutilizador (email, cargoUtilizador, estado) VALUES (?, ?, 'pendente')");
            if (!$stmtDados) throw new Exception("Erro na preparação (dadosdoutilizador): " . $conn->error);
            $stmtDados->bind_param("ss", $email, $cargoUtilizador);
            if (!$stmtDados->execute()) throw new Exception("Erro ao executar (dadosdoutilizador): " . $stmtDados->error);
            $userId = $conn->insert_id;
            $stmtDados->close();
            error_log("[" . date('Y-m-d H:i:s') . "] Utilizador inserido. ID: $userId");
            
            // 2. Inserir na tabela "professores" (ao associar o "professor" ao "utilizador" e à "disciplina")
            $stmtProf = $conn->prepare("INSERT INTO professores (user_id, disciplina) VALUES (?, ?)");
            if (!$stmtProf) throw new Exception("Erro na preparação (professores): " . $conn->error);
            $stmtProf->bind_param("ii", $userId, $disciplina);
            if (!$stmtProf->execute()) throw new Exception("Erro ao executar (professores): " . $stmtProf->error);
            $professorId = $conn->insert_id; // Este é o id real da tabela 'professores'
            $stmtProf->close();
            error_log("[" . date('Y-m-d H:i:s') . "] Professor inserido. ID: $professorId");
            
            // 3. Inserir na tabela "professor_turmas" para cada turma selecionada
            error_log("[" . date('Y-m-d H:i:s') . "] A inserir as turmas...");
            foreach ($turmas as $turma) {
                // Procura o "id" da "turma" correspondente na tabela "turmas"
                $stmtSelectTurma = $conn->prepare("SELECT id FROM turmas WHERE ano = ? AND turma = ?");
                if (!$stmtSelectTurma) throw new Exception("Erro na preparação (sel2ect turma): " . $conn->error);
                $stmtSelectTurma->bind_param("is", $ano, $turma);
                $stmtSelectTurma->execute();
                $resultTurma = $stmtSelectTurma->get_result();
                if ($resultTurma->num_rows === 0) {
                    throw new Exception("Turma '$turma' não encontrada para o ano $ano.");
                }
                $rowTurma = $resultTurma->fetch_assoc();
                $turma_id = $rowTurma['id'];
                $stmtSelectTurma->close();

                // Inserir o "professor" na tabela "professor_turmas" utilizando o "turma_id"
                $stmtTurma = $conn->prepare("INSERT INTO professor_turmas (professor_id, turma_id) VALUES (?, ?)");
                if (!$stmtTurma) throw new Exception("Erro na preparação (professor_turmas): " . $conn->error);
                $stmtTurma->bind_param("ii", $professorId, $turma_id);
                if (!$stmtTurma->execute()) {
                    throw new Exception("Erro ao inserir turma '$turma' (turma_id: $turma_id): " . $stmtTurma->error);
                }
                $stmtTurma->close();
                error_log("[" . date('Y-m-d H:i:s') . "] Turma '$turma' inserida para o ano $ano (turma_id: $turma_id)");
            }
            
            // 4. Insere na tabela intermediária "professor_disciplinas"
            $stmtInterm = $conn->prepare("INSERT INTO professor_disciplinas (professor_id, disciplina_id) VALUES (?, ?)");
            if (!$stmtInterm) {
                throw new Exception("Erro na preparação para inserir professor_disciplinas: " . $conn->error);
            }
            $stmtInterm->bind_param("ii", $professorId, $disciplina);
            if (!$stmtInterm->execute()) {
                throw new Exception("Erro ao inserir na tabela professor_disciplinas: " . $stmtInterm->error);
            }
            $stmtInterm->close();
            
            $conn->commit();
            error_log("[" . date('Y-m-d H:i:s') . "] Transação concluída com sucesso!");
            
            echo json_encode([
                "success" => true,
                "message" => "Professor criado com sucesso",
                "data" => [
                    "user_id" => $userId,
                    "professor_id" => $professorId,
                    "turmas_count" => count($turmas)
                ]
            ]);
            
        } catch (Exception $e) {
            $conn->rollback();
            error_log("[" . date('Y-m-d H:i:s') . "] ROLLBACK: " . $e->getMessage());
            throw $e;
        }
        
        $conn->close();
        
    } catch (Exception $e) {
        error_log("[" . date('Y-m-d H:i:s') . "] ERRO GRAVE: " . $e->getMessage());
        echo json_encode([
            "success" => false,
            "message" => $e->getMessage(),
            "error_details" => [
                "file" => $e->getFile(),
                "line" => $e->getLine(),
                "trace" => $e->getTraceAsString()
            ]
        ]);
        http_response_code(400);
    }
} else {
    error_log("[" . date('Y-m-d H:i:s') . "] Método não permitido");
    echo json_encode([
        "success" => false,
        "message" => "Método não permitido"
    ]);
    http_response_code(405);
}
?>