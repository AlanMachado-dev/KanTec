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
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        if(!password_verify($body['password'], $user['password'])){
            respond(401, ["error" => "Contraseña incorrecta"]);
        }

        $payload = [
            'alias' => $user['alias'],
            'nombre' => $user['nombre'],
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
        $tokenData = verificarToken();

        $stmt = $this->db->prepare("SELECT * FROM usuario NATURAL JOIN perfil WHERE usuario.alias = ?");
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
            "INSERT INTO usuario (alias, password) VALUES (?, ?)"
        );
        $stmt->execute([$body['alias'], $passhash]);

                $stmt = $this->db->prepare(
            "INSERT INTO perfil (alias, nombre, email, imagen) VALUES (?, ?, ?, ?)"
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

        $stmt = $this->db->prepare("SELECT * FROM perfil WHERE alias = ?");
        $stmt->execute([$alias]);
        $perfil = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$perfil) {
            respond(404, ["error" => "Perfil no encontrado"]);
            exit; 
        }

        $nombre = (!empty($body['nombre'])) ? $body['nombre'] : $perfil['nombre'];
        $email = (!empty($body['email'])) ? $body['email'] : $perfil['email'];
        $imagen = (!empty($body['imagen'])) ? $body['imagen'] : $perfil['imagen'];
        $fecNac = (!empty($body['imagen'])) ? $body['imagen'] : $perfil['imagen'];
        $bio = (!empty($body['imagen'])) ? $body['imagen'] : $perfil['imagen'];
        $stmt = $this->db->prepare(
            "UPDATE perfil SET nombre = ?, email = ?, imagen = ?, fecNac = ?, bio = ? WHERE alias = ?"
        );
        $stmt->execute([$nombre, $email, $imagen, $fecNac, $bio, $alias]);
        respond(200, ["mensaje" => "Perfil actualizado"]);

    }

    // DELETE http://localhost/kantecAPI/api/usuarios/ElPro123
public function delete(string $alias): void {
    //$tokenData = verificarToken();

    $stmt = $this->db->prepare("SELECT * FROM usuario NATURAL JOIN perfil WHERE usuario.alias = ?");
    $stmt->execute([$alias]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user === false || empty($user)) {
        respond(404, ["error" => "Usuario no encontrado"]);
        return; 
    }
    
    $query = $this->db->prepare("DELETE FROM tablero WHERE aliasCreador = ?");
    $query->execute([$alias]);

    $query = $this->db->prepare(
        "INSERT INTO usuarioPerfilBorrado (alias, password, email, nombre, imagen, fecNac, bio) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    $query->execute([
        $alias,
        $user['password'],
        $user['email'],
        $user['nombre'],
        $user['imagen'],
        $user['fecNac'],
        $user['bio']
    ]);

    $stmt = $this->db->prepare("DELETE FROM perfil WHERE alias = ?");
    $stmt->execute([$alias]);
    $stmt = $this->db->prepare("DELETE FROM usuario WHERE alias = ?");
    $stmt->execute([$alias]);

    respond(200, ["mensaje" => "Usuario eliminado con éxito"]);
}


    // GET http://localhost/kantecAPI/api/usuarios/existe/alias
    public function existe(string $alias): void {

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user !== false && !empty($user)) {
            respond(200, ["existe" => "true"]);
            return; 
        }

        $stmt = $this->db->prepare("SELECT * FROM usuarioPerfilBorrado WHERE alias = ?");
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

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user !== false && !empty($user)) {
            respond(200, ["existe" => "true"]);
            return; 
        }

        $stmt = $this->db->prepare("SELECT * FROM usuarioPerfilBorrado WHERE email = ?");
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