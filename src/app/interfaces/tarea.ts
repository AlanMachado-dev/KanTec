import { Colaborador } from "./colaborador";

export interface Tarea {
    idTarea: number;
    nombre: string;
    descripcion: string;
    fechaFinal: string;
    fechaInicio: string;
    prioridad: number;
    fechaCreacion: string;
    asignaciones?: Colaborador[]; 
}
