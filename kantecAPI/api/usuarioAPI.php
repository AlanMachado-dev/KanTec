<?php
use Firebase\JWT\JWT;
// use Firebase\JWT\Key;

class usuarioAPI {
    private PDO $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    // POST http://localhost/kantecAPI/api/usuarios/login
    public function inicioSesion(): void{
        $body = json_decode(file_get_contents("php://input"), true);
    
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$body['alias']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado", "codigo" => "NOT_FOUND"]);
        }

        if($user['activo'] === 0){
            respond(404, ["error" => "Usuario inactivo." , "codigo" => "INACTIVO"]);
        }

        if(!password_verify($body['password'], $user['password'])){
            respond(401, ["error" => "Contraseña incorrecta"]);
        }

        if($user['verificado'] === 0){
            respond(401, ["error" => "Usuario no verificado"]);
        }

        $payload = [
            'alias' => $user['alias'],
            'exp' => time() + (60 * 60) //tiempo que dura el token (1h)
        ];

        $token = JWT::encode($payload, JWT_SECRET, 'HS256');

        respond(200, [
            "mensaje" => "Login correcto",
            "token" => $token
            ]);
    }

    // GET http://localhost/kantecAPI/api/usuarios
    public function getAll(): void {
        $stmt = $this->db->query("SELECT * FROM usuario");
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/usuarios/itsmafiu
    public function getOne(string $alias): void {
        $stmt = $this->db->prepare("SELECT * FROM usuario NATURAL JOIN perfil WHERE usuario.alias = ? AND usuario.activo = true");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        respond(200, $user);
    }

    // POST http://localhost/kantecAPI/api/usuarios
    public function create(): void {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['alias']) || empty($body['nombre']) || empty($body['password']) || empty($body['email']) ) { //|| empty($body['imagen'])
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }

        $passhash = password_hash($body['password'], PASSWORD_DEFAULT);

        $stmt = $this->db->prepare(
            "INSERT INTO usuario (alias, password, verificado) VALUES (?, ?, 1)"
        ); //cuando se añada verifiacion de mail el 1 pasa a ser 0
        $stmt->execute([$body['alias'], $passhash]);

                $stmt = $this->db->prepare(
            "INSERT INTO perfil (alias, nombre, email, imagen, fecReg) VALUES (?, ?, ?, ?, CURRENT_DATE())"
        );
        $stmt->execute([$body['alias'], $body['nombre'], $body['email'], $body['imagen']]);

        respond(201, [
            "mensaje" => "Usuario creado"
        ]);
    }

    // PUT http://localhost/kantecAPI/api/usuarios/lewan500
    public function update(string $alias): void {
        $body = json_decode(file_get_contents("php://input"), true);
        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM usuario u NATURAL JOIN perfil p WHERE p.alias = ? AND u.activo = true");
        $stmt->execute([$alias]);
        $perfil = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$perfil) {
            respond(404, ["error" => "Perfil no encontrado"]);
            exit; 
        }

        $nombre = (!empty($body['nombre'])) ? $body['nombre'] : $perfil['nombre'];
        $email = (!empty($body['email'])) ? $body['email'] : $perfil['email'];
        $imagen = (!empty($body['imagen'])) ? $body['imagen'] : $perfil['imagen'];
        $fecNac = (!empty($body['fecNac'])) ? $body['fecNac'] : $perfil['fecNac'];
        $bio = (!empty($body['bio'])) ? $body['bio'] : $perfil['bio'];
        $stmt = $this->db->prepare(
            "UPDATE perfil SET nombre = ?, email = ?, imagen = ?, fecNac = ? ,bio = ? WHERE alias = ?"
        );
        $stmt->execute([$nombre, $email, $imagen, $fecNac, $bio, $alias]);
        respond(200, ["mensaje" => "Perfil actualizado"]);

    }

    // DELETE http://localhost/kantecAPI/api/usuarios/ElPro123
    public function delete(string $alias): void {
    //$tokenData = verificarToken();

    $stmt = $this->db->prepare("SELECT * FROM usuario NATURAL JOIN perfil WHERE usuario.alias = ? AND usuario.activo = true");
    $stmt->execute([$alias]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user === false || empty($user)) {
        respond(404, ["error" => "Usuario no encontrado"]);
        return; 
    }

    $query = $this->db->prepare(
        "UPDATE usuario SET activo = false WHERE alias = ?"
    );

    $query->execute([$alias]);

    respond(200, ["mensaje" => "Usuario eliminado con éxito"]);
}


    // GET http://localhost/kantecAPI/api/usuarios/existe/alias
    public function existe(string $alias): void {

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user !== false && !empty($user)) {
            respond(200, ["existe" => "true"]);
            return; 
        }

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = false");
        $stmt->execute([$alias]);
        $userBorrado = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($userBorrado !== false && !empty($userBorrado)) {
            respond(200, ["existe" => "true"]);
        } else {
            respond(200, ["existe" => "false"]);
        }
    }


    // GET http://localhost/kantecAPI/api/usuarios/existeEmail/email
    public function existeEmail(string $email): void {

        $stmt = $this->db->prepare("SELECT * FROM usuario u NATURAL JOIN perfil p WHERE p.email = ? AND u.activo = true");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user !== false && !empty($user)) {
            respond(200, ["existe" => "true"]);
            return; 
        }
        $stmt = $this->db->prepare("SELECT * FROM usuario u NATURAL JOIN perfil p WHERE p.email = ? AND u.activo = false");
        $stmt->execute([$email]);
        $userBorrado = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($userBorrado !== false && !empty($userBorrado)) {
            respond(200, ["existe" => "true"]);
        } else {
            respond(200, ["existe" => "false"]);
        }
    }
}

?>