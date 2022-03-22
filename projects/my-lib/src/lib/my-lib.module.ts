import { NgModule } from '@angular/core';
import { HelloMangoComponent } from './hello-mango/hello-mango.component';
import { TableDataEditorComponent } from './table-data-editor/table-date-editor.component';
import { BrowserModule } from '@angular/platform-browser'
import { ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  declarations: [HelloMangoComponent, TableDataEditorComponent],
  imports: [
    BrowserModule,
 ReactiveFormsModule,
   AgGridModule.withComponents([])
  ],
  exports: [HelloMangoComponent, TableDataEditorComponent]
})
export class MyLibModule { }
