<?php
require_once 'vendor/autoload.php';
require_once 'config/db.php';
require_once 'config/jwt.php';
require_once 'api/usuarioAPI.php'; //se incluye el controlador de cada tabla a usar
require_once 'api/tableroAPI.php';



$method = $_SERVER['REQUEST_METHOD'];

//agarra el path del endpoint llamado
$basePath = '/kantecAPI';
$uri = str_replace($basePath, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// agarra el alias si viene en la URL, ej: /api/usuarios/itsmafiu (ACA SE HACE UNO POR CADA TABLA A USAR)
preg_match('/\/api\/usuarios\/([^\/]+)/', $uri, $matches);
$idUsuario = $matches[1] ?? null; //el alias o null si no viene

preg_match('/\/api\/tableros\/([^\/]+)/', $uri, $matches2);
$idTablero = $matches2[1] ?? null; //el id del tablero o null si no viene

preg_match('/\/api\/tableros\/usuario\/([^\/]+)/', $uri, $matchesAlias);
$aliasTablero = $matchesAlias[1] ?? null;

$usuario = new usuarioAPI(); //se crea el controlador por cada tabla

$tablero = new tableroAPI();

match(true) {
    //ruta usuarios
    $idUsuario !== null && $method === 'GET' => $usuario->getOne($idUsuario),
    $idUsuario !== null && $method === 'PUT' => $usuario->update($idUsuario),
    $idUsuario !== null && $method === 'DELETE' => $usuario->delete($idUsuario),
    $uri === '/api/usuarios' && $method === 'GET' => $usuario->getAll(),
    $uri === '/api/usuarios' && $method === 'POST' => $usuario->create(),
    $uri === '/api/usuarios/login' && $method === 'POST' => $usuario->inicioSesion(),

    //ruta tableros
    str_contains($uri, "/api/tableros/usuario/") && $idTablero !== null && $method === 'GET'
    => $tablero->getTableros($aliasTablero),
    $idTablero !== null && $method === 'PUT' => $tablero->update($idTablero),
    $idTablero !== null && $method === 'GET' => $tablero->getOne($idTablero),
    $idTablero !== null && $method === 'DELETE' => $tablero->delete($idTablero),
    $uri === '/api/tableros' && $method === 'GET' => $tablero->getAll(),
    $uri === '/api/tableros' && $method === 'POST' => $tablero->create(),
    

    default => respond(404, ["error" => "Ruta no encontrada"])
};

function respond(int $status, array $data): void { // aca se envia la respuesta
    http_response_code($status);
    echo json_encode($data);
    exit;
}

?>