import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { Http } from '../../services/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
declare var bootstrap: any;

@Component({
  selector: 'app-ingresar',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './ingresar.html',
  styles: ``,
})
export class Ingresar implements OnInit{

  constructor(private http: Http, private _cdr: ChangeDetectorRef){}

  @ViewChild('modalCodigo') modalRef!: ElementRef;

  mostrarError = false;
  loading = false;
  errorMessage?: string;

  mostrarErrorVerificar = false;
  loadingVerificar = false;
  errorMessageVerificar?: string;

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
    this.http.sesionActiva$.subscribe(logueado => {
      this.http.getAliasDelToken() || "";
      if (logueado) {
        this.router.navigate(['/home']);
      }
    });
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
          if(response.verificado === false){
            if(!this.usuarioForm.value.alias) return;
            
            this.http.getUsuario(this.usuarioForm.value.alias).subscribe({
              next: (usuario) => {
                this.http.enviarCodigo(usuario.alias, usuario.email, usuario.nombre).subscribe({
                  next: () => {
                    const modal = new bootstrap.Modal(this.modalRef.nativeElement);
                    modal.show();
                  }
                })
              },
              error: (err) => console.log(err)
            })
          }else{
            this.http.guardarToken(response.token);
            this.router.navigate(['/home']);
            this.loading = false;
          }
        },
        error: (err) => {
          console.log(err);
          console.log("Usuario o contraseña incorrecta!");
          switch(err.error.codigo){
            case "INACTIVO":
              this.errorMessage = "Usuario inactivo!";
              break;
            default:
              this.errorMessage = "Alias o contraseña inválido!"
              break;
          }
          this.mostrarError = true;
          this.loading = false;
          this._cdr.detectChanges();
          //Deberia salir un error de que el usuario esta inactivo en vez de este mismo error en todos los casos CULPA DE MATTHEW FREIRE RODRIGUEZ
        }
      })
    }
  }

  codigoForm = this.formBuilder.group({
    codigo: ['', {
      validators: [
        Validators.required,
        Validators.pattern('[0-9]{6}')
      ]
    }]
  })

  confirmarCodigo(): void{
    this.loadingVerificar = true;
    this.mostrarErrorVerificar = false;

    let alias = this.usuarioForm.value.alias;
    let codigo = Number(this.codigoForm.value.codigo);

    if(!alias || !codigo) return;

    this.http.verificarCodigo(alias, codigo).subscribe({
      next: () => {
        let credenciales = {"alias": alias, "password": this.usuarioForm.value.password};
        this.http.inicioSesion(credenciales).subscribe({
          next: (response) => {
            this.http.guardarToken(response.token);
            this.loadingVerificar = false;
            this.router.navigate(['/home']);
          },
          error: (err) => console.log(err)
        })
      },
      error: (err) => {
        this.loadingVerificar = false;
        this.errorMessageVerificar = "Código inválido o expirado";
        this.mostrarErrorVerificar = true;
        console.log(err);
      } 
    })
  }
}
