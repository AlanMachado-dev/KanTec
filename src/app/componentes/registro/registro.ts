import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';

@Component({
  selector: 'app-registro',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './registro.html',
  styles: ``,
})
export class Registro {

  constructor(private http: Http){}

  formBuilder = inject(FormBuilder);
  private router = inject(Router);

  registroForm = this.formBuilder.group({
    alias: ['', {
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(30)
      ]
    }],
    password: ['', {
      validators: [
        Validators.required,
        Validators.minLength(8)
      ]
    }],
    email: ['', {
      validators: [
        Validators.required,
        Validators.maxLength(60)
      ]
    }],
    nombre: ['', {
      validators: [
        Validators.required,
        Validators.maxLength(50)
      ]
    }],
    imagen: ['', ]
  })

  onSubmit(){
    if(this.registroForm.valid){
      this.http.registrarUsuario(this.registroForm.value as any).subscribe({
        next: () => {
          this.http.inicioSesion(this.registroForm.value as any).subscribe({
            next: (response) => {
              console.log(response);
              console.log("Registro funciona!");
              this.router.navigate(['/ingreso']); //esto debe redireccionar a /home cuando exista
            }
          })
        }
      })
    }
  }
}
