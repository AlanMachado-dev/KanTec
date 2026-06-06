import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  constructor(
    private ruta: ActivatedRoute, private http: Http, private router: Router, private cdr: ChangeDetectorRef
  ) { }

  idTablero: string | null = null;

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
        for(let i = 0; i < 4; i++){
          if(!this.idTablero){return console.log("error pendejo");}
          this.http.getTareasTableroColumna(this.idTablero,i).subscribe({
            next: (response) => {
              this.columnas[i].tareas = response;
              this.cdr.detectChanges();
            }
          })
        }        
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
 
}

