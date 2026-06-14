import { Component } from '@angular/core';
import { Http } from '../../services/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carrusel',
  imports: [],
  templateUrl: './carrusel.html',
  styles: ``,
})
export class Carrusel {

    constructor(private http: Http, private router: Router){
  }

  ngOnInit(): void {
    this.http.sesionActiva$.subscribe(logueado => {
      if(logueado){
        this.router.navigate(['/home']);
      }
    });
  }


}
