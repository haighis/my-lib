import { Injectable } from '@angular/core';
import concat from 'lodash.concat';
@Injectable({
  providedIn: 'root'
})
export class MyLibService {
  doSomething() {
    // Make sure tree shaking won't remove the lib during the build
    console.log(concat([1], 2))
    }
  constructor() { }
}
