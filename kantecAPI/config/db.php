<?php

class Database{
    private $host = "localhost";
    private $db = "kantec";
    private $user = "tecnologo";
    private $pass = "tecnologo";
    private $conn;

    public function getConnection(): PDO{
        if ($this->conn) return $this->conn;
            
        try{
            //prueba si existe la base de datos (uso PDO porque es mas facil conectarse a la BD)
            $connSinBD = new PDO("mysql:host={$this->host}", $this->user, $this->pass);
            $connSinBD->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); 
            $connSinBD->exec("CREATE DATABASE IF NOT EXISTS `{$this->db}` 
                              CHARACTER SET utf8 COLLATE utf8_general_ci");

            //crea la conexion con la base de datos
            $this->conn = new PDO(
                "mysql:host={$this->host};dbname={$this->db};charset=utf8",
                $this->user,
                $this->pass
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            //prueba si existen las tablas necesarios
            $this->crearTablas();

        }catch(PDOException $e){
            http_response_code(500);
            die(json_encode(["error" => "Error de conexión: " . $e->getMessage()]));
        }
        
        return $this->conn;
    }

    private function crearTablas(): void { //crear un exec por cada tabla necesaria
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS usuario (
                alias    VARCHAR(30)  NOT NULL PRIMARY KEY,
                nombre   VARCHAR(50)  NOT NULL,
                password VARCHAR(100)  NOT NULL,
                email    VARCHAR(60)  NOT NULL,
                imagen   VARCHAR(40)  NULL
            )
        ");
        $this->conn->exec("
            CREATE TABLE IF NOT EXISTS tablero (
            id BINARY(16) PRIMARY KEY,
            titulo VARCHAR(50) NOT NULL,
            descripcion VARCHAR(300),
            fechaCreacion DATETIME NOT NULL ,
            imagen VARCHAR(40) NULL,
            color VARCHAR(7),
            aliasCreador VARCHAR(30), FOREIGN KEY (aliasCreador) REFERENCES usuario(alias)
            )
        ");

    }
}


?>