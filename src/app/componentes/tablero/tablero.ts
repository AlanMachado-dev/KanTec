import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Http } from '../../services/http';

@Component({
  selector: 'app-tablero',
  imports: [],
  templateUrl: './tablero.html',
  styles: ``,
})
export class Tablero {
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
 
}

