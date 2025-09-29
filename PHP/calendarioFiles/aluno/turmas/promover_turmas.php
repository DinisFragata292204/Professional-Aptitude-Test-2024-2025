<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

session_start();

// Configuração da base de dados
$config = include '../../../config_api.php'; 
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Data de corte
$data_corte = date('m-d');
$corte_ideal = '04-15';

if ($data_corte !== $corte_ideal) {
    echo json_encode(["success" => false, "message" => "Hoje não é o dia de promoção das turmas"]);
    exit();
}

$conn->begin_transaction();

try {
    // 1. DESATIVAR TURMAS DO 12º ANO E OS RESPECTIVOS ALUNOS
    $result = $conn->query("SELECT id FROM turmas WHERE ano = 12 AND status = 'ativo'");
    $turmas_12 = [];
    while ($row = $result->fetch_assoc()) {
        $turmas_12[] = $row['id'];
    }

    if (!empty($turmas_12)) {
        $ids_turmas = implode(',', $turmas_12);
        $conn->query("UPDATE turmas SET status = 'desativado' WHERE id IN ($ids_turmas)");

        $result_users = $conn->query("SELECT user_id FROM alunos WHERE turma_id IN ($ids_turmas)");
        $user_ids = [];
        while ($row = $result_users->fetch_assoc()) {
            $user_ids[] = $row['user_id'];
        }

        if (!empty($user_ids)) {
            $ids_users = implode(',', $user_ids);
            $conn->query("UPDATE dadosdoutilizador SET estado = 'desativo' WHERE id IN ($ids_users)");
        }
    }

    // 2. PROMOVER TURMAS: 
    // Se existirem turmas de 10º ativas, promove apenas de 10 para 11.
    // Caso contrário, assume-se que já foram promovidas e processa de 11 para 12.
    $result = $conn->query("SELECT COUNT(*) as total FROM turmas WHERE ano = 10 AND status = 'ativo'");
    $row = $result->fetch_assoc();

    if ($row['total'] > 0) {
        // Promoção de 10º para 11º
        $resultado = $conn->query("SELECT * FROM turmas WHERE ano = 10 AND status = 'ativo'");
        while ($turma = $resultado->fetch_assoc()) {
            $novo_ano = 11; // Corrigido: se for 10, passar para 11
            $stmt = $conn->prepare("INSERT INTO turmas (turma, ano, status, ano_inicio, ano_fim) VALUES (?, ?, 'ativo', ?, ?)");
            $stmt->bind_param("siss", $turma['turma'], $novo_ano, $turma['ano_inicio'], $turma['ano_fim']);
            $stmt->execute();
            $nova_turma_id = $conn->insert_id;

            // Atualiza os alunos para a nova turma
            $stmt_alunos = $conn->prepare("UPDATE alunos SET turma_id = ? WHERE turma_id = ?");
            $stmt_alunos->bind_param("ii", $nova_turma_id, $turma['id']);
            $stmt_alunos->execute();

            // Desativa a turma antiga
            $stmt_desativa = $conn->prepare("UPDATE turmas SET status = 'desativado' WHERE id = ?");
            $stmt_desativa->bind_param("i", $turma['id']);
            $stmt_desativa->execute();
        }
    } else {
        // Caso não existam turmas de 10º ativas, promove turmas de 11º para 12º (como estava a funcionar corretamente)
        $resultado = $conn->query("SELECT * FROM turmas WHERE ano = 11 AND status = 'ativo'");
        while ($turma = $resultado->fetch_assoc()) {
            $novo_ano = 12;
            $stmt = $conn->prepare("INSERT INTO turmas (turma, ano, status, ano_inicio, ano_fim) VALUES (?, ?, 'ativo', ?, ?)");
            $stmt->bind_param("siss", $turma['turma'], $novo_ano, $turma['ano_inicio'], $turma['ano_fim']);
            $stmt->execute();
            $nova_turma_id = $conn->insert_id;

            // Atualiza os alunos para a nova turma
            $stmt_alunos = $conn->prepare("UPDATE alunos SET turma_id = ? WHERE turma_id = ?");
            $stmt_alunos->bind_param("ii", $nova_turma_id, $turma['id']);
            $stmt_alunos->execute();

            // Desativa a turma antiga
            $stmt_desativa = $conn->prepare("UPDATE turmas SET status = 'desativado' WHERE id = ?");
            $stmt_desativa->bind_param("i", $turma['id']);
            $stmt_desativa->execute();
        }
    }

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Promoção das turmas e atualização dos alunos concluída com sucesso"]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Erro ao atualizar as turmas ou alunos: " . $e->getMessage()]);
}
?>