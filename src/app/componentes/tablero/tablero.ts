import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Http } from '../../services/http';
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";

@Component({
  selector: 'app-tablero',
  imports: [],
  templateUrl: './tablero.html',
  styles: ``,
})
export class Tablero implements OnInit, AfterViewInit {
  constructor(
    private ruta: ActivatedRoute, private http: Http, private router: Router
  ) { }

  ngOnInit(): void {
    this.http.sesionActiva$.subscribe(logueado => {
      if (logueado) {
        const id = this.ruta.snapshot.paramMap.get('id');
        
        //console.log(id);
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
 
}

