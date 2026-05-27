<?php

class Database{
    private $host = "localhost";
    private $db = "kantec";
    private $user = "tecnologo";
    private $pass = "tecnologo";
    private $conn;

    public function getConnection(): PDO{
        if ($this->conn) return $this->conn;

        $this->conn = new PDO( //pdo hace mas facil la conexion a base de datos
            "mysql:host={$this->host};dbname={$this->db};charset=utf8",
            $this->user,
            $this->pass
        );
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); //le dice a php que lance error y no se quede calladito
        $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC); //devuelve tuplas de forma mejor

        return $this->conn;
    }
}


?>