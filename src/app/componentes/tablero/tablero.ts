import { AfterViewInit, ChangeDetectorRef, Component, computed, ElementRef, HostListener, inject, OnInit, QueryList, ViewChildren } from '@angular/core';
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
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-tablero',
  imports: [ReactiveFormsModule, NgClass],
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
  private intervaloTareas: any;

  aliasLogueado: string | null = null;
  colaboradoresTablero: Colaborador[] = [];
  rutaImagenes !: string;
  miTablero: TableroInterfaz | null = null;
  esEspectador: boolean = false;
  private avisoEspectadorMostrado: boolean = false;
  maxColaboradoresVisibles: number = 8;
  private intervaloColaboradores: any;
  usuarioSeleccionado: Colaborador | null = null;
  modoModal: 'agregar' | 'editar' = 'agregar';
  cargandoInvitacion: boolean = false;
  cargandoTarea = false;

  private fpInstance: any;

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
      next: () => { },
      error: (err) => {
        this.http.cerrarSesion();
        this.router.navigate(['/ingreso'], { state: { expirado: "true" } });
        detener = true;
      }
    })
    if (detener) return;

    this.http.sesionActiva$.subscribe(logueado => {
      if (logueado) {
        this.aliasLogueado = this.http.getAliasDelToken();
        this.idTablero = this.ruta.snapshot.paramMap.get('id');
        this.cargarTareas();
        this.cdr.detectChanges();
        this.http.notificarInvitacion().subscribe(resp => {
          if (resp.tieneNuevas) {
            Swal.mixin({
              toast: true,
              position: 'bottom-end',
              showConfirmButton: false,
              timer: 5000,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
              }
            }).fire({
              icon: 'info',
              title: 'Revisa la seccion "Mis invitaciones".'
            });
            this.http.marcarComoVistas().subscribe();
            this.avisoEspectadorMostrado = true;
          }
        })
        this.intervaloTareas = setInterval(() => {
          this.cargarTareas();
        }, 2000);
        if (this.idTablero) {
          this.http.getTablero(this.idTablero)
            .subscribe(tablero => {
              this.miTablero = tablero;
              this.cdr.detectChanges();
            });

          this.recargarColaboradores();
          this.actualizarLimiteColaboradores();
          this.intervaloColaboradores = setInterval(() => { 
            this.recargarColaboradores();
          }, 5000);

          this.rutaImagenes = this.http.getRutaBaseImg();
        }
      } else {
        this.router.navigate(['/ingreso'], { state: { expirado: 'true' } });
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.intervaloColaboradores);
    clearInterval(this.intervaloTareas);
  }

  ngAfterViewInit(): void {
    this.fpInstance = flatpickr("#calendario-siempre-abierto", {
      inline: true,
      locale: Spanish,
      altInput: true,
      altFormat: "j \\d\\e F Y",
      dateFormat: "Y-m-d",
      mode: "range",

      onChange: (selectedDates, dateStr, instance) => {
        this.formularioTarea.patchValue({
          fechaInicio: selectedDates[0]
            ? instance.formatDate(selectedDates[0], 'Y-m-d')
            : null,
          fechaFinal: selectedDates[1]
            ? instance.formatDate(selectedDates[1], 'Y-m-d')
            : null
        })
      }
    });
  }

  posicionFinalColumna(columna: number): number {
    const sourceColumn = this.columnas.find(c => c.id === columna);
    if (!sourceColumn) return -1;

    return sourceColumn.tareas.length;
  }

  ////// PERSISTENCIA //////

  crearTarea(columna: number): void {
    if (this.esEspectador) {
      return;
    }
    if (!this.idTablero) { return; }
    this.http.crearTarea(this.idTablero, columna, this.posicionFinalColumna(columna)).subscribe({
      next: () => {
        if (!this.idTablero) { return; }
        this.http.getTareasTableroColumna(this.idTablero, columna).subscribe({
          next: (response) => {
            this.columnas[columna].tareas = response;
            this.cdr.detectChanges();
          }
        })
      }
    });
  }


  cargarTareas(): void {
    for (let i = 0; i < this.columnas.length; i++) {
      if (!this.idTablero) { return; }

      this.http.getTareasTableroColumna(this.idTablero, i).subscribe({
        next: (response) => {
          this.columnas[i].tareas = response;
          for (const tarea of this.columnas[i].tareas) {
            if (tarea.prioridad == null) {
              tarea.prioridad = 0;
            }
          }
        }
      })
    }
    this.cdr.detectChanges();
  }

  cargarTareasColumna(col: number): void {
    if (!this.idTablero) { return; }

    this.http.getTareasTableroColumna(this.idTablero, col).subscribe({
      next: (response) => {
        this.columnas[col].tareas = response;
        for (const tarea of this.columnas[col].tareas) {
          if (tarea.prioridad == null) {
            tarea.prioridad = 0;
          }
        }
      }
    })
    this.cdr.detectChanges();
  }

  guardarTareas(): void {
    for (let i = 0; i < this.columnas.length; i++) {
      if (!this.idTablero) { return; }

      let j: number = 1;
      for (const tarea of this.columnas[i].tareas) {
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

  onDragStart(event: DragEvent, tareaID: number): void {
    this.draggingId = tareaID; // guarda que se esta arrastrando
    event.dataTransfer?.setData('text/plain', tareaID.toString()); // lo mete en el "portapapeles" del drag
    (event.target as HTMLElement).classList.add('dragging'); // añade clase visual cuando se haga drag (opcional para mas tarde) 
  }

  onDragEnd(event: DragEvent): void {
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

  onDrop(event: DragEvent, columnaFinalID: number): void {
    if (this.esEspectador) {
      return;
    }
    event.preventDefault();

    const id = Number(event.dataTransfer?.getData('text/plain')) ?? this.draggingId;
    if (!id) return;

    // encuentra la columna original de la tarea
    const columnaInicial = this.columnas.find(c => c.tareas.some(p => p.idTarea === id));
    if (!columnaInicial) return;

    // saca esa tarea de la columna
    const tareaIndex = columnaInicial.tareas.findIndex(p => p.idTarea === id);
    const [tarea] = columnaInicial?.tareas.splice(tareaIndex, 1);

    // encuentra la columna objetivo
    const columnaFinal = this.columnas.find(c => c.id === columnaFinalID);

    // inserta la tarea en la columna nueva
    const insertIndex = this.getInsertIndex(event, columnaFinalID);
    columnaFinal?.tareas.splice(insertIndex, 0, tarea);

    this.guardarTareas();
  }

  // se usa para calcular en que posicion va guardado
  private getInsertIndex(event: DragEvent, columnaFinalID: number): number {
    const colIndex = this.columnas.findIndex(c => c.id === columnaFinalID);
    const colEl = this.columnElements.toArray()[colIndex]?.nativeElement;
    if (!colEl) return this.columnas[colIndex].tareas.length;

    const tareaEls = Array.from(
      colEl.querySelectorAll<HTMLElement>('.postit:not(.dragging)')
    );

    for (let i = 0; i < tareaEls.length; i++) {
      const box = tareaEls[i].getBoundingClientRect();
      const midY = box.top + box.height / 2;
      if (event.clientY < midY) {
        return i;
      }
    }
    return this.columnas[colIndex].tareas.length;
  }

  ////// COLABORADORES //////

  formularioMiembro: FormGroup = this.fb.group({
    aliasUsuario: ['', {
      validators: [
        Validators.required,
        Validators.maxLength(50)
      ]
    }],
    tipoRelacion: ['1']
  })
  agregarColaborador() {

    this.formularioMiembro.markAllAsTouched();

    if (this.formularioMiembro.invalid) {
      return;
    }


    const body = this.formularioMiembro.value;

    if (body.aliasUsuario === this.aliasLogueado) {
      Swal.fire({
        icon: 'warning',
        title: 'Acción no permitida',
        text: 'No puedes invitarte a ti mismo'
      });
      return;
    } else {
      if (this.idTablero) {
        this.cargandoInvitacion = true;
        this.http.invitarColaborador(this.idTablero, body).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Usuario invitado',
              text: 'Invitacion enviada con exito'
            });
            this.cargandoInvitacion = false;
            this.cdr.detectChanges();
            const btnCerrar = document.getElementById('btnCerrarModal');
            btnCerrar?.click();
            if(!this.idTablero)return;
            this.http.notificarInvitacionMail(body, this.idTablero).subscribe();
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
            this.cargandoInvitacion = false;
            this.cdr.detectChanges();
          }
        });
      }
    }

  }
  verPerfil(alias: string): void {
    const btnCerrar = document.getElementById('btnCerrarOffcanvas');
    btnCerrar?.click();
    this.router.navigate(['/perfil', alias]);
  }

  getRol(tipo: number): string {
    switch (tipo) {
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
    if (this.idTablero) {
      this.http.getColaboradoresDeTablero(this.idTablero)
        .subscribe({
          next: (colaboradores) => {
            this.colaboradoresTablero = colaboradores;
            if (this.colaboradoresTablero) {
              const miColaboracion = this.colaboradoresTablero.find(
                c => c.aliasUsuario === this.aliasLogueado);
              this.esEspectador = miColaboracion?.tipoRelacion === 2;
              this.cdr.detectChanges();
              if (this.esEspectador && !this.avisoEspectadorMostrado) {
                this.avisoEspectadorMostrado = true;
                Swal.fire({
                  toast: true,
                  position: 'bottom-end',
                  icon: 'info',
                  title: 'Viendo el tablero como espectador',
                  showConfirmButton: false,
                  timer: 3000,
                  timerProgressBar: true
                });
              }
            }
          }, error: (err) => {
            if (err.status === 403) {
              this.router.navigate(['/home']);

              Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Ya no tienes acceso a este tablero',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
              });
            } else if (err.status === 401){
              this.http.cerrarSesion();
              this.router.navigate(['/ingreso'], { state: { expirado: "true" } });
            }
          }
        })

    }
  }

  abrirModalAgregar() {
    this.modoModal = 'agregar';

    this.formularioMiembro.reset({
      aliasUsuario: '',
      tipoRelacion: '1'
    });
    this.formularioMiembro.get('aliasUsuario')?.enable();
  }

  abrirModalEditar() {
    if (!this.usuarioSeleccionado) {
      return;
    }
    this.modoModal = 'editar';

    this.formularioMiembro.patchValue({
      aliasUsuario: this.usuarioSeleccionado.aliasUsuario,
      tipoRelacion: this.usuarioSeleccionado.tipoRelacion
    });

    this.formularioMiembro.get('aliasUsuario')?.disable();

    this.formularioMiembro.markAsPristine();
    this.formularioMiembro.markAsUntouched();
  }
  modificarPermisos() {
    const relacion = this.formularioMiembro.get('tipoRelacion')?.value;
    if (this.idTablero && this.usuarioSeleccionado) {
      this.http.modificarPermisos(this.idTablero, this.usuarioSeleccionado?.aliasUsuario, relacion).subscribe({
        next: () => {
          this.recargarColaboradores();
          const btnCerrar = document.getElementById('btnCerrarModal');
          btnCerrar?.click();
          Swal.fire({
            title: 'Permisos modificados con exito',
            icon: 'success'
          })
        },
        error: (err) => {
          if (err.status === 409) {
            Swal.fire({
              icon: 'error',
              title: 'Usuario no modificado',
              text: 'Este usuario ya tiene esos permisos.'
            });
          } else if (err.status === 404) {
            Swal.fire({
              icon: 'error',
              title: 'Usuario no encontrado',
              text: 'El usuario ya no pertenece al tablero.'
            });
          } else {
            Swal.fire({
              title: "Error",
              text: "Ocurrio un error inesperado.",
              icon: "error"
            });
          }
        }
      })
    }
  }
  eliminarMiembro() {
    if (!this.usuarioSeleccionado) {
      return;
    }
    Swal.fire({
      title: "¿Estás seguro/a?",
      text: `Se eliminará a ${this.usuarioSeleccionado.aliasUsuario} del tablero`,
      icon: "warning",
      showCancelButton: true,
      cancelButtonColor: "#3085d6",
      confirmButtonColor: "#d33",
      confirmButtonText: "Sí, borrar.",
      cancelButtonText: "No, cancelar."
    }).then((result) => {
      if (result.isConfirmed && this.usuarioSeleccionado && this.idTablero) {
        this.http.eliminarMiembro(this.idTablero, this.usuarioSeleccionado.aliasUsuario).subscribe({
          next: () => {
            Swal.fire({
              title: "¡Miembro eliminado!",
              text: "El miembro ha sido eliminado del tablero exitosamente.",
              icon: "success"
            });
            this.recargarColaboradores();
            this.usuarioSeleccionado = null;
          },
          error: (err) => {
            if (err.status === 404) {
              Swal.fire({
                title: 'Miembro no encontrado',
                icon: 'error'
              });
            } else {
              Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar al miembro. Inténtalo de nuevo.',
                icon: 'error'
              });
            }
          }
        });
      }
    });
  }

  abrirMenuUsuario(colaborador: Colaborador) {
    if (this.aliasLogueado != this.miTablero?.aliasCreador || this.aliasLogueado == colaborador.aliasUsuario) {
      this.verPerfil(colaborador.aliasUsuario);
      return;
    }
    this.usuarioSeleccionado = colaborador;
  }

  private actualizarLimiteColaboradores(): void {
    const ancho = window.innerWidth;

    if (ancho < 768) {
      this.maxColaboradoresVisibles = 3;
    } else if (ancho < 1200) {
      this.maxColaboradoresVisibles = 5;
    } else {
      this.maxColaboradoresVisibles = 8;
    }
    this.cdr.detectChanges();
  }
  @HostListener('window:resize')
  onResize(): void {
    this.actualizarLimiteColaboradores();
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
        Validators.maxLength(300)
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

  tareaSelecionada: Tarea | null = null;
  columnaTareaSeleccionada: number | null = null;
  seleccionarTarea(tarea: Tarea, columnaID: number): void {
    this.tareaSelecionada = tarea;
    this.columnaTareaSeleccionada = columnaID;
    this.tareaSelecionada.asignaciones;
    this.formularioTarea.patchValue({
      idTarea: tarea.idTarea,
      nombre: tarea.nombre,
      descripcion: tarea.descripcion,
      fechaInicio: tarea.fechaInicio,
      fechaFinal: tarea.fechaFinal,
      fechaCreacion: tarea.fechaCreacion,
      prioridad: String(tarea.prioridad)
    });

    const fechasTarea: string[] = [];
    if (this.formularioTarea.value.fechaInicio) fechasTarea.push(this.formularioTarea.value.fechaInicio);
    if (this.formularioTarea.value.fechaFinal) fechasTarea.push(this.formularioTarea.value.fechaFinal);

    this.fpInstance?.setDate(fechasTarea, false);
  }

  guardarCambiosTarea() {
    this.formularioTarea.get('nombre')?.updateValueAndValidity();
    this.formularioTarea.get('descripcion')?.updateValueAndValidity();
    this.cargandoTarea = true;

    if (this.esEspectador || this.formularioTarea.invalid || !this.idTablero) return;

    const body = this.formularioTarea.value;
    const col = this.columnaTareaSeleccionada;
    if (col == null) return;

    this.http.actualizarTarea(this.idTablero, body.idTarea, body).pipe(
      switchMap(() => this.http.getTareasTableroColumna(this.idTablero!, col))
    ).subscribe({
      next: (response) => {
        this.columnas[col].tareas = response;
        for (const tarea of this.columnas[col].tareas) {
          if (tarea.prioridad == null) tarea.prioridad = 0;
        }
        this.cargandoTarea = false;
        this.cdr.detectChanges();
        document.getElementById('btnCerrarOffcanvas')?.click();
      },
      error: (err) => console.log(err)
    });
  }

  confirmarBorrarTarea() {
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
      if (result.isConfirmed) {
        if (!this.idTablero) { return; }
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
          }
        });
      }
    });
  }

  ////// CÁLCULO DE VENCIMIENTO //////

  calcularDiasRestantes(fechaFinal: any): number | null {
    if (!fechaFinal) return null;

    const fechaLimpia = fechaFinal.substring(0, 10); //esto porque la fecha viene con la hora me quedo solo con AAAA-MM-DD

    const partes = fechaLimpia.split('-');
    if (partes.length !== 3) return null;

    const anio = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);

    if (isNaN(anio) || isNaN(mes) || isNaN(dia)) return null;

    const vencimiento = new Date(anio, mes - 1, dia);
    vencimiento.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diferenciaTiempo = vencimiento.getTime() - hoy.getTime();
    return Math.round(diferenciaTiempo / (1000 * 60 * 60 * 24));
  }

  obtenerTextoVencimiento(fechaFinal: string): string {
    const dias = this.calcularDiasRestantes(fechaFinal);

    if (dias === null) {
      return 'Sin fecha Asignada';
    }
    if (dias < 0) {
      return `Vencida hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
    }
    if (dias === 0) {
      return 'Vence hoy';
    }
    if (dias === 1) {
      return 'Vence mañana';
    }
    return `Quedan ${dias} días`;
  }

  obtenerClaseVencimiento(fechaFinal: string): string {
    const dias = this.calcularDiasRestantes(fechaFinal);

    if (dias === null) {
      return 'text-muted';
    }
    if (dias < 0) {
      return 'text-danger fw-bold bg-danger-subtle';
    }
    if (dias === 0 || dias === 1) {
      return 'text-warning fw-bold bg-warning-subtle';
    }
    return 'text-success fw-semibold bg-success-subtle';
  }


  /////EDITAR ASIGNACION /////
  abrirMenuAsignacion(colaborador: Colaborador) {
    if(this.esEspectador && colaborador.aliasUsuario){
      this.verPerfil(colaborador.aliasUsuario);
      return;
    }
    this.usuarioSeleccionado = colaborador;
  }

  postAsignacion(alias: string) {
    if(this.esEspectador){
      return;
    }
    const tablero = this.idTablero || "";
    this.http.postAsignacion(tablero, this.formularioTarea.value.idTarea, alias)
      .subscribe({
        next: () => {
          setTimeout(() => {
            this.cargarTareas();
          }, 0);
          if(this.tareaSelecionada){
            if (!this.tareaSelecionada.asignaciones) {
              this.tareaSelecionada.asignaciones = [];
            }
            this.tareaSelecionada.asignaciones.push(alias);
          }
          this.http.notificarAsignacionMail(alias, tablero, this.formularioTarea.value.idTarea).subscribe();
        }
      });
  }

  deleteAsignacion(alias: string) {
    if (this.esEspectador) {
      return;
    }
    const tablero = this.idTablero || "";

    this.http.deleteAsignacion(tablero, this.formularioTarea.value.idTarea, alias)
      .subscribe({
        next: (respuesta) => {
          setTimeout(() => {
            this.cargarTareas();
          }, 0);
          if (this.tareaSelecionada && this.tareaSelecionada.asignaciones) {
          this.tareaSelecionada.asignaciones = this.tareaSelecionada.asignaciones
            .filter((a: string) => a !== alias);
          }
        }
      });
  }

}
