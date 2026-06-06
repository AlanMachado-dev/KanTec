import { Tarea } from "./tarea";

export interface Columna {
  id: number;
  titulo: string;
  tareas: Tarea[];
}
