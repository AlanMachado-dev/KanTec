<?php
require_once 'config/db.php';

class asignacionAPI
{
    private PDO $db;

    public function __construct(){
        $this->db = (new Database())->getConnection();
    }

    public function create(): void{
        $body = json_decode(file_get_contents("php://input"), true);
        $idTablero = $body['idTablero'];
        $idTarea =  $body['idTarea'];
        $alias = $body['alias'];

        $stmt = $this->db->prepare("SELECT * FROM usuario WHERE alias = ? AND activo = true");
        $stmt->execute([$alias]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false || empty($user)) {
            respond(404, ["error" => "Usuario no encontrado"]);
        }

        $stmt = $this->db->prepare(
            "INSERT INTO asignacion (idTablero,idTarea,alias,fecHorAsig) VALUES (?,?,?,NOW())"
        );
        $stmt->execute([$idTablero, $idTarea, $alias]);
    }
    
    public function getAsignacionesPorTarea(string $idTablero, string $idTarea): void {
        $stmt = $this->db->prepare(
            "SELECT alias FROM asignacion a NATURAL JOIN usuario u WHERE a.idTarea = ? AND a.idTablero = ? AND u.activo = true"
        );
        $stmt->execute([$idTarea, $idTablero]);
        $asignaciones = $stmt->fetchAll(PDO::FETCH_COLUMN);
        if ($asignaciones === false) {
            $asignaciones = [];
        }
        
        respond(200, $asignaciones);
    }

    public function delete(): void{
        $body = json_decode(file_get_contents("php://input"), true);
        $idTablero = $body['idTablero'];
        $idTarea =  $body['idTarea'];
        $alias = $body['alias'];
        $stmt = $this->db->prepare("DELETE a FROM asignacion AS a NATURAL JOIN usuario AS u WHERE a.idTablero = ? AND a.idTarea = ? AND a.alias = ? AND u.activo = true");
        $stmt->execute([$idTablero, $idTarea, $alias]);
    }
}
