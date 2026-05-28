import { Component } from '@angular/core';
import { Http } from '../../services/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styles: ``,
})
export class Home {
  constructor(private http: Http, router: Router){
    if(!http.estaLogueado){
      router.navigate(['/']);
    }
  }
  
}
