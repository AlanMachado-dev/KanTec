import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Usuario } from '../../interfaces/usuario';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './perfil.html',
  styles: [':host { display: block; width: 100%; }'],
})
export class Perfil implements OnInit, OnDestroy {

  usuario: Usuario | null = null;
  imagenUsu: string | null = null;
  usuPropio: boolean = false;


  constructor(private http: Http, private router: Router, private ruta: ActivatedRoute, private _cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    let detener = false;
    this.http.verificarToken().subscribe({
      next: () => { },
      error: (err) => {
        console.log(err);
        this.http.cerrarSesion();
        this.router.navigate(['/ingreso'], { state: { expirado: "true" } });
        detener = true;
      }
    })
    if (detener) return;

    if (!this.http.estaLogueado()) {
      this.router.navigate(['/ingreso']);
    } else {
      // const alias = this.http.getAliasDelToken();
      const alias = this.ruta.snapshot.paramMap.get('alias');
      if (!alias) return;

      this.http.getUsuario(alias).subscribe({
        next: (response) => {
          this.usuario = response;
          this.imagenUsu = this.http.getRutaBaseImg() + this.usuario.imagen;
          if (this.http.getAliasDelToken() === alias) {
            this.usuPropio = true;
          }
          this._cdr.detectChanges();
        },
        error: (err) => {
          // console.log(err);
          // this.http.cerrarSesion();
          // this.router.navigate(['/ingreso'], {state: {expirado: "true"}});
        }
      })
    }
  }

  ngOnDestroy(): void {
    this.usuario = null;
    this.imagenUsu = null;
    this.usuPropio = false;
  }


  imagenSeleccionada!: File;
  extPermitidas = ['image/jpg', 'image/jpeg', 'image/png'];
  formBuilder = inject(FormBuilder);

  mostrarError = false;
  loading = false;
  errorMessage?: string;

  hoyStr = new Date().toISOString().split('T')[0]; 


  formularioUsuario = this.formBuilder.group({
    email: ['', {
      validators: [
        Validators.maxLength(60),
        Validators.email
      ]
    }],
    nombre: ['', {
      validators: [
        Validators.maxLength(50)
      ]
    }],
    imagen: ['',],
    fecNac: ['',
      Validators.max('2010-1-1' as any)
    ],
    bio: ['', {
      validators: [
        Validators.maxLength(100)
      ]
    }]

  })

  onFileSelected(event: any) {
    this.imagenSeleccionada = event.target.files[0];
    if (!this.extPermitidas.includes(this.imagenSeleccionada.type)) {
      this.errorMessage = "Tipo de imagen no permitida!"
      this.mostrarError = true;
      this._cdr.detectChanges();
      event.target.value = '';
    } else {
      this.mostrarError = false;
      this.formularioUsuario.get('imagen')?.setValue(this.imagenSeleccionada.name);
      this.formularioUsuario.get('imagen')?.markAsDirty();
      this._cdr.detectChanges();
    }
  }

  onSubmit() {
    if (this.formularioUsuario.valid && this.usuario?.alias) {
      const alias = this.usuario.alias;

      if (this.imagenSeleccionada && !this.extPermitidas.includes(this.imagenSeleccionada.type)) {
        this.errorMessage = "Tipo de imagen no permitida!";
        this.mostrarError = true;
        this.loading = false;
        this._cdr.detectChanges();
        return;
      }

      this.loading = true;

      if (this.imagenSeleccionada) {
        this.http.subirImgUsuario(this.imagenSeleccionada).subscribe({
          next: (respuestaImg) => {
            const datosParaEnviar = {
              ...this.formularioUsuario.value,
              imagen: respuestaImg.ruta
            };

            this.enviarDatosUsuario(alias, datosParaEnviar);
          },
          error: (err) => {
            console.error('Error al subir imagen:', err);
            this.loading = false;
            this._cdr.detectChanges();
          }
        });
      } else {
        this.enviarDatosUsuario(alias, this.formularioUsuario.value);
      }
    }
  }

  enviarDatosUsuario(alias: string, datos: any) {
    this.http.actualizarUsuario(alias, datos).subscribe({
      next: () => {
        if (this.usuario) {
          this.usuario.nombre = datos.nombre ?? '';
          this.usuario.email = datos.email ?? '';
          if (datos.imagen) {
            this.usuario.imagen = datos.imagen;
          }
        }
        this.formularioUsuario.reset();
        this.loading = false;
        this.ngOnInit();
        this.http.notificarPerfilModificado();
        let btn = document.getElementById("btnCerrarOffCanvas");
        btn?.click();
      },
      error: (err) => {
        console.error('Error al actualizar usuario:', err);
        this.loading = false;
        this._cdr.detectChanges();
      }
    });
  }

  confirmarBorrado(): void {
    Swal.fire({
      title: "¿Estás seguro/a?",
      text: "¡Esto será irreversible!",
      icon: "warning",
      showCancelButton: true,
      cancelButtonColor: "#3085d6",
      confirmButtonColor: "#d33",
      confirmButtonText: "Sí, borrar.",
      cancelButtonText: "No, cancelar."
    }).then((result) => {
      if (result.isConfirmed && this.usuario?.alias) {

        this.http.borrarUsuario(this.usuario.alias).subscribe({
          next: (response) => {
            Swal.fire({
              title: "¡Usuario borrado!",
              text: "Tu usuario ha sido borrado exitosamente.",
              icon: "success"
            });
            this.http.cerrarSesion();
            this.router.navigate(["/"]);
          },
          error: (error) => {
            Swal.fire({
              title: "Error",
              text: "No se pudo borrar el usuario. Inténtalo de nuevo.",
              icon: "error"
            });
          }
        });

      }
    });
  }

  afterEmail(emailTemp: string) {
    this.http.existeEmail(emailTemp).subscribe({
      next: (response) => {
        if (response.existe == "true") {
          this.errorMessage = "Email en uso!"
          this.mostrarError = true;
          this._cdr.detectChanges();
        } else {
          this.mostrarError = false;
          this._cdr.detectChanges();
        }
      },
      error: (err) => console.log(err)
    });
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.imagenUsu = this.http.getRutaBaseImg() + "usuarios/default.jpg";
  }

}
