<?php
require_once 'api/usuarioAPI.php'; //se incluye el controlador de cada tabla a usar

$method = $_SERVER['REQUEST_METHOD'];

//agarra el path del endpoint llamado
$basePath = '/kantecAPI';
$uri = str_replace($basePath, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// agarra el alias si viene en la URL, ej: /api/usuarios/itsmafiu (ACA SE HACE UNO POR CADA TABLA A USAR)
preg_match('/\/api\/usuarios\/([^\/]+)/', $uri, $matches);

$id = $matches[1] ?? null; //el alias o null si no viene

$usuario = new usuarioAPI(); //se crea el controlador por cada tabla

match(true) {
    //ruta usuarios
    $id !== null && $method === 'GET' => $usuario->getOne($id),
    $id !== null && $method === 'PUT' => $usuario->update($id),
    $id !== null && $method === 'DELETE' => $usuario->delete($id),
    $uri === '/api/usuarios' && $method === 'GET' => $usuario->getAll(),
    $uri === '/api/usuarios' && $method === 'POST' => $usuario->create(),

    //rutas extras

    
    default => respond(404, ["error" => "Ruta no encontrada"])
};

function respond(int $status, array $data): void { // aca se envia la respuesta
    http_response_code($status);
    echo json_encode($data);
    exit;
}

?>