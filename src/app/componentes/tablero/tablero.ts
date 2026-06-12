import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Http } from '../../services/http';
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import { Columna } from '../../interfaces/columna';
import { TableroInterfaz } from '../../interfaces/tablero';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from "@angular/forms";
import Swal from 'sweetalert2';
import { Tarea } from '../../interfaces/tarea';
import { Colaborador } from '../../interfaces/colaborador';
import { NgClass } from "@angular/common";

@Component({
  selector: 'app-tablero',
  imports: [ ReactiveFormsModule, NgClass],
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

  aliasLogueado: string | null = null;
  colaboradoresTablero: Colaborador[] = [];
  rutaImagenes !: string;
  miTablero: TableroInterfaz | null = null;
  esEspectador: boolean = false;
  private intervaloColaboradores: any;

  private fb = inject(FormBuilder);

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
    let detener = false;
    this.http.verificarToken().subscribe({
      next: () => {},
      error: (err) => {
        console.log(err);
        this.http.cerrarSesion();
        this.router.navigate(['/ingreso'], {state: {expirado: "true"}});
        detener = true;
      }
    })
    if(detener) return;

    this.http.sesionActiva$.subscribe(logueado => {
      if (logueado) {
        this.aliasLogueado = this.http.getAliasDelToken();
        this.idTablero = this.ruta.snapshot.paramMap.get('id');
        this.cargarTareas();
        this.cdr.detectChanges();
        for(let i = 0; i < 4; i++){
          if(!this.idTablero){return console.log("error pendejo");}
          this.http.getTareasTableroColumna(this.idTablero,i).subscribe({
            next: (response) => {
              this.columnas[i].tareas = response;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.log(err);
              this.http.cerrarSesion();
              this.router.navigate(['/ingreso'], {state: {expirado: "true"}});
              return;
            }
          })
        }
        if(this.idTablero){
          this.http.getTablero(this.idTablero)
            .subscribe(tablero => {
              this.miTablero = tablero;
            });

          this.recargarColaboradores();

          this.intervaloColaboradores = setInterval(() => { //pueden hacer algo parecido para recargar tareas supongo
            this.recargarColaboradores();
          }, 5000);

          this.rutaImagenes = this.http.getRutaBaseImg();
          }
      } else {
        this.router.navigate(['/ingreso'], {state: {expirado: 'true'}});
      }
    });
  }

ngOnDestroy(): void {
  clearInterval(this.intervaloColaboradores);
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
    if (this.esEspectador) {
      return;
    }
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
          for(const tarea of this.columnas[i].tareas){
            if(tarea.prioridad == null){
              tarea.prioridad = 0;
            }
          }
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

onDragOver(event: DragEvent, container: HTMLElement): void {
  event.preventDefault();

  const rect = container.getBoundingClientRect();

  const zonaScroll = 80;

  const distanciaArriba = event.clientY - rect.top;
  const distanciaAbajo = rect.bottom - event.clientY;

  if (distanciaArriba < zonaScroll) {
    container.scrollTop -= (zonaScroll - distanciaArriba) / 2;
  }

  if (distanciaAbajo < zonaScroll) {
    container.scrollTop += (zonaScroll - distanciaAbajo) / 2;
  }
}

  onDrop(event: DragEvent, columnaFinalID: number): void{
    if (this.esEspectador) {
      return;
    }
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
 
  ////// COLABORADORES //////

  formularioAgregarColaborador: FormGroup = this.fb.group({
    aliasUsuario: ['',{
      validators: [
        Validators.required,
        Validators.maxLength(50)
      ]
    }],
    tipoRelacion: ['1']
  })
  agregarColaborador(){
    const body = this.formularioAgregarColaborador.value;

    if (body.aliasUsuario === this.aliasLogueado){
      Swal.fire({
        icon: 'warning',
        title: 'Acción no permitida',
        text: 'No puedes invitarte a ti mismo'
      });
      return;
    }else{
      if(this.idTablero){
        this.http.invitarColaborador(this.idTablero,body).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Usuario invitado',
              text: 'Invitacion enviada con exito'
            });
            const btnCerrar = document.getElementById('btnCerrarModal');
            btnCerrar?.click();
          },
          error: (err) => {
            if (err.status === 404) {
              Swal.fire({
                icon: 'error',
                title: 'Usuario no encontrado',
                text: 'No existe un usuario con ese alias.'
              });
            } else if (err.status === 409) {
              switch (err.error.codigo) {
                case 'YA_COLABORA':
                  Swal.fire({
                    title: "Ya pertenece al tablero",
                    text: "Ese usuario ya colabora o especta este tablero.",
                    icon: "warning"
                  });
                  break;
                case 'INVITACION_PENDIENTE':
                  Swal.fire({
                    title: "Invitación pendiente",
                    text: "Ese usuario ya tiene una invitación pendiente.",
                    icon: "info"
                  });
              }
            } else {
              Swal.fire({
                title: "Error",
                text: "Ocurrio un error inesperado.",
                icon: "error"
              });
            }
            
          }
        });
      }
    }
    
  }
  verPerfil(alias: string): void {
    this.router.navigate(['/perfil', alias]);
  }

  getRol(tipo: number): string{
    switch(tipo){
      case 0:
        return 'Creador';
      case 1:
        return 'Contribuidor';
      case 2:
        return 'Espectador';
      default:
        return 'Desconocido';
    }
  }
  recargarColaboradores(): void {
    if(this.idTablero){
      this.http.getColaboradoresDeTablero(this.idTablero)
        .subscribe(colaboradores => {
          this.colaboradoresTablero = colaboradores;
          this.cdr.detectChanges();
          if (this.colaboradoresTablero) {
            const miColaboracion = this.colaboradoresTablero.find(
              c => c.aliasUsuario === this.aliasLogueado);
            this.esEspectador = miColaboracion?.tipoRelacion === 2;
          }
        })
        
    }
  }


  ////// EDITAR TAREA //////

  formularioTarea: FormGroup = this.fb.group({
    idTarea: [''],
    nombre: ['', {
      validators: [
        Validators.required,
        Validators.maxLength(50)
      ]
    }],
    descripcion: ['', {
      validators: [
        Validators.maxLength(50)
      ]
    }],
    fechaInicio: ['', {
      validators: [
      ]
    }],
    fechaFinal: ['', {
      validators: [
      ]
    }],
    fechaCreacion: ['', {
      validators: [
      ]
    }],
    prioridad: [''],
  });

  seleccionarTarea(tarea: Tarea): void{
    this.formularioTarea.patchValue({
      idTarea: tarea.idTarea,
      nombre: tarea.nombre,
      descripcion: tarea.descripcion,
      fechaInicio: tarea.fechaInicio,
      fechaFinal: tarea.fechaFinal,
      fechaCreacion: tarea.fechaCreacion,
      prioridad: String(tarea.prioridad)
    })
  }

  guardarCambiosTarea(){
    if(this.esEspectador){
      return;
    }
    const body = this.formularioTarea.value;
    if(!this.idTablero){return;}
    this.http.actualizarTarea(this.idTablero, this.formularioTarea.value.idTarea, body).subscribe({
      next: () => {
        this.cargarTareas();
        this.cdr.detectChanges();
        const btnCerrar = document.getElementById('btnCerrarOffcanvas');
        btnCerrar?.click();
      },
      error: (err) => console.log(err)
    })
  }

  confirmarBorrarTarea(){
    if (this.esEspectador) {
      return;
    }
    Swal.fire({
      title: "¿Estás seguro/a?",
      text: "¡Esto será irreversible!",
      icon: "warning",
      showCancelButton: true,
      cancelButtonColor: "#3085d6",
      confirmButtonColor: "#d33",
      confirmButtonText: "Sí, borrar.",
      cancelButtonText: "No, cancelar."
    }).then((result) => {
      if(result.isConfirmed) {
        if(!this.idTablero){return;}
        this.http.borrarTarea(this.idTablero, this.formularioTarea.value.idTarea).subscribe({
          next: () => {
            Swal.fire({
              title: "Tarea borrada!",
              text: "La tarea ha sido borrado exitosamente.",
              icon: "success"
            });
            this.cargarTareas();
            const btnCerrar = document.getElementById('btnCerrarOffcanvas');
            btnCerrar?.click();
          },
          error: (error) => {
            Swal.fire({
              title: "Error",
              text: "No se pudo borrar la tarea. Inténtalo de nuevo.",
              icon: "error"
            });
            console.log(error);
          }
        });
      }
    });
  }

}

