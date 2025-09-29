<?php  
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Ler e decodificar o JSON do corpo da requisição
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['email'])) {
    echo json_encode(["error" => "Parâmetro 'email' é obrigatório."]);
    exit;
}

$email = $data['email'];

$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["error" => "Não foi possível conectar à base de dados."]);
    exit;
}

// Procurar o ID do utilizador a partir do email
$stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["error" => "Utilizador não encontrado."]);
    exit;
}
$userRow = $result->fetch_assoc();
$user_id = $userRow['id'];
$stmt->close();

// Procurar turma e ano do aluno com JOIN na tabela turmas
$stmt = $conn->prepare("SELECT t.turma, t.ano, t.id AS turma_id 
                        FROM alunos a 
                        JOIN turmas t ON a.turma_id = t.id 
                        WHERE a.user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["error" => "Aluno não encontrado."]);
    exit;
}
$turmaRow = $result->fetch_assoc();
$turma = $turmaRow['turma'];
$ano = $turmaRow['ano'];
$turma_id = $turmaRow['turma_id'];
$stmt->close();

// Procurar os eventos filtrando por turma_id, mas mantendo no retorno os campos turma e ano via JOIN na tabela turmas
$query = "SELECT 
            e.id,
            e.professor_id,
            e.titulo AS title,
            e.data_comeco AS start_datetime,
            e.data_fim AS end_datetime,
            e.descricao,
            t.turma,
            t.ano,
            e.arquivo,
            e.cores
          FROM eventos e
          JOIN turmas t ON e.turma_id = t.id
          WHERE e.turma_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $turma_id);
$stmt->execute();
$result = $stmt->get_result();

$events = [];
while ($row = $result->fetch_assoc()) {
    // Se existir um professor_id, Procurar o email do professor correspondente
    if (!empty($row['professor_id'])) {
        $stmt2 = $conn->prepare("SELECT email FROM dadosdoutilizador WHERE id = (SELECT user_id FROM professores WHERE id = ?)");
        $stmt2->bind_param("i", $row['professor_id']);
        $stmt2->execute();
        $result2 = $stmt2->get_result();
        if ($result2->num_rows > 0) {
            $professorRow = $result2->fetch_assoc();
            $row['professor_email'] = $professorRow['email'];
        } else {
            $row['professor_email'] = null;
        }
        $stmt2->close();
    } else {
        $row['professor_email'] = null;
    }
    
    // Verificar se há configuração de cor para este evento na tabela eventos_config para o utilizador atual
    $stmt3 = $conn->prepare("SELECT cor FROM eventos_config WHERE evento_id = ? AND user_id = ?");
    $stmt3->bind_param("ii", $row['id'], $user_id);
    $stmt3->execute();
    $result3 = $stmt3->get_result();
    if ($result3->num_rows > 0) {
        $configRow = $result3->fetch_assoc();
        // Se existir, substitui a cor padrão pela cor definida na configuração
        $row['cores'] = $configRow['cor'];
    }
    $stmt3->close();
    
    $events[] = $row;
}

echo json_encode($events);
$stmt->close();
$conn->close();
?>