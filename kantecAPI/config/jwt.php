<?php
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

define('JWT_SECRET', 'pero_madre_mia_willy_que_haces_aqui');

function verificarToken(): array {
    $headers = getallheaders();

    if(!isset($headers['Authorization'])){
        respond(401, ["error" => "Token requerido"]);
    }

    $token = str_replace('Bearer ', '', $headers['Authorization']);

    try{
        $decoded = JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
        return (array) $decoded;
    }catch(Exception $e){
        respond(401, ["error" => "Token invalido o expirado"]);
        return [];
    }
}

?>