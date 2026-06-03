import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Router, RouterLink } from '@angular/router';
import { Tablero } from '../../interfaces/tablero';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, ɵInternalFormsSharedModule, ReactiveFormsModule } from '@angular/forms';

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
  });;

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

  private sub: Subscription = new Subscription();
  private subTableros: Subscription = new Subscription();
  ngOnInit(): void {
    this.sub = this.http.sesionActiva$.subscribe(logueado => {
      this.estaLogueado = logueado;
      this.aliasUsuario = this.http.getAliasDelToken() || "";
      if(logueado){
        this.cargarTableros();
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
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.subTableros.unsubscribe();
  }
  tableros: Tablero[] = [];
  paginaActual = 1;
  private tablerosPorPagina = 3;

  private cargarTableros(): void {
    this.http.getTablerosAlias(this.aliasUsuario)
      .subscribe(tableros => {
        this.tableros = tableros;
        this.cdr.detectChanges();
      });
  }

  get tablerosPaginados(): Tablero[] {
    const inicio = (this.paginaActual - 1) * this.tablerosPorPagina;
    const fin = inicio + this.tablerosPorPagina;

    return this.tableros.slice(inicio,fin);
  }

  get totalPaginas(): number {
    return Math.max(1,
      Math.ceil((this.tableros.length + 1) / this.tablerosPorPagina) // El + 1 es para que la tarjeta de crear Tablero quede en
      // una pagina separada
    );
  }

  cambiarPagina(numero: number, event?: Event): void {
    this.paginaActual = numero;

    (event?.target as HTMLElement)?.blur();
  }

  siguiente() : void {
    if(this.paginaActual < this.totalPaginas){
      this.paginaActual++;
    }
  }
  anterior(): void {
    if(this.paginaActual > 1){
      this.paginaActual--;
    }
  }
  get paginasVisibles(): (number | string)[] {
    const paginas: (number | string)[] = [];

    if(this.totalPaginas <= 10) {
      return Array.from(
        { length: this.totalPaginas },
        (valor,i) => i + 1
      );
    }

    paginas.push(1);

    const inicio = Math.max(2, this.paginaActual - 3);
    const fin = Math.min(this.totalPaginas - 1, this.paginaActual + 3);

    if(inicio > 2) {
      paginas.push("...");
    }
    for (let i = inicio; i <= fin; i++){
      paginas.push(i);
    }
    if(fin < this.totalPaginas - 1){
      paginas.push("...");
    }

    paginas.push(this.totalPaginas);

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

  seleccionarTablero(tablero: Tablero): void{
    this.tableroSeleccionado = tablero;

    this.formularioTablero.patchValue({
      titulo: tablero.titulo,
      descripcion: tablero.descripcion,
      color: tablero.color
    });
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
