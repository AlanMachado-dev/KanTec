import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Router, RouterLink } from '@angular/router';
import { Tablero } from '../../interfaces/tablero';
import { Usuario } from '../../interfaces/usuario';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styles: ``,
})
export class Home {
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

  cambiarPagina(numero: number): void {
    this.paginaActual = numero;
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
  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
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


}
