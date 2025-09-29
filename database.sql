-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 01-Jun-2025 às 19:46
-- Versão do servidor: 10.4.32-MariaDB
-- versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `aplicacaoetps`
--

-- --------------------------------------------------------

--
-- Estrutura da tabela `almocos`
--

CREATE TABLE `almocos` (
  `id` int(11) NOT NULL,
  `dia` date NOT NULL,
  `sopa` varchar(255) DEFAULT NULL,
  `prato_principal` varchar(255) DEFAULT NULL,
  `sobremesa` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `almocos`
--

INSERT INTO `almocos` (`id`, `dia`, `sopa`, `prato_principal`, `sobremesa`) VALUES
(3, '2025-05-14', 'sopa de legumes', 'frango', 'banana'),
(4, '2025-05-13', 'legumes', 'frango', 'banana'),
(5, '2025-05-15', 'Sopa de peixe', 'Arroz com atum', 'Gelatina'),
(7, '2025-05-20', 'Canga', 'Arroz de aves ', 'Gelatina'),
(10, '2025-05-22', 'Febra', 'Cnaga', 'Fruta da época'),
(11, '2025-05-16', 'Canja', 'Febra', 'Pudim');

-- --------------------------------------------------------

--
-- Estrutura da tabela `alunos`
--

CREATE TABLE `alunos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `turma_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `alunos`
--

INSERT INTO `alunos` (`id`, `user_id`, `turma_id`) VALUES
(10, 83, 1),
(13, 109, 1),
(18, 137, 1),
(33, 155, 1),
(35, 157, 1),
(36, 158, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `approval_requests`
--

CREATE TABLE `approval_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `approval_method` enum('email','notification') NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `notified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `approval_requests`
--

INSERT INTO `approval_requests` (`id`, `user_id`, `approval_method`, `status`, `notified`, `created_at`, `updated_at`) VALUES
(2, 83, 'notification', 'approved', 1, '2025-03-29 20:48:49', '2025-03-29 21:20:20'),
(3, 85, 'notification', 'pending', 0, '2025-03-30 13:30:21', '2025-03-30 13:30:21');

-- --------------------------------------------------------

--
-- Estrutura da tabela `calendarios`
--

CREATE TABLE `calendarios` (
  `id` int(11) NOT NULL,
  `turma_id` int(11) DEFAULT NULL,
  `pdf` longblob NOT NULL,
  `data_de_upload` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `calendarios`
--

INSERT INTO `calendarios` (`id`, `turma_id`, `pdf`, `data_de_upload`) VALUES
(6, 1, 0x313734333032333232345f33c2ba20412e706466, '2025-03-26 22:07:04'),
(7, 1, 0x313734343731373137375f332d20412e706466, '2025-04-15 12:39:37');

-- --------------------------------------------------------

--
-- Estrutura da tabela `codigosautenticacao`
--

CREATE TABLE `codigosautenticacao` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `auth_code` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `codigosautenticacao`
--

INSERT INTO `codigosautenticacao` (`id`, `email`, `auth_code`, `created_at`) VALUES
(53, 'dinisfragata.292204@etps.com.pt', 40899, '2025-03-12 12:53:17'),
(67, 'ruicotrim.292209@etps.com.pt', 58784, '2025-03-26 20:11:50'),
(98, 'telmo@etps.com.pt', 78995, '2025-03-20 19:44:22'),
(106, 'miguelrui@etps.com.pt', 52800, '2025-03-29 16:10:17'),
(111, 'Dinifragata@etps.com.pt', 26272, '2025-03-30 13:29:24'),
(112, '1239@etps.com.pt', 90717, '2025-04-16 08:34:53'),
(114, 'telmomartins42@etps.com.pt', 12811, '2025-04-08 08:31:33'),
(116, 'dinisfragata@etps.com.pt', 47802, '2025-04-09 08:05:40'),
(148, 'cao@etps.com.pt', 68260, '2025-04-09 19:14:29'),
(149, 'aux@etps.com.pt', 77737, '2025-04-09 19:19:28'),
(151, 'admeopai@etps.com.pt', 74107, '2025-04-09 19:39:19'),
(155, 'rui1@etps.com.pt', 88573, '2025-04-17 13:17:18'),
(156, 'rui2@etps.com.pt', 81238, '2025-04-17 13:23:07'),
(157, 'rui3@etps.com.pt', 15783, '2025-04-17 13:36:50'),
(158, 'rui4@etps.com.pt', 95893, '2025-04-17 13:47:44'),
(159, 'rui5@etps.com.pt', 19734, '2025-04-17 13:51:08'),
(160, 'rui6@etps.com.pt', 89281, '2025-04-17 13:54:33'),
(161, 'rui7@etps.com.pt', 44267, '2025-04-17 13:57:49'),
(162, 'rui8@etps.com.pt', 79385, '2025-04-17 14:05:07'),
(163, 'rui9@etps.com.pt', 17958, '2025-04-17 14:07:45'),
(164, 'rui10@etps.com.pt', 73827, '2025-04-17 14:13:36'),
(165, 'rui11@etps.com.pt', 29619, '2025-04-17 14:28:04'),
(204, 'df@etps.com.pt', 90118, '2025-04-20 11:12:57'),
(220, 'kkk@etps.com.pt', 10373, '2025-04-20 18:58:47'),
(243, 'apagaoprof@etps.com.pt', 95141, '2025-04-20 19:35:34'),
(273, 'antonio@etps.com.pt', 56905, '2025-04-26 14:15:44'),
(277, 'dinis@etps.com.pt', 74894, '2025-05-05 15:09:02');

-- --------------------------------------------------------

--
-- Estrutura da tabela `dadosdoutilizador`
--

CREATE TABLE `dadosdoutilizador` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `cargoUtilizador` enum('aluno','professor','aEsperaParaAluno','admin','auxiliar') NOT NULL,
  `estado` enum('ativo','pendente','desativo') NOT NULL DEFAULT 'pendente',
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `device_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `dadosdoutilizador`
--

INSERT INTO `dadosdoutilizador` (`id`, `email`, `password`, `cargoUtilizador`, `estado`, `data_criacao`, `device_token`) VALUES
(6, 'professor@etps.com.pt', '$2y$10$YyZYiiRcbQmEP8B9B8y7GeZH90DkKxj5uEur22gSVj.dSe.6qpUPi', 'professor', 'ativo', '2025-03-02 11:37:54', NULL),
(37, 'ruicotrim.292209@etps.com.pt', '$2y$10$upJ0WcalvE0p1TRyBa6YpeYtMb54TsOhyGE4Ea98vT4u5MYZYRcYC', 'admin', 'ativo', '2025-03-02 11:37:54', NULL),
(83, 'aluno@etps.com.pt', '$2y$10$/SObyX9S5ws.lrjYe3ZrW.FGt6/U9Ry9wiEJcV67Pzr8QJ1v.RLTe', 'aluno', 'ativo', '2025-03-29 20:47:10', 'ExponentPushToken[CE3G_DJEOWsWtF8ZXUCvgO]'),
(85, 'maria@etps.com.pt', '$2y$10$BpJkPtaRnV9TwnwaqPq0huidA4srjGyMHq1dblsCLvc/YtlfGr01C', 'aluno', 'ativo', '2025-03-30 13:29:43', ''),
(86, 'auxiliar@etps.com.pt', '$2y$10$ruAKbGYQrIONO2eLtJTt7ev3111RD7/UausaxyE3HxE2M1GKkZAzq', 'auxiliar', 'ativo', '2025-04-01 17:13:08', NULL),
(87, 'manuel@etps.com.pt', '$2y$10$t.cOBhj4Qd5zvTkXaljgGe9E/ctMTymrVIE8JjfJn3wyKfvd9UXiC', 'professor', 'ativo', '2025-04-07 14:14:50', NULL),
(93, 'administrador@etps.com.pt', '$2y$10$ifq10s2UInRO3LAcNvx.e.o4UYMS.R5uRz2bwtyNpn8QokhvdpqiC', 'admin', 'ativo', '2025-04-09 19:18:47', NULL),
(108, 'joaquim@etps.com.pt', '$2y$10$wTCWd1iSzta5UQB8IK8HJu3IaFt1EW/XJPloePD78pRo5FY7vbFgi', 'aluno', 'pendente', '2025-04-17 14:14:24', NULL),
(109, 'joao@etps.com.pt', '$2y$10$KqsFR9WUFzqQ5dWyDJHc9Ob9Q.mFim3IWNafuVupdfrwV.I06H47O', 'aluno', 'pendente', '2025-04-17 14:28:24', NULL),
(137, 'antonio@etps.com.pt', '$2y$10$V/bCbtYOFbpS/pdX6gd3VOMCsr0KhS638i95UdyWI5bfPEKaPfdgy', 'aluno', 'ativo', '2025-04-26 14:16:15', NULL),
(155, 'camponeses@etps.com.pt', '$2y$10$ZQ.sT9Q/8BbectGZMxFyj.w3DrSskDyitaDhd8daDOhm5HxzBa1n2', 'aluno', 'ativo', '2025-05-05 11:23:26', NULL),
(157, 'dinisfragata.292204@etps.com.pt', '$2y$10$1scpGiy4Y0YaAgYw6hb7vuDigbotnJnSUJG1lDlbFWDTVFHldCuq.', 'aluno', 'ativo', '2025-05-05 14:33:12', NULL),
(158, 'dinis@etps.com.pt', '', 'aluno', 'pendente', '2025-05-05 14:38:55', NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `disciplinas`
--

CREATE TABLE `disciplinas` (
  `id` int(11) NOT NULL,
  `disciplina` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `disciplinas`
--

INSERT INTO `disciplinas` (`id`, `disciplina`) VALUES
(1, 'Matemática'),
(2, 'Português'),
(3, 'História'),
(4, 'Ciências'),
(5, 'Geografia'),
(6, 'Linguagens de Programação'),
(7, 'Italiano'),
(8, 'Espanhol'),
(30, 'Visual studio'),
(31, 'Alemáo'),
(32, 'Estudo do Meio');

-- --------------------------------------------------------

--
-- Estrutura da tabela `entradasesaidas`
--

CREATE TABLE `entradasesaidas` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `data_do_registo` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo` enum('entrada','saida') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `entradasesaidas`
--

INSERT INTO `entradasesaidas` (`id`, `user_id`, `data_do_registo`, `tipo`) VALUES
(4, 83, '2025-04-07 14:39:01', 'entrada'),
(5, 83, '2025-04-07 14:39:08', 'saida'),
(6, 83, '2025-04-08 10:19:57', 'entrada'),
(7, 83, '2025-04-11 18:21:17', 'entrada'),
(8, 83, '2025-04-11 18:21:43', 'saida'),
(9, 83, '2025-04-11 19:00:12', 'entrada'),
(10, 83, '2025-04-11 19:01:05', 'saida'),
(11, 83, '2025-04-11 19:01:34', 'entrada'),
(12, 83, '2025-05-01 10:30:36', 'entrada'),
(16, 83, '2025-05-04 07:52:42', 'entrada'),
(17, 83, '2025-05-04 07:54:03', 'saida'),
(18, 83, '2025-05-04 07:54:28', 'entrada');

-- --------------------------------------------------------

--
-- Estrutura da tabela `eventos`
--

CREATE TABLE `eventos` (
  `id` int(11) NOT NULL,
  `professor_id` int(11) NOT NULL,
  `turma_id` int(11) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `data_comeco` datetime NOT NULL,
  `data_fim` datetime NOT NULL,
  `descricao` text DEFAULT NULL,
  `data_criacaoDoEvento` timestamp NOT NULL DEFAULT current_timestamp(),
  `arquivo` varchar(255) DEFAULT NULL,
  `cores` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `eventos`
--

INSERT INTO `eventos` (`id`, `professor_id`, `turma_id`, `titulo`, `data_comeco`, `data_fim`, `descricao`, `data_criacaoDoEvento`, `arquivo`, `cores`, `updated_at`) VALUES
(14, 13, 1, 'Teste de inglês', '2025-05-06 15:05:00', '2025-05-06 17:15:00', 'Estudar da página 15 à 87', '2025-04-12 15:20:46', NULL, '#DC143C', '2025-05-05 09:33:10'),
(15, 1, 1, 'Trabalho de matemática', '2025-05-07 16:10:00', '2025-05-07 17:15:00', 'Fazer o exercício 1, 2 e 4 da página 47', '2025-04-27 16:14:03', NULL, '#20B2AA', '2025-05-05 09:34:02'),
(16, 1, 1, 'Teste para a PAP', '2025-05-02 08:30:00', '2025-05-02 11:55:00', '', '2025-05-01 10:33:39', NULL, '#4682B4', '2025-05-05 09:34:54');

-- --------------------------------------------------------

--
-- Estrutura da tabela `eventos_config`
--

CREATE TABLE `eventos_config` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `evento_id` int(11) NOT NULL,
  `cor` varchar(10) NOT NULL,
  `notificacao_tipo` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `eventos_config`
--

INSERT INTO `eventos_config` (`id`, `user_id`, `evento_id`, `cor`, `notificacao_tipo`, `created_at`, `updated_at`) VALUES
(3, 5, 2, '#007AFF', 'notificacao', '2025-03-08 11:31:23', '2025-03-08 12:14:27'),
(4, 5, 2, '#FFCC00', 'notificacao', '2025-03-08 14:59:23', '2025-03-22 07:41:51'),
(5, 5, 9, '#DC143C', 'notificacao', '2025-03-27 20:30:35', '2025-03-27 20:30:35'),
(6, 83, 14, '#9932CC', 'notificacao', '2025-04-27 11:34:22', '2025-04-27 11:34:22');

-- --------------------------------------------------------

--
-- Estrutura da tabela `eventos_notificacoes`
--

CREATE TABLE `eventos_notificacoes` (
  `id` int(11) NOT NULL,
  `evento_config_id` int(11) NOT NULL,
  `tipo_notificacao` varchar(20) NOT NULL,
  `tempo_notificacao` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `data_notificacao` datetime DEFAULT NULL,
  `enviado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `eventos_notificacoes`
--

INSERT INTO `eventos_notificacoes` (`id`, `evento_config_id`, `tipo_notificacao`, `tempo_notificacao`, `created_at`, `updated_at`, `data_notificacao`, `enviado`) VALUES
(6, 4, 'notificacao', 4, '2025-03-08 15:43:08', '2025-03-22 08:04:13', '2025-03-22 08:04:00', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `modulos`
--

CREATE TABLE `modulos` (
  `id` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `numero_do_modulo` int(11) NOT NULL,
  `disciplina` int(11) NOT NULL,
  `ano_em_que_e_lecionado` int(11) NOT NULL,
  `ano_de_lecionacao` year(4) DEFAULT year(curdate()),
  `turma_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `modulos`
--

INSERT INTO `modulos` (`id`, `nome`, `numero_do_modulo`, `disciplina`, `ano_em_que_e_lecionado`, `ano_de_lecionacao`, `turma_id`) VALUES
(1, 'Estatistica', 1, 1, 12, '2025', 1),
(3, 'Algoritmos', 1, 1, 12, '2025', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `notas`
--

CREATE TABLE `notas` (
  `id` int(11) NOT NULL,
  `aluno_id` int(11) NOT NULL,
  `professor_id` int(11) NOT NULL,
  `disciplina` int(11) NOT NULL,
  `modulo_id` int(11) NOT NULL,
  `nota` decimal(5,2) DEFAULT NULL,
  `data_lancamento` timestamp NOT NULL DEFAULT current_timestamp(),
  `comentario_privado` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `notas`
--

INSERT INTO `notas` (`id`, `aluno_id`, `professor_id`, `disciplina`, `modulo_id`, `nota`, `data_lancamento`, `comentario_privado`) VALUES
(5, 10, 1, 5, 1, 12.00, '2025-04-05 12:45:00', 'Faltou em algumas aulas'),
(6, 10, 1, 6, 1, 14.00, '2025-04-06 07:30:00', 'Participativo'),
(7, 10, 1, 7, 1, 11.00, '2025-04-07 14:10:00', 'Bom raciocínio'),
(8, 10, 1, 8, 1, 18.00, '2025-04-08 09:50:00', 'Ótimo desempenho'),
(9, 10, 1, 1, 1, 16.00, '2025-04-09 11:00:00', 'Precisa praticar mais'),
(10, 10, 1, 2, 1, 17.00, '2025-04-10 15:20:00', 'Trabalhos bem feitos');

-- --------------------------------------------------------

--
-- Estrutura da tabela `personalizacao_utilizador`
--

CREATE TABLE `personalizacao_utilizador` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `background_user` varchar(255) DEFAULT '',
  `tema_user` varchar(50) DEFAULT 'light'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Extraindo dados da tabela `personalizacao_utilizador`
--

INSERT INTO `personalizacao_utilizador` (`id`, `user_id`, `background_user`, `tema_user`) VALUES
(2, 83, 'uploads/backgrounds/background_83_1748797002.jpg', 'dark'),
(3, 6, 'uploads/backgrounds/background_6_1744900736.jpg', 'light'),
(4, 93, 'uploads/backgrounds/background_93_1744444919.jpg', 'light'),
(5, 37, 'assets/images/bg1.jpg', 'dark'),
(6, 155, 'uploads/backgrounds/background_155_1746445808.jpg', 'light');

-- --------------------------------------------------------

--
-- Estrutura da tabela `preferencias_notificacoes`
--

CREATE TABLE `preferencias_notificacoes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `todas_notificacoes` enum('Sim','Não') DEFAULT NULL,
  `notificacoes_tarefas` enum('Sim','Não') DEFAULT NULL,
  `notificacoes_eventos` enum('Sim','Não') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_notificacao` enum('notificacao','email') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `professores`
--

CREATE TABLE `professores` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `disciplina` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `professores`
--

INSERT INTO `professores` (`id`, `user_id`, `disciplina`) VALUES
(1, 6, 1),
(13, 87, 7);

-- --------------------------------------------------------

--
-- Estrutura da tabela `professor_disciplinas`
--

CREATE TABLE `professor_disciplinas` (
  `id` int(11) NOT NULL,
  `professor_id` int(11) NOT NULL,
  `disciplina_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `professor_disciplinas`
--

INSERT INTO `professor_disciplinas` (`id`, `professor_id`, `disciplina_id`) VALUES
(9, 1, 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `professor_turmas`
--

CREATE TABLE `professor_turmas` (
  `id` int(11) NOT NULL,
  `professor_id` int(11) NOT NULL,
  `turma_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `professor_turmas`
--

INSERT INTO `professor_turmas` (`id`, `professor_id`, `turma_id`) VALUES
(3, 1, 1),
(7, 1, 2),
(14, 13, 1),
(15, 13, 2);

-- --------------------------------------------------------

--
-- Estrutura da tabela `quem_almoca`
--

CREATE TABLE `quem_almoca` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `turma_id` int(11) DEFAULT NULL,
  `dia` date NOT NULL,
  `avaliacao` tinyint(3) UNSIGNED DEFAULT NULL COMMENT '0 a 5, avaliação geral',
  `opiniao` text DEFAULT NULL COMMENT 'Comentário opcional',
  `feedback_timestamp` datetime DEFAULT NULL COMMENT 'Quando deu feedback'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `quem_almoca`
--

INSERT INTO `quem_almoca` (`id`, `user_id`, `turma_id`, `dia`, `avaliacao`, `opiniao`, `feedback_timestamp`) VALUES
(8, 83, 1, '2025-05-18', NULL, NULL, NULL),
(9, 83, 1, '2025-04-22', NULL, NULL, NULL),
(10, 83, 1, '2025-04-11', NULL, NULL, NULL),
(11, 83, 1, '2025-04-10', NULL, NULL, NULL),
(12, 83, 1, '2025-04-09', NULL, NULL, NULL),
(16, 6, NULL, '2025-04-25', NULL, NULL, NULL),
(17, 6, NULL, '2025-05-02', NULL, NULL, NULL),
(18, 6, NULL, '2025-05-01', NULL, NULL, NULL),
(19, 6, NULL, '2025-04-30', NULL, NULL, NULL),
(20, 83, 1, '2025-05-01', NULL, NULL, NULL),
(21, 6, NULL, '2025-05-07', NULL, NULL, NULL),
(22, 6, NULL, '2025-05-15', NULL, NULL, NULL),
(23, 155, 1, '2025-05-16', NULL, NULL, NULL),
(24, 155, 1, '2025-05-22', NULL, NULL, NULL),
(25, 83, 1, '2025-05-06', NULL, NULL, NULL),
(26, 83, 1, '2025-05-07', NULL, NULL, NULL),
(27, 83, 1, '2025-05-08', NULL, NULL, NULL),
(28, 83, 1, '2025-05-09', NULL, NULL, NULL),
(29, 83, 1, '2025-05-13', NULL, NULL, NULL),
(30, 6, NULL, '2025-05-08', NULL, NULL, NULL),
(31, 6, NULL, '2025-05-09', NULL, NULL, NULL),
(34, 83, 1, '2025-05-30', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `sessoes_do_utilizador`
--

CREATE TABLE `sessoes_do_utilizador` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(512) NOT NULL,
  `device_type` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `sessoes_do_utilizador`
--

INSERT INTO `sessoes_do_utilizador` (`id`, `user_id`, `token`, `device_type`, `created_at`, `expires_at`) VALUES
(18, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6ImFkbWluIiwiaWF0IjoxNzQzMjgzMTg3LCJleHAiOjE3NDc2MDMxODcsImRldmljZVR5cGUiOiJhbmRyb2lkIn0.W_kM1quHWtpDANZtBjJWpXwNRj9BPMQjwtk_1xGeuaQ', 'android', '2025-03-29 21:19:47', '2025-05-18 22:19:47'),
(19, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDMyODMyMjAsImV4cCI6MTc0NzYwMzIyMCwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.yzFqokJmsJjD6IDeyevuE-crQNPXwGPpFqD0ZOWEjPA', 'android', '2025-03-29 21:20:20', '2025-05-18 22:20:20'),
(30, 37, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjozNywiZW1haWwiOiJydWljb3RyaW0uMjkyMjA5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWRtaW4iLCJpYXQiOjE3NDM1Mjc1ODIsImV4cCI6MTc0Nzg0NzU4MiwiZGV2aWNlVHlwZSI6IndlYiJ9.ngxouBIHdvTU9C8fcC0T-zFQPJ2NIFJiwlx3j6_7PMs', 'web', '2025-04-01 17:13:02', '2025-05-21 18:13:02'),
(31, 86, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4NiwiZW1haWwiOiIxMjM5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYXV4aWxpYXIiLCJpYXQiOjE3NDM1Mjc2MzQsImV4cCI6MTc0Nzg0NzYzNCwiZGV2aWNlVHlwZSI6IndlYiJ9.t-DkOHJ4mexcgLYG4V8vtTYap4qcBRvPSLwDkjqG6AI', 'web', '2025-04-01 17:13:55', '2025-05-21 18:13:54'),
(34, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDM1MjkxNzksImV4cCI6MTc0Nzg0OTE3OSwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.jzaK0sBFxJZ2qF7dH9RHI6tGSGrI2OLcxzIAW4BnTng', 'android', '2025-04-01 17:39:39', '2025-05-21 18:39:39'),
(38, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDQwMzk4MTAsImV4cCI6MTc0ODM1OTgxMCwiZGV2aWNlVHlwZSI6IndlYiJ9.qJv-lu1rrOgNYU5ha-EeEd5FaOaKLrveTHnz0cwfqk4', 'web', '2025-04-07 15:30:10', '2025-05-27 16:30:10'),
(48, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NDEwNTQ0NywiZXhwIjoxNzQ4NDI1NDQ3LCJkZXZpY2VUeXBlIjoid2ViIn0.psTAsnM-DO7MWz5ruS_iIdG9sKU0FBj1IdvstS5wEtk', 'web', '2025-04-08 09:44:07', '2025-05-28 10:44:07'),
(56, 37, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjozNywiZW1haWwiOiJydWljb3RyaW0uMjkyMjA5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWRtaW4iLCJpYXQiOjE3NDQyMjYyOTUsImV4cCI6MTc0ODU0NjI5NSwiZGV2aWNlVHlwZSI6IndlYiJ9.6TAnTLiEd1E8hJB67TUOjqKdTHca1Pk4nuSPnaKOB9M', 'web', '2025-04-09 19:18:15', '2025-05-29 20:18:15'),
(57, 37, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjozNywiZW1haWwiOiJydWljb3RyaW0uMjkyMjA5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWRtaW4iLCJpYXQiOjE3NDQyMjYzMTcsImV4cCI6MTc0ODU0NjMxNywiZGV2aWNlVHlwZSI6IndlYiJ9.UEO_FhDlINJvEVe7e2ppCDqA3Muayp-CfbT3DIcDnvs', 'web', '2025-04-09 19:18:37', '2025-05-29 20:18:37'),
(77, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDQzNjUyNzIsImV4cCI6MTc0ODY4NTI3MiwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.bUBsJaHmRpY6OKpTBVwbCpJN5MfREZOjuGNfPXoh7Io', 'android', '2025-04-11 09:54:32', '2025-05-31 10:54:32'),
(78, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDQzODA1MDksImV4cCI6MTc0ODcwMDUwOSwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.36_KoHOlZuzH_w6XhilXSzkjH64XEIpuU6kpmwA0AEg', 'android', '2025-04-11 14:08:29', '2025-05-31 15:08:29'),
(79, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDQzODA2NDEsImV4cCI6MTc0ODcwMDY0MSwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.Z8PAVxqLMvMfhFwiYdJ2C8Zm8tZKP8Ivr3Ia_uPzo4s', 'android', '2025-04-11 14:10:41', '2025-05-31 15:10:41'),
(80, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDQzOTUwOTEsImV4cCI6MTc0ODcxNTA5MSwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.f8YutQZLGw7ud6OWhInqLRwE8SQb4tjhtPo--Ql_0TU', 'android', '2025-04-11 18:11:31', '2025-05-31 19:11:31'),
(84, 37, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjozNywiZW1haWwiOiJydWljb3RyaW0uMjkyMjA5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWRtaW4iLCJpYXQiOjE3NDQ0NDc5MjIsImV4cCI6MTc0ODc2NzkyMiwiZGV2aWNlVHlwZSI6IndlYiJ9._PbERwixuue735FM6GYptY58mZ6nM4sPnbBC_hGetGY', 'web', '2025-04-12 08:52:02', '2025-06-01 09:52:02'),
(108, 86, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4NiwiZW1haWwiOiIxMjM5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYXV4aWxpYXIiLCJpYXQiOjE3NDQ3OTI3MjQsImV4cCI6MTc0OTExMjcyNCwiZGV2aWNlVHlwZSI6IndlYiJ9.pWK7XnLWKu_wZEf91cSK8Na-stGzRlkjuOkp41DtSXA', 'web', '2025-04-16 08:38:44', '2025-06-05 09:38:44'),
(110, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NDc5NDU2MiwiZXhwIjoxNzQ5MTE0NTYyLCJkZXZpY2VUeXBlIjoid2ViIn0.7bh6dvrUDJb89-FyDBGu3FA2fI_UrIE2K0dYgiqTsOw', 'web', '2025-04-16 09:09:22', '2025-06-05 10:09:22'),
(111, 86, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4NiwiZW1haWwiOiIxMjM5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYXV4aWxpYXIiLCJpYXQiOjE3NDQ3OTg4NTYsImV4cCI6MTc0OTExODg1NiwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.QUw2v4bKfQ5--VCrsR76XrP0s4WI6odjDc06r0Q2Q7g', 'android', '2025-04-16 10:20:56', '2025-06-05 11:20:56'),
(114, 86, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4NiwiZW1haWwiOiIxMjM5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYXV4aWxpYXIiLCJpYXQiOjE3NDQ4MTg3NTQsImV4cCI6MTc0OTEzODc1NCwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.fMWN81XfJdAanYINWJdkmAgMPUWDz0Sv6z8BVZWGil8', 'android', '2025-04-16 15:52:34', '2025-06-05 16:52:34'),
(115, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6IlByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NDgxOTEzMCwiZXhwIjoxNzQ5MTM5MTMwLCJkZXZpY2VUeXBlIjoiYW5kcm9pZCJ9._Ea-GwHvVyYAviZyAXgOIqZqTibSfiuENnBEr9lsJ6o', 'android', '2025-04-16 15:58:50', '2025-06-05 16:58:50'),
(121, 93, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo5MywiZW1haWwiOiJhZG1lb3BhaUBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6ImFkbWluIiwiaWF0IjoxNzQ0OTAyNzM1LCJleHAiOjE3NDkyMjI3MzUsImRldmljZVR5cGUiOiJhbmRyb2lkIn0.BxoKNl6ehDYLYlGcYobdYy4P-TSiN6hiNpe7YZiVsvY', 'android', '2025-04-17 15:12:15', '2025-06-06 16:12:15'),
(124, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NDkwNDUyMiwiZXhwIjoxNzQ5MjI0NTIyLCJkZXZpY2VUeXBlIjoid2ViIn0.NWQnXvFePx2kivVZF5ikug7FM_4TIs4LJb0SnsSxeQU', 'web', '2025-04-17 15:42:02', '2025-06-06 16:42:02'),
(128, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NTA1ODA5NywiZXhwIjoxNzQ5Mzc4MDk3LCJkZXZpY2VUeXBlIjoid2ViIn0.l-xZTZYeXOMNYwe23rHW0LWFXcMcB_iax8HX_xJCEyY', 'web', '2025-04-19 10:21:37', '2025-06-08 11:21:37'),
(130, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NTA2MTUzOSwiZXhwIjoxNzQ5MzgxNTM5LCJkZXZpY2VUeXBlIjoiYW5kcm9pZCJ9.MqXRlDyqrJFTf2nnouXwzYiTswoiUvFe2bqHDcW8YL0', 'android', '2025-04-19 11:18:59', '2025-06-08 12:18:59'),
(137, 37, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjozNywiZW1haWwiOiJydWljb3RyaW0uMjkyMjA5QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWRtaW4iLCJpYXQiOjE3NDUzMzEzNjksImV4cCI6MTc0OTY1MTM2OSwiZGV2aWNlVHlwZSI6ImFuZHJvaWQifQ.58Wbt5cgooNJXzoP5IeSySvCbVpRJzUmBAsX3So18bs', 'android', '2025-04-22 14:16:09', '2025-06-11 15:16:09'),
(155, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJkaW5pc2ZyYWdhdGEuMjkyMjA0QGV0cHMuY29tLnB0IiwiY2FyZ29VdGlsaXphZG9yIjoiYWx1bm8iLCJpYXQiOjE3NDU5MTQ4MDMsImV4cCI6MTc1MDIzNDgwMywiZGV2aWNlVHlwZSI6IndlYiJ9.5Esll-q_sF0ptIWiYEubrNWKlEryR86XJVyEzCYSc0w', 'web', '2025-04-29 08:20:03', '2025-06-18 09:20:03'),
(164, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NTk1OTQ3NCwiZXhwIjoxNzUwMjc5NDc0LCJkZXZpY2VUeXBlIjoid2ViIn0.DqAyp5irpbhUQzMKgLsCuFhIQXh-mVhUkuNXYsBu8CA', 'web', '2025-04-29 20:44:34', '2025-06-18 21:44:34'),
(212, 6, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2LCJlbWFpbCI6InByb2Zlc3NvckBldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6InByb2Zlc3NvciIsImlhdCI6MTc0NjY1MDcyMywiZXhwIjoxNzUwOTcwNzIzLCJkZXZpY2VUeXBlIjoiYW5kcm9pZCJ9.LFoz6PHqqrV7xtzGeoHplTgX6574WwHon4W5n0HXCP0', 'android', '2025-05-07 20:45:23', '2025-06-26 21:45:23'),
(221, 83, 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo4MywiZW1haWwiOiJhbHVub0BldHBzLmNvbS5wdCIsImNhcmdvVXRpbGl6YWRvciI6ImFsdW5vIiwiaWF0IjoxNzQ4NTkzNDMzLCJleHAiOjE3NTI5MTM0MzMsImRldmljZVR5cGUiOiJ3ZWIifQ.3k4j3TqvXXbTCfk23A3EncVvytZZHDu2fmEtAvuasXk', 'web', '2025-05-30 08:23:53', '2025-07-19 10:23:53');

-- --------------------------------------------------------

--
-- Estrutura da tabela `sugestoes_users`
--

CREATE TABLE `sugestoes_users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `date_sent` datetime NOT NULL DEFAULT current_timestamp(),
  `response` text DEFAULT NULL,
  `responder` varchar(255) DEFAULT NULL,
  `date_response` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `sugestoes_users`
--

INSERT INTO `sugestoes_users` (`id`, `email`, `message`, `date_sent`, `response`, `responder`, `date_response`) VALUES
(1, 'aluno@etps.com.pt', 'Mais comida no bar', '2025-05-18 12:11:51', 'Tens de trazer de casa!', 'administrador@etps.com.pt', '2025-05-18 12:30:30'),
(2, 'aluno@etps.com.pt', 'Ser possível jogar matrecos de graça', '2025-05-18 12:15:13', 'Isso é que era.', 'administrador@etps.com.pt', '2025-05-18 12:30:30'),
(3, 'aluno@etps.com.pt', 'Ir mais tempo de Erasmus', '2025-05-30 09:52:04', 'Trabalha e cala-te.', 'administrador@etps.com.pt', '2025-05-30 09:53:16'),
(4, 'aluno@etps.com.pt', 'Quero que tenha notas de 500€ sempre que use os matrecos.', '2025-05-30 10:22:29', 'Cala-te!', 'administrador@etps.com.pt', '2025-05-30 10:23:01');

-- --------------------------------------------------------

--
-- Estrutura da tabela `tarefas`
--

CREATE TABLE `tarefas` (
  `id` int(11) NOT NULL,
  `professor_id` int(11) NOT NULL,
  `turma_id` int(11) DEFAULT NULL,
  `data_da_tarefa` datetime DEFAULT NULL,
  `dataDeCriacao` datetime DEFAULT current_timestamp(),
  `descricao` varchar(255) DEFAULT NULL,
  `arquivo` varchar(255) DEFAULT NULL,
  `cores` varchar(255) DEFAULT NULL,
  `titulo` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `tarefas`
--

INSERT INTO `tarefas` (`id`, `professor_id`, `turma_id`, `data_da_tarefa`, `dataDeCriacao`, `descricao`, `arquivo`, `cores`, `titulo`, `updated_at`) VALUES
(5, 1, 1, '2025-05-13 23:59:00', '2025-03-05 19:10:26', '', NULL, '#FF8C00', 'Trabalho de matemática', '2025-05-05 09:37:58'),
(15, 13, 1, '2025-05-09 10:45:00', '2025-04-15 10:32:43', 'Estudar da página 15 à 18 e da 29 até à 48', NULL, '#47AD4D', 'Trabalho de casa de Linguagens de Programação', '2025-05-05 10:47:35'),
(17, 1, 2, '2025-05-08 21:26:00', '2025-05-07 21:26:55', '', NULL, '#DC143C', 'Estudar página 12', '2025-05-07 21:27:14');

-- --------------------------------------------------------

--
-- Estrutura da tabela `tarefa_config`
--

CREATE TABLE `tarefa_config` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tarefa_id` int(11) NOT NULL,
  `cor` varchar(10) NOT NULL,
  `notificacao_tipo` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `tarefa_config`
--

INSERT INTO `tarefa_config` (`id`, `user_id`, `tarefa_id`, `cor`, `notificacao_tipo`, `created_at`, `updated_at`) VALUES
(5, 83, 5, '#FF8C00', 'notificacao', '2025-04-27 11:37:20', '2025-05-01 10:28:35');

-- --------------------------------------------------------

--
-- Estrutura da tabela `tarefa_configuracoes`
--

CREATE TABLE `tarefa_configuracoes` (
  `id` int(11) NOT NULL,
  `tarefa_config_id` int(11) NOT NULL,
  `tempo_notificacao` int(11) NOT NULL,
  `tipo_notificacao` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `data_notificacao` datetime DEFAULT NULL,
  `enviado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `tarefa_configuracoes`
--

INSERT INTO `tarefa_configuracoes` (`id`, `tarefa_config_id`, `tempo_notificacao`, `tipo_notificacao`, `created_at`, `updated_at`, `data_notificacao`, `enviado`) VALUES
(9, 5, 15, 'notificacao', '2025-05-01 10:28:35', '2025-05-01 10:28:35', '2025-04-29 06:47:00', 0);

-- --------------------------------------------------------

--
-- Estrutura da tabela `turmas`
--

CREATE TABLE `turmas` (
  `id` int(11) NOT NULL,
  `ano` int(11) NOT NULL,
  `turma` varchar(50) NOT NULL,
  `ano_inicio` int(11) DEFAULT NULL,
  `ano_fim` int(11) DEFAULT NULL,
  `status` enum('ativo','desativado') NOT NULL DEFAULT 'ativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `turmas`
--

INSERT INTO `turmas` (`id`, `ano`, `turma`, `ano_inicio`, `ano_fim`, `status`) VALUES
(1, 10, 'A', 2024, 2027, 'ativo'),
(2, 10, 'B', 2024, 2027, 'ativo'),
(6, 12, 'A', 2020, 2023, 'desativado'),
(9, 10, 'C', 2024, 2027, 'ativo'),
(10, 12, 'H', 2022, 2025, 'ativo'),
(11, 12, 'Z', 2022, 2025, 'ativo'),
(12, 11, 'C', 2023, 2026, 'ativo');

--
-- Acionadores `turmas`
--
DELIMITER $$
CREATE TRIGGER `trg_turmas_set_period` BEFORE INSERT ON `turmas` FOR EACH ROW BEGIN
  DECLARE v_mes    INT;
  DECLARE v_ano    INT;
  DECLARE inicio   INT;
  DECLARE fim      INT;

  -- mês e ano civil atuais
  SET v_mes = MONTH(CURRENT_DATE);
  SET v_ano = YEAR(CURRENT_DATE);

  -- se for de Set a Dez → ano letivo = ano civil,
  -- senão (Jan–Ago) → ano letivo = ano civil - 1
  SET inicio = IF(v_mes >= 9, v_ano, v_ano - 1);
  -- normalmente o ciclo 10º → 12º dura 3 anos
  SET fim    = inicio + 3;

  -- só para turmas de 10º ano
  IF NEW.ano = 10 THEN
    SET NEW.ano_inicio = inicio;
    SET NEW.ano_fim    = fim;
  END IF;
END
$$
DELIMITER ;

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `almocos`
--
ALTER TABLE `almocos`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `alunos`
--
ALTER TABLE `alunos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_alunos_turma` (`turma_id`);

--
-- Índices para tabela `approval_requests`
--
ALTER TABLE `approval_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices para tabela `calendarios`
--
ALTER TABLE `calendarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_calendarios_turma` (`turma_id`);

--
-- Índices para tabela `codigosautenticacao`
--
ALTER TABLE `codigosautenticacao`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_email` (`email`);

--
-- Índices para tabela `dadosdoutilizador`
--
ALTER TABLE `dadosdoutilizador`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Índices para tabela `disciplinas`
--
ALTER TABLE `disciplinas`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `entradasesaidas`
--
ALTER TABLE `entradasesaidas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices para tabela `eventos`
--
ALTER TABLE `eventos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_eventos_professor` (`professor_id`),
  ADD KEY `fk_eventos_turma` (`turma_id`);

--
-- Índices para tabela `eventos_config`
--
ALTER TABLE `eventos_config`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_event` (`user_id`,`evento_id`);

--
-- Índices para tabela `eventos_notificacoes`
--
ALTER TABLE `eventos_notificacoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `evento_config_id` (`evento_config_id`);

--
-- Índices para tabela `modulos`
--
ALTER TABLE `modulos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `disciplina` (`disciplina`),
  ADD KEY `fk_modulos_turma` (`turma_id`);

--
-- Índices para tabela `notas`
--
ALTER TABLE `notas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `aluno_id` (`aluno_id`),
  ADD KEY `professor_id` (`professor_id`),
  ADD KEY `disciplina` (`disciplina`),
  ADD KEY `modulo_id` (`modulo_id`);

--
-- Índices para tabela `personalizacao_utilizador`
--
ALTER TABLE `personalizacao_utilizador`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices para tabela `preferencias_notificacoes`
--
ALTER TABLE `preferencias_notificacoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices para tabela `professores`
--
ALTER TABLE `professores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `disciplina` (`disciplina`);

--
-- Índices para tabela `professor_disciplinas`
--
ALTER TABLE `professor_disciplinas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `professor_id` (`professor_id`),
  ADD KEY `disciplina_id` (`disciplina_id`);

--
-- Índices para tabela `professor_turmas`
--
ALTER TABLE `professor_turmas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_prof_turma_professor` (`professor_id`),
  ADD KEY `fk_prof_turmas_turma` (`turma_id`);

--
-- Índices para tabela `quem_almoca`
--
ALTER TABLE `quem_almoca`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_quem_almoca_turma` (`turma_id`);

--
-- Índices para tabela `sessoes_do_utilizador`
--
ALTER TABLE `sessoes_do_utilizador`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user` (`user_id`),
  ADD KEY `idx_token` (`token`);

--
-- Índices para tabela `sugestoes_users`
--
ALTER TABLE `sugestoes_users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `email` (`email`);

--
-- Índices para tabela `tarefas`
--
ALTER TABLE `tarefas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `professor_id` (`professor_id`),
  ADD KEY `fk_tarefas_turma` (`turma_id`);

--
-- Índices para tabela `tarefa_config`
--
ALTER TABLE `tarefa_config`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_tarefa` (`user_id`,`tarefa_id`);

--
-- Índices para tabela `tarefa_configuracoes`
--
ALTER TABLE `tarefa_configuracoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tarefa_config_id` (`tarefa_config_id`);

--
-- Índices para tabela `turmas`
--
ALTER TABLE `turmas`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `almocos`
--
ALTER TABLE `almocos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de tabela `alunos`
--
ALTER TABLE `alunos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de tabela `approval_requests`
--
ALTER TABLE `approval_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `calendarios`
--
ALTER TABLE `calendarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de tabela `codigosautenticacao`
--
ALTER TABLE `codigosautenticacao`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=289;

--
-- AUTO_INCREMENT de tabela `dadosdoutilizador`
--
ALTER TABLE `dadosdoutilizador`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=159;

--
-- AUTO_INCREMENT de tabela `disciplinas`
--
ALTER TABLE `disciplinas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de tabela `entradasesaidas`
--
ALTER TABLE `entradasesaidas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de tabela `eventos`
--
ALTER TABLE `eventos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de tabela `eventos_config`
--
ALTER TABLE `eventos_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `eventos_notificacoes`
--
ALTER TABLE `eventos_notificacoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `modulos`
--
ALTER TABLE `modulos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `notas`
--
ALTER TABLE `notas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de tabela `personalizacao_utilizador`
--
ALTER TABLE `personalizacao_utilizador`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `preferencias_notificacoes`
--
ALTER TABLE `preferencias_notificacoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `professores`
--
ALTER TABLE `professores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de tabela `professor_disciplinas`
--
ALTER TABLE `professor_disciplinas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de tabela `professor_turmas`
--
ALTER TABLE `professor_turmas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de tabela `quem_almoca`
--
ALTER TABLE `quem_almoca`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT de tabela `sessoes_do_utilizador`
--
ALTER TABLE `sessoes_do_utilizador`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=222;

--
-- AUTO_INCREMENT de tabela `sugestoes_users`
--
ALTER TABLE `sugestoes_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `tarefas`
--
ALTER TABLE `tarefas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de tabela `tarefa_config`
--
ALTER TABLE `tarefa_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `tarefa_configuracoes`
--
ALTER TABLE `tarefa_configuracoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `turmas`
--
ALTER TABLE `turmas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Restrições para despejos de tabelas
--

--
-- Limitadores para a tabela `alunos`
--
ALTER TABLE `alunos`
  ADD CONSTRAINT `alunos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_alunos_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `approval_requests`
--
ALTER TABLE `approval_requests`
  ADD CONSTRAINT `approval_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`);

--
-- Limitadores para a tabela `calendarios`
--
ALTER TABLE `calendarios`
  ADD CONSTRAINT `fk_calendarios_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`);

--
-- Limitadores para a tabela `entradasesaidas`
--
ALTER TABLE `entradasesaidas`
  ADD CONSTRAINT `entradasesaidas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`);

--
-- Limitadores para a tabela `eventos`
--
ALTER TABLE `eventos`
  ADD CONSTRAINT `eventos_ibfk_1` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_eventos_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`);

--
-- Limitadores para a tabela `eventos_notificacoes`
--
ALTER TABLE `eventos_notificacoes`
  ADD CONSTRAINT `eventos_notificacoes_ibfk_1` FOREIGN KEY (`evento_config_id`) REFERENCES `eventos_config` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `modulos`
--
ALTER TABLE `modulos`
  ADD CONSTRAINT `fk_modulos_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
  ADD CONSTRAINT `modulos_ibfk_1` FOREIGN KEY (`disciplina`) REFERENCES `disciplinas` (`id`);

--
-- Limitadores para a tabela `notas`
--
ALTER TABLE `notas`
  ADD CONSTRAINT `notas_ibfk_1` FOREIGN KEY (`aluno_id`) REFERENCES `alunos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notas_ibfk_2` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notas_ibfk_3` FOREIGN KEY (`disciplina`) REFERENCES `disciplinas` (`id`),
  ADD CONSTRAINT `notas_ibfk_4` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`);

--
-- Limitadores para a tabela `personalizacao_utilizador`
--
ALTER TABLE `personalizacao_utilizador`
  ADD CONSTRAINT `personalizacao_utilizador_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `preferencias_notificacoes`
--
ALTER TABLE `preferencias_notificacoes`
  ADD CONSTRAINT `preferencias_notificacoes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `professores`
--
ALTER TABLE `professores`
  ADD CONSTRAINT `professores_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `professores_ibfk_2` FOREIGN KEY (`disciplina`) REFERENCES `disciplinas` (`id`);

--
-- Limitadores para a tabela `professor_disciplinas`
--
ALTER TABLE `professor_disciplinas`
  ADD CONSTRAINT `professor_disciplinas_ibfk_1` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `professor_disciplinas_ibfk_2` FOREIGN KEY (`disciplina_id`) REFERENCES `disciplinas` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `professor_turmas`
--
ALTER TABLE `professor_turmas`
  ADD CONSTRAINT `fk_prof_turmas_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
  ADD CONSTRAINT `professor_turmas_ibfk_1` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `quem_almoca`
--
ALTER TABLE `quem_almoca`
  ADD CONSTRAINT `fk_quem_almoca_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
  ADD CONSTRAINT `quem_almoca_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`);

--
-- Limitadores para a tabela `sessoes_do_utilizador`
--
ALTER TABLE `sessoes_do_utilizador`
  ADD CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `dadosdoutilizador` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `tarefas`
--
ALTER TABLE `tarefas`
  ADD CONSTRAINT `fk_tarefas_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
  ADD CONSTRAINT `tarefas_ibfk_1` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`);

--
-- Limitadores para a tabela `tarefa_configuracoes`
--
ALTER TABLE `tarefa_configuracoes`
  ADD CONSTRAINT `tarefa_configuracoes_ibfk_1` FOREIGN KEY (`tarefa_config_id`) REFERENCES `tarefa_config` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
