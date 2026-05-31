import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tablero',
  imports: [],
  templateUrl: './tablero.html',
  styles: ``,
})
export class Tablero {
  constructor(
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    console.log(id);
  }
}

