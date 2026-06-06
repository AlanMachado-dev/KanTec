import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Router, RouterLink } from '@angular/router';
import { Tablero } from '../../interfaces/tablero';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, ɵInternalFormsSharedModule, ReactiveFormsModule } from '@angular/forms';
import { Colaborador } from '../../interfaces/colaborador';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ɵInternalFormsSharedModule, ReactiveFormsModule],
  templateUrl: './home.html',
  styles: ``,
})
export class Home {

  private fb = inject(FormBuilder);

  formularioTablero: FormGroup = this.fb.group({
    titulo: [''],
    descripcion: [''],
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
    this.http.sesionActiva$.subscribe(logueado => {
      this.estaLogueado = logueado;
      this.aliasUsuario = this.http.getAliasDelToken() || "";
      if(logueado){
        this.cargarTableros();
        this.cargarTablerosColaboraciones();
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
  tableros: Tablero[] = [];
  tablerosColaborados: Tablero[] = [];
  paginaActual = 1;
  paginaActualColaborador = 1;
  private tablerosPorPagina = 3;

  private cargarTableros(): void {
    this.http.getTablerosAlias(this.aliasUsuario)
      .subscribe(tableros => {
        this.tableros = tableros;
        this.cdr.detectChanges();
      });
  }
  private cargarTablerosColaboraciones(): void{
    this.http.getTablerosColaborados(this.aliasUsuario)
      .subscribe(tableros => {
        this.tablerosColaborados = tableros;
        this.cdr.detectChanges();
      })
  }
  getTablerosPaginados(lista: Tablero[], pagina: number): Tablero[] {
    const inicio = (pagina - 1) * this.tablerosPorPagina;
    const fin = inicio + this.tablerosPorPagina;

    return lista.slice(inicio,fin);
  }

  getTotalPaginas(lista: Tablero[], incluirCrear: boolean): number {

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

    const total = tipo === 'propios' ? this.getTotalPaginas(this.tableros, true) : this.getTotalPaginas(this.tableros, false);
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
  getPaginasVisibles(lista: Tablero[], paginaActual: number, incluirCrear: boolean): (number | string)[] {
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
  tableroSeleccionado: Tablero | null = null;
  colaboradoresTablero: Colaborador[] = [];

  seleccionarTablero(tablero: Tablero, desdeOffCanvas: boolean): void{
    this.tableroSeleccionado = tablero;
    if(desdeOffCanvas){
      this.formularioTablero.patchValue({
        titulo: tablero.titulo,
        descripcion: tablero.descripcion,
        color: tablero.color
      });
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

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;

    if(input.files?.length){
      this.archivoSeleccionado = input.files[0];
    }
  }

  guardarCambiosTablero(): void {
    
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

  borrarTablero(){
    if(!this.tableroSeleccionado){
      return;
    }
    this.http.borrarTablero(this.tableroSeleccionado.id).subscribe({
      next: () => {
        this.cargarTableros();
        const btnCerrar = document.getElementById('btnCerrarOffcanvas');
        btnCerrar?.click();
      }
    });
  }
}
