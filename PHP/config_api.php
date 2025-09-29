<?php
require_once __DIR__ . '/vendor/autoload.php'; // assuming composer.json is in PHP/

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__); // __DIR__ points to the PHP folder
$dotenv->load();

return [
    'db_host' => $_ENV['DB_HOST'],
    'db_user' => $_ENV['DB_USER'],
    'db_pass' => $_ENV['DB_PASS'],
    'db_name' => $_ENV['DB_NAME'],
    'sendgrid_api_key' => $_ENV['SENDGRID_API_KEY'],
    'base_url' => $_ENV['BASE_URL'],
    'jwt_key' => $_ENV['JWT_KEY'],
    'recaptcha_secret_key' => $_ENV['RECAPTCHA_SECRET_KEY']
];