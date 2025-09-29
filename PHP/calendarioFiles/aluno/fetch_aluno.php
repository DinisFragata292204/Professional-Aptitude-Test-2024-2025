<?php
$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

if (isset($_GET['email'])) {
    $email = $_GET['email'];
    // Consulta que faz JOIN para Procurar o aluno (por meio do user_id presente na tabela alunos)
    // e o email na tabela dadosdoutilizador, e recupera o ano e a turma da tabela turmas
    $stmt = $conn->prepare("SELECT a.id, a.user_id, t.ano, t.turma 
                            FROM alunos a
                            JOIN dadosdoutilizador d ON a.user_id = d.id
                            JOIN turmas t ON a.turma_id = t.id
                            WHERE d.email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        echo json_encode($row);
    } else {
        echo json_encode(["success" => false, "message" => "Aluno não encontrado"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Email não informado"]);
}
$conn->close();
?>
