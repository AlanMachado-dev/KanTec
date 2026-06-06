<?php
require_once 'config/db.php';

class tableroAPI
{
    private PDO $db;

    public function __construct()
    {
        $this->db = (new Database())->getConnection();
        $this->db->query("SET sql_mode=''");
    }

    // GET http://localhost/kantecAPI/api/tableros
    public function getAll(): void
    {
        $stmt = $this->db->query("SELECT * FROM tablero");
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tableros/usuario/Luqui86
    public function getTableros(string $alias): void
    {   
        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE aliasCreador = ? ORDER BY fechaCreacion");
        $stmt->execute([$alias]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tableros/id
    public function getOne(string $id): void
    {
        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        respond(200, $tablero);
    }

    // POST http://localhost/kantecAPI/api/tableros
    public function create(): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['alias'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$body['alias']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        date_default_timezone_set('America/Montevideo');
        $fechaActual = date('Y-m-d H:i:s');

        $stmt = $this->db->prepare(
            "INSERT INTO tablero (id,titulo,aliasCreador, fechaCreacion,color) VALUES (?,?,?,?,?)"
        );

        $colores = [
            "#3498DB",
            "#E74C3C",
            "#2ECC71",
            "#F1C40F",
            "#9B59B6"
        ];
        $color = $colores[array_rand($colores)];

        $uuid = $this->db->query(
            "SELECT uuid()"
        )->fetchColumn();

        $stmt->execute([$uuid,'Titulo',$body['alias'],$fechaActual, $color]);

        //Si llego hasta aca se pudo crear el tablero por lo que agregare en pertenece que este usuario es el creador de este tablero

        $stmt = $this->db->prepare("INSERT INTO pertenece VALUES (?,?,0,true)");
        $stmt->execute([$uuid,$body["alias"]]);

        //Probablemente podria hacerlo con un trigger pero me parece una mountain

        respond(201, [
            "mensaje" => "Tablero creado"
        ]);
    }

    // PUT http://localhost/kantecAPI/api/tableros/1
    public function update(string $id): void {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);

        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);


        // Si se intenta actualizar el tablero y los datos son iguales el $stmt->rowCount() === 0 va a tirar error de tablero no encontrado
        // y eso esta mal deberia simplemente decir que esta actualizado aunque no haya cambios supongo
        if(!$tablero) {
            respond (404, ["error" => "Tablero no encontrado"]);
        }

        //Cambio para que se pueda actualizar el tablero sin necesidad de actualizar todas las cosas del tablero
        $titulo = $body['titulo'] ?? $tablero['titulo'];
        $descripcion = $body['descripcion'] ?? $tablero['descripcion'];
        $imagen = $body['imagen'] ?? $tablero['imagen'];
        $color = $body['color'] ?? $tablero['color'];

        $stmt = $this->db->prepare(
            "UPDATE tablero SET titulo = ?, descripcion = ?, imagen = ?, color = ? WHERE id = ?"
        );
        $stmt->execute([$titulo, $descripcion, $imagen, $color ,$id]);
        
        respond(200, ["mensaje" => "Tablero actualizado"]);
    }

    // DELETE http://localhost/kantecAPI/api/tableros/1
    public function delete(string $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM tablero WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        respond(200, ["mensaje" => "Tablero eliminado"]);
    }

    // GET http://localhost/kantecAPI/api/tableros/colaborador/alias
    public function misColaboraciones(string $alias): void 
    {
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * from tablero where id IN (SELECT idTablero from pertenece where aliasUsuario = ? AND tipoRelacion != 0 AND aceptada=1)");
        $stmt->execute([$alias]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/tableros/colaboradores/idTablero
    public function colaboradoresTablero(string $id): void 
    {
        $stmt = $this->db->prepare("SELECT aliasUsuario,tipoRelacion from pertenece where idTablero = ? AND aceptada=1");
        $stmt->execute([$id]);

        respond(200, $stmt->fetchAll());
    }

    // POST http://localhost/kantecAPI/api/tableros/colaboradores
    public function agregarColaborador(): void //Por ahora con este endpoint se podra agregar colaboradores espectadores sin preguntarles 
    //si quieren o no
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['idTablero']) || empty($body['aliasUsuario']) || empty($body['tipoRelacion'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$body['idTablero']]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $stmt = $this->db->prepare("INSERT INTO pertenece VALUES (?,?,?,false)");
        $stmt->execute([$body['idTablero'], $body['aliasUsuario'], $body['tipoRelacion']]);

        respond(201, [
            "mensaje" => "Colaborador invitado"
        ]);
    }

    // GET http://localhost/kantecAPI/api/tableros/invitaciones/alias
    public function getInvitaciones(string $alias){
        $stmt = $this->db->prepare("SELECT aliasCreador,titulo as tituloTablero,tipoRelacion FROM tablero as t , pertenece as p WHERE aceptada=0 AND aliasUsuario=? AND t.id = p.idTablero");
        $stmt->execute([$alias]);

        respond(200, $stmt->fetchAll());
    }

    // PUT http://localhost/kantecAPI/api/tableros/invitacion/
    public function aceptarInvitacion(){
        $body = json_decode(file_get_contents("php://input"), true);

        if (empty($body['idTablero']) || empty($body['aliasUsuario']) || empty($body['acepto'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }

        $stmt = $this->db->prepare("UPDATE pertenece SET aceptada = ? WHERE idTablero = ? AND aliasUsuario = ?");
        $stmt->execute([$body['acepto'],$body['idTablero'], $body['aliasUsuario']]);
    }
}
