<?php
require_once 'vendor/autoload.php';
require_once 'config/db.php';
require_once 'config/jwt.php';
require_once 'api/usuarioAPI.php'; //se incluye el controlador de cada tabla a usar
require_once 'api/tableroAPI.php';
require_once 'api/tareaAPI.php';
require_once 'api/imagenesAPI.php';
require_once 'api/utilidadesAPI.php';



$method = $_SERVER['REQUEST_METHOD'];

//agarra el path del endpoint llamado
$basePath = '/kantecAPI';
$uri = str_replace($basePath, '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

//separa las partes del url en un array, para asi comparar abajo
$partes = explode('/', trim($uri, '/')); 

//se crea el controlador por cada tabla
$usuario = new usuarioAPI(); 

$tablero = new tableroAPI();

$tarea = new tareaAPI();

$imagenes = new imagenesAPI();

$utilidades = new utilidadesAPI();

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
    $partes[1] === 'tableros' && $partes[2] === 'invitacion' && !isset($partes[3])
        && $method === 'PUT' => $tablero->aceptarInvitacion(),
    $partes[1] === 'tableros' && isset($partes[2]) && !isset($partes[3]) 
        && $method === 'GET' => $tablero->getOne($partes[2]),
    $partes[1] === 'tableros' && isset($partes[2]) && !isset($partes[3]) 
        && $method === 'PUT' => $tablero->update($partes[2]),
    $partes[1] === 'tableros' && isset($partes[2])  && !isset($partes[3])
        && $method === 'DELETE' => $tablero->delete($partes[2]),
    $partes[1] === 'tableros' && !isset($partes[2]) 
        && $method === 'GET' => $tablero->getAll(),
    $partes[1] === 'tableros' && !isset($partes[2]) 
        && $method === 'POST' => $tablero->create(),
    $partes[1] === 'tableros' && $partes[2] === 'usuario' && isset($partes[3]) && !isset($partes[4]) 
        && $method === 'GET' => $tablero->getTableros($partes[3]),
    $partes[1] === 'tableros' && $partes[2] === 'colaborador' && isset($partes[3]) && !isset($partes[4]) 
    && $method === 'GET' => $tablero->misColaboraciones($partes[3]),
    $partes[1] === 'tableros' && $partes[2] === 'colaboradores' && isset($partes[3]) && !isset($partes[4])
        && $method === 'GET' => $tablero->colaboradoresTablero($partes[3]),
    $partes[1] === 'tableros' && $partes[2] === 'colaboradores' && !isset($partes[3])
        && $method === 'POST' => $tablero->agregarColaborador(),
    $partes[1] === 'tableros' && $partes[2] === 'invitaciones' && isset($partes[3]) && !isset($partes[4])
        && $method === 'GET' => $tablero->getInvitaciones($partes[3]),

    //ruta tareas

    $partes[1] === 'tareas' && !isset($partes[2]) 
        && $method === 'POST' => $tarea->create(),
    $partes[1] === 'tareas' && $partes[2] === 'tablero' && isset($partes[3]) && !isset($partes[4]) 
        && $method === 'GET' => $tarea->getTareas($partes[3]),
    $partes[1] === 'tareas' && isset($partes[2]) && isset($partes[3]) && !isset($partes[4]) 
        && $method === 'GET' => $tarea->getOne($partes[2], $partes[3]),
    $partes[1] === 'tareas' && isset($partes[2]) && isset($partes[3]) && !isset($partes[4]) 
        && $method === 'PUT' => $tarea->update($partes[2], $partes[3]),
    $partes[1] === 'tareas' && isset($partes[2]) && isset($partes[3]) && !isset($partes[4])
        && $method === 'DELETE' => $tarea->delete($partes[2], $partes[3]),
    $partes[1] === 'tareas' && $partes[2] === 'tablero' && isset($partes[3]) && isset($partes[4]) && !isset($partes[5]) 
        && $method === 'GET' => $tarea->getTareasColumna($partes[3], $partes[4]),

    //ruta imagenes
    $partes[1] === 'imagenes' && $partes[2] === 'usuarios' && !isset($partes[3]) 
        && $method === 'POST' => $imagenes->subirImgUsuario(),
    $partes[1] === 'imagenes' && $partes[2] === 'tableros' && !isset($partes[3]) 
        && $method === 'POST' => $imagenes->subirImgTablero(),
    
    //ruta utilidades
    $partes[1] === 'utilidad' && $partes[2] === 'triggers' && $method === 'GET' => $utilidades->agregarTriggers(),

    default => respond(404, ["error" => "Ruta no encontrada"])
};

function respond(int $status, array $data): void { // aca se envia la respuesta
    http_response_code($status);
    echo json_encode($data);
    exit;
}

?>