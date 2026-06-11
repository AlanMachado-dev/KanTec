import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ingresar',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './ingresar.html',
  styles: ``,
})
export class Ingresar implements OnInit{

  constructor(private http: Http, private _cdr: ChangeDetectorRef){}

  mostrarError = false;
  loading = false;

  ngOnInit(): void {
    const state = history.state;
    if(state.expirado == "true"){
      Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        // didOpen: (toast) => {
        //   toast.onmouseenter = Swal.stopTimer;
        //   toast.onmouseleave = Swal.resumeTimer;
        // }
      }).fire({
        icon: "warning",
        title: "¡Sesión inválida!"
      });
    }
  }

  formBuilder = inject(FormBuilder);

  private router = inject(Router);

  usuarioForm = this.formBuilder.group({
    alias: ['', Validators.required],
    password: ['', Validators.required]
  })

  onSubmit(){
    this.mostrarError = false;
    this.loading = true;
    if(this.usuarioForm.valid){
      this.http.inicioSesion(this.usuarioForm.value as any).subscribe({
        next: (response) => {
          this.http.guardarToken(response.token);
          // setTimeout(() => { //deberia agregar un sweetAlert (#sponsor) mientras carga y no un timeout
            this.router.navigate(['/home']);
          // }, 500);
          this.loading = false;
        },

        error: (err) => {
          console.log(err);
          console.log("Usuario o contraseña incorrecta!");
          this.mostrarError = true;
          this.loading = false;
          this._cdr.detectChanges();
        }
      })
    }
  }
}
