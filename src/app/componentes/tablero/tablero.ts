import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Http } from '../../services/http';
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import { Columna } from '../../interfaces/columna';

@Component({
  selector: 'app-tablero',
  imports: [],
  templateUrl: './tablero.html',
  styles: ``,
})
export class Tablero implements OnInit, AfterViewInit {
  @ViewChildren('columnRef') columnElements!: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private ruta: ActivatedRoute, private http: Http, private router: Router, private cdr: ChangeDetectorRef
  ) { }

  private idTablero: string | null = null;
  private draggingId: number | null = null;

   columnas: Columna[] = [
    {
      id: 0,
      titulo: 'Pendiente',
      tareas: [],
    },
    {
      id: 1,
      titulo: 'Analisis',
      tareas: [],
    },
    {
      id: 2,
      titulo: 'Desarrollo',
      tareas: [],
    },
    {
      id: 3,
      titulo: 'Hecho',
      tareas: [],
    }
  ];

  ngOnInit(): void {
    this.http.sesionActiva$.subscribe(logueado => {
      if (logueado) {
        this.idTablero = this.ruta.snapshot.paramMap.get('id');
        this.cargarTareas();
        this.cdr.detectChanges();
      } else {
        this.router.navigate(['/']);
      }
    });
  }
  
ngAfterViewInit(): void {
    flatpickr("#calendario-siempre-abierto", {
      inline: true, 
      locale: Spanish,
      altInput: true,
      altFormat: "j \\d\\e F Y",
      dateFormat: "Y-m-d", 
      mode: "range", 
      minDate: "today",
    });
  }

  posicionFinalColumna(columna: number): number{
    const sourceColumn = this.columnas.find(c => c.id === columna);
    if (!sourceColumn) return -1;
 
    return sourceColumn.tareas.length;
  }

  ////// PERSISTENCIA //////

  crearTarea(columna: number): void{
    if(!this.idTablero){return console.log("error pendejo");}
    this.http.crearTarea(this.idTablero, columna, this.posicionFinalColumna(columna)).subscribe({
      next: () => {
        if(!this.idTablero){return console.log("error pendejo");}
        this.http.getTareasTableroColumna(this.idTablero,columna).subscribe({
          next: (response) => {
            this.columnas[columna].tareas = response;
            this.cdr.detectChanges();
          }
        })
      }
    });
  }

  cargarTareas(): void{
    for(let i = 0; i < this.columnas.length; i++){
      if(!this.idTablero){return console.log("error pendejo");}

      this.http.getTareasTableroColumna(this.idTablero,i).subscribe({
        next: (response) => {
          this.columnas[i].tareas = response;
          this.cdr.detectChanges();
        }
      })
    } 
  }

  guardarTareas(): void{
    for(let i = 0; i < this.columnas.length; i++){
      if(!this.idTablero){return console.log("error pendejo");}

      let j: number = 1;
      for(const tarea of this.columnas[i].tareas){
        this.http.actualizarPosicionTarea(this.idTablero, tarea.idTarea, i, j).subscribe({
          next: () => {

          },
          error: (err) => console.log(err)
        });
        j++;
      }
    }
  }

  ////// DRAG AND DROP //////

  onDragStart(event: DragEvent, tareaID: number): void{
    this.draggingId = tareaID; // guarda que se esta arrastrando
    event.dataTransfer?.setData('text/plain', tareaID.toString()); // lo mete en el "portapapeles" del drag
    (event.target as HTMLElement).classList.add('dragging'); // añade clase visual cuando se haga drag (opcional para mas tarde) 
  }

  onDragEnd(event: DragEvent): void{
    (event.target as HTMLElement).classList.remove('dragging'); // mismo que arriba
    this.draggingId = null; 
  }

  onDragOver(event: DragEvent): void{
    event.preventDefault(); // para que el navegador no rechace el drop
  }

  onDrop(event: DragEvent, columnaFinalID: number): void{
    event.preventDefault();

    const id = Number(event.dataTransfer?.getData('text/plain')) ?? this.draggingId;
    if(!id) return;

    // encuentra la columna original de la tarea
    const columnaInicial = this.columnas.find(c => c.tareas.some(p => p.idTarea === id));
    if(!columnaInicial) return;

    // saca esa tarea de la columna
    const tareaIndex = columnaInicial.tareas.findIndex(p => p.idTarea === id);
    const [tarea] = columnaInicial?.tareas.splice(tareaIndex, 1);

    // encuentra la columna objetivo
    const columnaFinal = this.columnas.find(c => c.id === columnaFinalID);

    // inserta la tarea en la columna nueva
    const insertIndex = this.getInsertIndex(event, columnaFinalID);
    columnaFinal?.tareas.splice(insertIndex, 0, tarea);

    console.log(this.columnas[columnaFinalID].tareas);
    this.guardarTareas();
  }

  // se usa para calcular en que posicion va guardado
  private getInsertIndex(event: DragEvent, columnaFinalID: number): number{
    const colIndex = this.columnas.findIndex(c => c.id === columnaFinalID);
    const colEl = this.columnElements.toArray()[colIndex]?.nativeElement;
    if(!colEl) return this.columnas[colIndex].tareas.length;

    const tareaEls = Array.from(
      colEl.querySelectorAll<HTMLElement>('.postit:not(.dragging)')
    );

    for (let i=0; i < tareaEls.length; i++){
      const box = tareaEls[i].getBoundingClientRect();
      const midY = box.top + box.height/2;
      if(event.clientY < midY){
        return i;
      }
    }
    return this.columnas[colIndex].tareas.length;
  }
 
}

