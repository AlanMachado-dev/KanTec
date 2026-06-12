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

        $stmt->execute([$uuid, 'Titulo', $body['alias'], $fechaActual, $color]);

        //Si llego hasta aca se pudo crear el tablero por lo que agregare en pertenece que este usuario es el creador de este tablero

        $stmt = $this->db->prepare("INSERT INTO pertenece VALUES (?,?,0)");
        $stmt->execute([$uuid, $body["alias"]]);

        //Probablemente podria hacerlo con un trigger pero me parece una mountain

        respond(201, [
            "mensaje" => "Tablero creado"
        ]);
    }

    // PUT http://localhost/kantecAPI/api/tableros/1
    public function update(string $id): void
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!$body) {
            respond(400, ["error" => "Body inválido o vacío"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$id]);

        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);


        // Si se intenta actualizar el tablero y los datos son iguales el $stmt->rowCount() === 0 va a tirar error de tablero no encontrado
        // y eso esta mal deberia simplemente decir que esta actualizado aunque no haya cambios supongo
        if (!$tablero) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        //Cambio para que se pueda actualizar el tablero sin necesidad de actualizar todas las cosas del tablero
        $titulo = $body['titulo'] ?? $tablero['titulo'];
        $descripcion = $body['descripcion'] ?? $tablero['descripcion'];
        $imagen = $body['imagen'] ?? $tablero['imagen'];
        $color = $body['color'] ?? $tablero['color'];

        $stmt = $this->db->prepare(
            "UPDATE tablero SET titulo = ?, descripcion = ?, imagen = ?, color = ? WHERE id = ?"
        );
        $stmt->execute([$titulo, $descripcion, $imagen, $color, $id]);

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

    // GET http://localhost/kantecAPI/api/colaboradores/misColaboraciones/alias
    public function misColaboraciones(string $alias): void
    {
        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * from tablero where id IN (SELECT idTablero from pertenece where aliasUsuario = ? AND tipoRelacion != 0)");
        $stmt->execute([$alias]);
        respond(200, $stmt->fetchAll());
    }

    // GET http://localhost/kantecAPI/api/colaboradores/idTablero
    public function colaboradoresTablero(string $id): void
    {
        $stmt = $this->db->prepare("SELECT p.aliasUsuario, p.tipoRelacion, u.imagen from pertenece p JOIN perfil u ON u.alias = p.aliasUsuario where idTablero = ?");
        $stmt->execute([$id]);

        respond(200, $stmt->fetchAll());
    }

    // POST http://localhost/kantecAPI/api/colaboradores/invitar
    public function agregarColaborador(): void 
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!isset($body['idTablero']) || !isset($body['aliasUsuario']) || !isset($body['tipoRelacion'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        $stmt = $this->db->prepare("SELECT * FROM tablero WHERE id = ?");
        $stmt->execute([$body['idTablero']]);
        $tablero = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tablero === false || empty($tablero)) {
            respond(404, ["error" => "Tablero no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ?");
        $stmt->execute([$body['aliasUsuario']]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($usuario === false || empty($usuario)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM pertenece WHERE aliasUsuario = ? AND idTablero = ?");
        $stmt->execute([$body['aliasUsuario'], $body['idTablero']]);
        $colaboracion = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($colaboracion) {
            respond(409, ["codigo" => "YA_COLABORA", "error" => "Usuario ya colabora con este tablero"]);
        }

        $stmt = $this->db->prepare("SELECT * FROM invitacion WHERE aliasInvitado = ? AND idTablero = ?");
        $stmt->execute([$body['aliasUsuario'], $body['idTablero']]);
        $invitacion = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($invitacion) {
            respond(409, ["codigo" => "INVITACION_PENDIENTE", "error" => "El usuario ya tiene una invitación pendiente"]);
        }

        $stmt = $this->db->prepare("INSERT INTO invitacion (idTablero, aliasInvitado, aliasCreador, tipoRelacion, notificado) VALUES (? ,? ,? ,? , false)");
        $stmt->execute([$body['idTablero'], $body['aliasUsuario'], $tablero['aliasCreador'], $body['tipoRelacion']]);

        respond(201, [
            "mensaje" => "Colaborador invitado"
        ]);
    }

    // GET http://localhost/kantecAPI/api/colaboradores/invitaciones/alias
    public function getInvitaciones(string $alias)
    {
        $stmt = $this->db->prepare("SELECT i.idTablero, i.aliasCreador, t.titulo as tituloTablero, i.tipoRelacion FROM invitacion i JOIN tablero t ON t.id = i.idTablero WHERE i.aliasInvitado = ?");
        $stmt->execute([$alias]);

        respond(200, $stmt->fetchAll());
    }

    // PUT http://localhost/kantecAPI/api/colaboradores/invitacion/
    public function aceptarInvitacion()
    {
        $body = json_decode(file_get_contents("php://input"), true);

        if (!isset($body['idTablero']) || !isset($body['aliasUsuario']) || !isset($body['acepto'])) {
            respond(400, ["error" => "Todos los campos son requeridos"]);
        }
        if ($body['acepto'] == 1) {
            $stmt = $this->db->prepare(
                "SELECT * FROM invitacion WHERE idTablero = ? AND aliasInvitado = ?"
            );
            $stmt->execute([ $body['idTablero'], $body['aliasUsuario'] ]);

            $invitacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invitacion) {
                respond(404, ["error" => "Invitación no encontrada"]);
            }

            $stmt = $this->db->prepare("INSERT INTO pertenece (idTablero, aliasUsuario, tipoRelacion) VALUES (?, ?, ?)");

            $stmt->execute([$invitacion['idTablero'], $invitacion['aliasInvitado'], $invitacion['tipoRelacion']]);

            $stmt = $this->db->prepare("DELETE from invitacion WHERE idTablero = ? AND aliasInvitado = ?");
            $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);

            respond(201, ["mensaje" => "Se acepto la invitacion"]);
        } else {
            $stmt = $this->db->prepare(
                "SELECT * FROM invitacion WHERE idTablero = ? AND aliasInvitado = ?"
            );
            $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);

            $invitacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invitacion) {
                respond(404, ["error" => "Invitación no encontrada"]);
            }
            $stmt = $this->db->prepare("DELETE from invitacion WHERE idTablero = ? AND aliasInvitado = ?");
            $stmt->execute([$body['idTablero'], $body['aliasUsuario']]);
            respond(201, ["mensaje" => "Se rechazo la invitacion"]);
        }
    }
}
