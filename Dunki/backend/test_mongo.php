<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();
try {
    $client = new \MongoDB\Client(env('MONGODB_URI'));
    $db = $client->selectDatabase(env('MONGODB_DATABASE'));
    $command = new \MongoDB\Driver\Command(['ping' => 1]);
    $client->getManager()->executeCommand(env('MONGODB_DATABASE'), $command);
    echo "Success!\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
