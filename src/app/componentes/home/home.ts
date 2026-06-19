import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Router, RouterLink } from '@angular/router';
import { TableroInterfaz } from '../../interfaces/tablero';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Colaborador } from '../../interfaces/colaborador';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './home.html',
  styles: ``,
})
export class Home {

  private fb = inject(FormBuilder);
  extPermitidas = ['image/jpg', 'image/jpeg', 'image/png'];
  mostrarError = false;

  formularioTablero: FormGroup = this.fb.group({
    titulo: ['', {
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
    color: ['']
  });

  rutaImagenes !: string;
  constructor(private http: Http, private router: Router, private cdr: ChangeDetectorRef){
    if(!http.estaLogueado){
      router.navigate(['/']);
    }else{
      this.rutaImagenes = this.http.getRutaBaseImg();
      
    }
  }
  aliasUsuario !: string;
  estaLogueado = false;

  private subTablerosCompartidos: Subscription = new Subscription();
  private subTableros: Subscription = new Subscription();
  ngOnInit(): void {
    let detener = false;
    this.http.verificarToken().subscribe({
      next: () => {},
      error: (err) => {
        // console.log(err);
        this.http.cerrarSesion();
        this.router.navigate(['/ingreso'], {state: {expirado: "true"}});
        detener = true;
      }
    })
    if(detener) return;

    this.http.sesionActiva$.subscribe(logueado => {
      this.estaLogueado = logueado;
      this.aliasUsuario = this.http.getAliasDelToken() || "";
      if(logueado){
        this.cargarTableros();
        this.cargarTablerosColaboraciones();
        this.http.notificarInvitacion().subscribe(resp => {
          if(resp.tieneNuevas){
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
            
          }
        })
      }else{
        this.tableros = [];
        this.aliasUsuario = "";
        this.router.navigate(['/']);
      }
    });

    this.subTableros = this.http.tableroCreado$.subscribe(() => {
      if(this.aliasUsuario){
        this.cargarTableros();
      }
    })
    this.subTablerosCompartidos = this.http.tableroAceptado$.subscribe(() => {
      if (this.aliasUsuario) {
        this.cargarTablerosColaboraciones();
      }
    })
  }

  ngOnDestroy(): void {
    this.subTablerosCompartidos.unsubscribe();
    this.subTableros.unsubscribe();
  }
  tableros: TableroInterfaz[] = [];
  tablerosColaborados: TableroInterfaz[] = [];
  paginaActual = 1;
  paginaActualColaborador = 1;
  private tablerosPorPagina = 3;

  private cargarTableros(): void {
    this.http.getTablerosAlias(this.aliasUsuario)
      .subscribe({
        next: (tableros) => {
          this.tableros = tableros;
          //console.log(tableros)
          this.cdr.detectChanges();
        },
        error: (err) => {
          // console.log(err);
          this.http.cerrarSesion();
          this.router.navigate(['/ingreso'], {state: {expirado: "true"}});
          return;
        }
      });
  }
  private cargarTablerosColaboraciones(): void{
    this.http.getTablerosColaborados(this.aliasUsuario)
      .subscribe(tableros => {
        this.tablerosColaborados = tableros;
        this.cdr.detectChanges();
      })
  }
  getTablerosPaginados(lista: TableroInterfaz[], pagina: number): TableroInterfaz[] {
    const inicio = (pagina - 1) * this.tablerosPorPagina;
    const fin = inicio + this.tablerosPorPagina;

    return lista.slice(inicio,fin);
  }

  getTotalPaginas(lista: TableroInterfaz[], incluirCrear: boolean): number {

    const extras = incluirCrear ? 1 : 0;

    return Math.max(1,
      Math.ceil((lista.length + extras) / this.tablerosPorPagina)
    );
  }

  cambiarPagina(numero: number, tipo: string, event?: Event): void {
    
    if (tipo === 'propios') {
      this.paginaActual = numero
    } else {
      this.paginaActualColaborador = numero;
    }
    (event?.target as HTMLElement)?.blur();
  }

  siguiente(tipo: string) : void {
    const pagina = tipo === 'propios' ? this.paginaActual : this.paginaActualColaborador;

    const total = tipo === 'propios' ? this.getTotalPaginas(this.tableros, true) : this.getTotalPaginas(this.tablerosColaborados, false);
    if(pagina < total){
      if (tipo === 'propios') {
        this.paginaActual++;
      } else {
        this.paginaActualColaborador++;
      }
    }
  }
  anterior(tipo: string): void {
    const pagina = tipo === 'propios' ? this.paginaActual : this.paginaActualColaborador;

    if (pagina > 1) {
      if (tipo === 'propios') {
        this.paginaActual--;
      } else {
        this.paginaActualColaborador--;
      }
    }
  }
  getPaginasVisibles(lista: TableroInterfaz[], paginaActual: number, incluirCrear: boolean): (number | string)[] {
    const paginas: (number | string)[] = [];

    const totalPaginas = this.getTotalPaginas(lista, incluirCrear);

    if (totalPaginas <= 10) {
      return Array.from(
        { length: totalPaginas },
        (valor,i) => i + 1
      );
    }

    paginas.push(1);

    const inicio = Math.max(2, paginaActual - 3);
    const fin = Math.min(totalPaginas - 1, paginaActual + 3);

    if(inicio > 2) {
      paginas.push("...");
    }
    for (let i = inicio; i <= fin; i++){
      paginas.push(i);
    }
    if(fin < totalPaginas - 1){
      paginas.push("...");
    }

    paginas.push(totalPaginas);

    return paginas;
  }

  crearTablero(): void{
    this.http.crearTablero(this.aliasUsuario).subscribe({
      next: () => {
        

        this.http.getTablerosAlias(this.aliasUsuario)
          .subscribe(tableros => {
           
            this.tableros = tableros;
            this.cdr.detectChanges();
          }); 
      }
    });
  }
  tableroSeleccionado: TableroInterfaz | null = null;
  colaboradoresTablero: Colaborador[] = [];

  seleccionarTablero(tablero: TableroInterfaz, desdeOffCanvas: boolean): void{
    this.tableroSeleccionado = tablero;
    if(desdeOffCanvas){
      this.formularioTablero.patchValue({
        titulo: tablero.titulo,
        descripcion: tablero.descripcion,
        color: tablero.color
      });
      this.archivoSeleccionado = null;
      if(tablero.imagen){
        this.imagenPreview = this.rutaImagenes + tablero.imagen;
      }else{
        this.imagenPreview = null;
      }
      this.cdr.detectChanges();
    }else{
      this.http.getColaboradoresDeTablero(tablero.id)
        .subscribe(colaboradores => {

          this.colaboradoresTablero = [];

          this.colaboradoresTablero = colaboradores;
          this.cdr.detectChanges();
        });
    }
  }

  archivoSeleccionado: File | null = null;
  imagenPreview: string | ArrayBuffer | null = null;
  dragActivo = false;

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = true;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragActivo = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.procesarImagen(event.dataTransfer.files[0]);
    }
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;

    if(input.files?.length){
      this.procesarImagen(input.files[0]);  
    }
  }

  procesarImagen(file :File): void {
    this.archivoSeleccionado = file;

    if(!this.extPermitidas.includes(file.type)){
      this.mostrarError = true;
      this.imagenPreview = null;
      this.cdr.detectChanges();
      return;
    }

    this.mostrarError = false;

    const reader = new FileReader();

    reader.onload = () => {
      this.imagenPreview = reader.result;
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);
  }

  guardarCambiosTablero(): void {
    
    this.formularioTablero.markAllAsTouched();

    if(this.formularioTablero.invalid || this.mostrarError){
      return;
    }

    if(!this.tableroSeleccionado){
      return;
    }

    const body = this.formularioTablero.value;

    if(this.archivoSeleccionado) {
      this.http.subirImgTablero(this.archivoSeleccionado)
        .subscribe(response => {

          body.imagen = response.ruta;

          this.http.actualizarTablero(
            this.tableroSeleccionado!.id,
            body
          ).subscribe({
            next: () => {
              this.cargarTableros();
              const btnCerrar = document.getElementById('btnCerrarOffcanvas');
              btnCerrar?.click();
            }
          });
        })
    } else{
      this.http.actualizarTablero(
        this.tableroSeleccionado.id,
        body
      ).subscribe({
        next: () => {
          this.cargarTableros();
          const btnCerrar = document.getElementById('btnCerrarOffcanvas');
          btnCerrar?.click();
        }
      });
    }

    //console.log(body);
    
  }

  confirmarBorrarTablero(){
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
      if(result.isConfirmed && this.tableroSeleccionado) {
        this.http.borrarTablero(this.tableroSeleccionado.id).subscribe({
          next: () => {
            Swal.fire({
              title: "¡Tablero borrado!",
              text: "Tu tablero ha sido borrado exitosamente.",
              icon: "success"
            });
            this.cargarTableros();
            const btnCerrar = document.getElementById('btnCerrarOffcanvas');
            btnCerrar?.click();
          },
          error: (error) => {
            Swal.fire({
              title: "Error",
              text: "No se pudo borrar el tablero. Inténtalo de nuevo.",
              icon: "error"
            });
            console.log(error);
          }
        });
      }
    });
    if(!this.tableroSeleccionado){
      return;
    }
    
  }
}
