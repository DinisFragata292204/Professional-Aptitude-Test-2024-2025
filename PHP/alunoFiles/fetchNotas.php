<?php 
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Conecta à base de dados usando o config
$config = include 'C:\xampp\htdocs\reactNative-Backend\config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
  die(json_encode(["error" => "Não foi possível estabelecer conexão com a base de dados!"]));
}

$input = json_decode(file_get_contents("php://input"), true);
if (!isset($input['email'])) {
  echo json_encode(["error" => "Parâmetros insuficientes!"]);
  exit;
}

$email = $input['email'];

// Procura o ID do aluno na tabela "alunos", onde o user_id corresponde ao id na tabela dadosdoutilizador com email igual
$stmt = $conn->prepare("SELECT a.id FROM alunos a JOIN dadosdoutilizador d ON a.user_id = d.id WHERE d.email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
  $aluno_id = $row['id'];
} else {
  echo json_encode(["error" => "Aluno não encontrado"]);
  exit;
}
$stmt->close();

// Verifica se foi enviado o parâmetro para filtrar por disciplina
$filterDisciplina = false;
if (isset($input['disciplina_id']) && !empty($input['disciplina_id'])) {
  $filterDisciplina = true;
  $disciplina_id = $input['disciplina_id'];
}

// Consulta a tabela "notas" com JOIN nas tabelas "professores", "dadosdoutilizador" (para o professor) e "disciplinas"
// Se filtrado, adiciona a condição n.disciplina = ?
if ($filterDisciplina) {
  $stmt = $conn->prepare("
    SELECT 
      n.id AS nota_id,
      n.aluno_id,
      n.professor_id,
      d.disciplina AS disciplina_nome,
      n.data_lancamento,
      n.modulo_id,
      n.nota,
      n.comentario_privado,
      dp.email AS professor_email
    FROM notas AS n
    JOIN professores AS p ON n.professor_id = p.id
    JOIN dadosdoutilizador AS dp ON p.user_id = dp.id
    JOIN disciplinas AS d ON n.disciplina = d.id
    WHERE n.aluno_id = ? AND n.disciplina = ?
    ORDER BY n.data_lancamento DESC
  ");
  $stmt->bind_param("ii", $aluno_id, $disciplina_id);
} else {
  $stmt = $conn->prepare("
    SELECT 
      n.id AS nota_id,
      n.aluno_id,
      n.professor_id,
      d.disciplina AS disciplina_nome,
      n.data_lancamento,
      n.modulo_id,
      n.nota,
      n.comentario_privado,
      dp.email AS professor_email
    FROM notas AS n
    JOIN professores AS p ON n.professor_id = p.id
    JOIN dadosdoutilizador AS dp ON p.user_id = dp.id
    JOIN disciplinas AS d ON n.disciplina = d.id
    WHERE n.aluno_id = ?
    ORDER BY n.data_lancamento DESC
  ");
  $stmt->bind_param("i", $aluno_id);
}

$stmt->execute();
$result = $stmt->get_result();

$notas = [];
while ($row = $result->fetch_assoc()) {
  $notas[] = $row;
}

echo json_encode(["notas" => $notas]);
$conn->close();
?>
