import { Component, OnInit } from '@angular/core';
// Hello Mango UI Component that is used to welcome developers
// and as a smoke test component.
@Component({
  selector: 'mango-hello-mango',
  template: `
    <p>
      Hello Mango
    </p>
  `,
  styles: [
  ]
})
export class HelloMangoComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
