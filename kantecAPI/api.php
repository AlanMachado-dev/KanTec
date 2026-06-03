<?php
require_once 'vendor/autoload.php';
require_once 'config/db.php';
require_once 'config/jwt.php';
require_once 'api/usuarioAPI.php'; //se incluye el controlador de cada tabla a usar
require_once 'api/tableroAPI.php';
require_once 'api/imagenesAPI.php';



$method = $_SERVER['REQUEST_METHOD'];

//agarra el path del endpoint llamado
$basePath = '/kantecAPI';
$uri = str_replace($basePath, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

//separa las partes del url en un array, para asi comparar abajo
$partes = explode('/', trim($uri, '/')); 

//se crea el controlador por cada tabla
$usuario = new usuarioAPI(); 

$tablero = new tableroAPI();

$imagenes = new imagenesAPI();

match(true) {
    //ruta usuarios
    $partes[1] === 'usuarios' && isset($partes[2]) && !isset($partes[3]) 
        && $method === 'GET' => $usuario->getOne($partes[2]), 
    $partes[1] === 'usuarios' && isset($partes[2]) && !isset($partes[3]) 
        && $method === 'PUT' => $usuario->update($partes[2]), 
    $partes[1] === 'usuarios' && isset($partes[2]) && !isset($partes[3]) 
        && $method === 'DELETE' => $usuario->delete($partes[2]), 
    $partes[1] === 'usuarios' && !isset($partes[2]) 
        && $method === 'GET' => $usuario->getAll(),
    $partes[1] === 'usuarios' && !isset($partes[2]) 
        && $method === 'POST' => $usuario->create(),
    $partes[1] === 'usuarios' && $partes[2] === 'login' && !isset($partes[3]) 
        && $method === 'POST' => $usuario->inicioSesion(),
    $partes[1] === 'usuarios' && $partes[2] === 'existe' && isset($partes[3]) && !isset($partes[4]) 
        && $method === 'GET' => $usuario->existe($partes[3]),

    //ruta tableros
    
    $partes[1] === 'tableros' && isset($partes[2]) && !isset($partes[3]) 
        && $method === 'PUT' => $tablero->update($partes[2]),
    $partes[1] === 'tableros' && isset($partes[2]) && !isset($partes[3]) 
        && $method === 'GET' => $tablero->getOne($partes[2]),
    $partes[1] === 'tableros' && isset($partes[2])  && !isset($partes[3])
        && $method === 'DELETE' => $tablero->delete($partes[2]),
    $partes[1] === 'tableros' && !isset($partes[2]) 
        && $method === 'GET' => $tablero->getAll(),
    $partes[1] === 'tableros' && !isset($partes[2]) 
        && $method === 'POST' => $tablero->create(),
    $partes[1] === 'tableros' && $partes[2] === 'usuario' && isset($partes[3]) && !isset($partes[4]) 
        && $method === 'GET' => $tablero->getTableros($partes[3]),
    
    //ruta imagenes
    $partes[1] === 'imagenes' && $partes[2] === 'usuarios' && !isset($partes[3]) 
        && $method === 'POST' => $imagenes->subirImgUsuario(),
    $partes[1] === 'imagenes' && $partes[2] === 'tableros' && !isset($partes[3]) 
        && $method === 'POST' => $imagenes->subirImgTablero(),
    

    default => respond(404, ["error" => "Ruta no encontrada"])
};

function respond(int $status, array $data): void { // aca se envia la respuesta
    http_response_code($status);
    echo json_encode($data);
    exit;
}

?>