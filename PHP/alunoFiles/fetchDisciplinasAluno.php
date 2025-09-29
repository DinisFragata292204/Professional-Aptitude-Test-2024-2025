<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Verifica se o método utilizado é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método inválido"]);
    exit();
}

// Captura os dados do request
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['email'])) {
    echo json_encode(["success" => false, "message" => "Email não fornecido"]);
    exit();
}

$email = $data['email'];
$config = include '../config_api.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// 1. Procura o "aluno" na tabela "dadosdoutilizador" (garantindo cargo "aluno" e estado "ativo")
$stmt = $conn->prepare("SELECT id, email FROM dadosdoutilizador WHERE email = ? AND cargoUtilizador = 'aluno' AND estado = 'ativo' LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Aluno não encontrado"]);
    exit();
}
$aluno = $result->fetch_assoc();
$aluno_id = $aluno['id'];
$stmt->close();

// 2. Procurar os dados adicionais do "aluno" através de um JOIN entre "alunos" e "turmas" utilizando o campo "turma_id"
$stmt = $conn->prepare("
    SELECT turmas.ano, turmas.turma 
    FROM alunos 
    INNER JOIN turmas ON alunos.turma_id = turmas.id 
    WHERE alunos.user_id = ? 
    LIMIT 1
");
$stmt->bind_param("i", $aluno_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Detalhes do aluno não encontrados na tabela alunos"]);
    exit();
}
$aluno_detalhes = $result->fetch_assoc();
$stmt->close();

// 3. Procura todos os professores "ativos" na tabela "dadosdoutilizador"
$stmt = $conn->prepare("SELECT id, email FROM dadosdoutilizador WHERE cargoUtilizador = 'professor' AND estado = 'ativo'");
$stmt->execute();
$result = $stmt->get_result();
$professores = [];
while ($row = $result->fetch_assoc()) {
    $professores[] = $row;
}
$stmt->close();

// 4. Para cada professor, obtem a disciplina associada (na tabela "professores") e procura o nome da disciplina na tabela disciplinas
$disciplinas_professor = [];
foreach ($professores as $prof) {
    $prof_id = $prof['id'];
    $prof_email = $prof['email'];

    // Consulta na tabela "professores" utilizando o "id" do "professor" (como user_id)
    $stmt = $conn->prepare("SELECT disciplina FROM professores WHERE user_id = ?");
    $stmt->bind_param("i", $prof_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $prof_data = $result->fetch_assoc();
        $disciplina_id = $prof_data['disciplina'];
        $stmt->close();

        // Consulta na tabela "disciplinas" para obter o nome da disciplina
        $stmt = $conn->prepare("SELECT disciplina FROM disciplinas WHERE id = ?");
        $stmt->bind_param("i", $disciplina_id);
        $stmt->execute();
        $result_disc = $stmt->get_result();
        if ($result_disc->num_rows > 0) {
            $disc_data = $result_disc->fetch_assoc();
            $disc_nome = $disc_data['disciplina'];

            // Armazena os dados para a resposta
            $disciplinas_professor[] = [
                "professor_email" => $prof_email,
                "disciplina_id" => $disciplina_id,
                "disciplina_nome" => $disc_nome
            ];
        }
        $stmt->close();
    } else {
        $stmt->close();
    }
}

// 5. Preparar a resposta combinando os dados do aluno (incluindo ano e turma) e as disciplinas encontradas
$response = [
    "success" => true,
    "aluno" => array_merge($aluno, $aluno_detalhes),
    "disciplinas_professores" => $disciplinas_professor
];

$conn->close();
echo json_encode($response);
?>