export interface Colaborador {
    aliasUsuario: string;
    imagen: string | null;
    tipoRelacion: number; //0 es Creador, 1 es Colaborador, 2 es Visitante/Espectador
}
