<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

// conexão
$config = include '../config_api.php';
$conn = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    echo json_encode([
      "success" => false,
      "message" => "Erro de conexão: " . $conn->connect_error
    ]);
    exit();
}

// ler payload
$data    = json_decode(file_get_contents('php://input'), true);
$ano     = intval($data['ano']   ?? 0);
$turma   = preg_replace('/[^A-Za-z]/','', strtoupper($data['turma'] ?? ''));
$alunos  = isset($data['alunos']) && is_array($data['alunos'])
            ? array_map('intval', $data['alunos'])
            : [];

// validações básicas
if ($ano < 10 || $ano > 12 || $turma === '') {
    http_response_code(400);
    echo json_encode([
      'success'=>false,
      'message'=>'Ano ou turma inválidos'
    ]);
    exit;
}

// calcula início do ano letivo atual (set-dez => mesmo ano; jan-ago => ano anterior)
$hoje            = new DateTimeImmutable('now');
$mes             = intval($hoje->format('n'));
$anoCivil        = intval($hoje->format('Y'));
$anoLetivoInicio = ($mes >= 9) ? $anoCivil : ($anoCivil - 1);

// define o período conforme o ano da turma
if ($ano === 12) {
    // 12º ano: entrou há 2 anos letivos, termina no próximo ano letivo
    $anoInicio = $anoLetivoInicio - 2;
    $anoFim    = $anoLetivoInicio + 1;

    $stmt = $conn->prepare(
      "INSERT INTO turmas 
         (ano, turma, status, ano_inicio, ano_fim) 
       VALUES (?, ?, 'ativo', ?, ?)"
    );
    $stmt->bind_param(
      'isii',
      $ano,
      $turma,
      $anoInicio,
      $anoFim
    );

} elseif ($ano === 11) {
    // 11º ano: entrou há 1 ano letivo, termina daqui a 2 anos letivos
    $anoInicio = $anoLetivoInicio - 1;
    $anoFim    = $anoLetivoInicio + 2;

    $stmt = $conn->prepare(
      "INSERT INTO turmas 
         (ano, turma, status, ano_inicio, ano_fim) 
       VALUES (?, ?, 'ativo', ?, ?)"
    );
    $stmt->bind_param(
      'isii',
      $ano,
      $turma,
      $anoInicio,
      $anoFim
    );

} else {
    // 10º ano: turma nova — só ano e turma
    $stmt = $conn->prepare(
      "INSERT INTO turmas 
         (ano, turma, status) 
       VALUES (?, ?, 'ativo')"
    );
    $stmt->bind_param('is', $ano, $turma);
}

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
      'success'=>false,
      'message'=>'Erro ao criar turma'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

$newTurmaId = $stmt->insert_id;
$stmt->close();

// Se houver alunos para associar
if (!empty($alunos)) {
    $upd = $conn->prepare(
      "UPDATE alunos SET turma_id = ? WHERE id = ?"
    );
    foreach ($alunos as $alunoId) {
        $upd->bind_param('ii', $newTurmaId, $alunoId);
        $upd->execute();
    }
    $upd->close();
}

// resposta
echo json_encode([
  'success' => true,
  'turma'   => [
    'id'         => $newTurmaId,
    'ano'        => $ano,
    'turma'      => $turma,
    'ano_inicio' => ($ano >= 11 ? $anoInicio : null),
    'ano_fim'    => ($ano >= 11 ? $anoFim    : null)
  ]
]);

$conn->close();
?>