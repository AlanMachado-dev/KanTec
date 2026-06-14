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
        $stmt = $this->db->prepare(
            "INSERT INTO asignacion (idTarea,idTablero,alias,fecHorAsig) VALUES (?,?,?,CURRENT_DATETIME())"
        );
        $stmt->execute([$idTablero, $idTarea, $alias]);
    }

    public function getAsignacionesPorAlias(): void{
        $body = json_decode(file_get_contents("php://input"), true);
        $idTablero = $body['idTablero'];
        $alias = $body['alias'];
        $stmt = $this->db->prepare(
            "SELECT * FROM asignacion WHERE alias = ? AND idTablero = ?"
        );
        $stmt->execute([$alias,$idTablero]);
        $asignaciones = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($asignaciones === false || empty($asignaciones)) {
            respond(404, ["error" => "SIN ASIGNACIONES"]);
        }
        respond(200, $asignaciones);
    }

    public function getAsignacionesPorTarea(): void{
        $body = json_decode(file_get_contents("php://input"), true);
        $idTablero = $body['idTablero'];
        $idTarea = $body['idTarea'];
        $stmt = $this->db->prepare(
            "SELECT * FROM asignacion WHERE idTarea = ? AND idTablero = ?"
        );
        $stmt->execute([$idTarea,$idTablero]);
        $asignaciones = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($asignaciones === false || empty($asignaciones)) {
            respond(404, ["error" => "SIN ASIGNACIONES"]);
        }
        respond(200, $asignaciones);
    }

    public function delete(): void{
        $body = json_decode(file_get_contents("php://input"), true);
        $idTablero = $body['idTablero'];
        $idTarea =  $body['idTarea'];
        $alias = $body['alias'];
        $stmt = $this->db->prepare("DELETE FROM asignacion WHERE idTablero = ? AND idTarea = ? AND alias= ?");
        $stmt->execute([$idTablero, $idTarea, $alias]);
    }
}
