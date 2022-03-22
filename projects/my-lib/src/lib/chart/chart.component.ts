import { Component, ViewEncapsulation, ViewChild, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, FormArray } from "@angular/forms";

import lodash from 'lodash';
import { HttpClient } from '@angular/common/http';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'lib-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit {

  // constructor() { }

  // ngOnInit(): void {
  // }
    // grid row data
    rowData: any[] = [];
    tableName: string;
    columnDefs: any[] = [];
    columns: string[] = [];
    selectedTableValue: string;
    public tableNames: SystemColumnItem[] = [];
    public tableNamesTest: SystemColumnItem[] = [];
    public systemColumnData: SystemColumnItem[] = [];
    public systemColumnDataNew: SystemColumnItem[] = [];
    
    @ViewChild('agGrid') agGrid!: AgGridAngular
    private gridApi: any;
    private gridColumnApi: any;   
    private defaultColDef: any;
    // Deleted ids contains the deleted sequenceIds1
    private deletedIds: number[] = [];
    // Changed Row Ids contains the added or updated rows identifiers
    private changedRowIds: Set<string> = new Set<string>();

    rowSelection;
    
    selectedOrg: SystemColumnItem;

    get selectedOrgMod() {
        return this.selectedOrg;
      }
    
      set selectedOrgMod(value) {
        this.selectedOrg = value;
    }

    // Get non system columns.
    // TODO allow the system to specify which columns are system only so we don't guess and have errors
    get nonSystemColumns() {
        return this.columns.filter(o => o != 'id' && o != 'inserted_at' && o != 'updated_at' );
    }

    get SystemColumnsInsert() {
        return this.columns.filter(o => o == 'id' || o == 'inserted_at' || o == 'updated_at' );
    }

    get SystemColumnsUpdate() {
        return this.columns.filter(o => o == 'inserted_at' || o == 'updated_at' );
    }

    onChange(selectedTableValue) {
        this.selectedTableValue = selectedTableValue.target.value;
        this.refreshTableData(this.selectedTableValue)
    }

    tableEditorForm: FormGroup;
    tables = ['schemas']
    refreshTableData(sel: string){
        //console.log(' in refresh table data ', this.selectedTableValue)
        var filteredSystemColumns: SystemColumnItem[] = lodash.filter(this.systemColumnData, {table_name: sel}); //.filter(o => o.table_name.includes(selectedTableValue));
        // Build Column Definitions
        var cols: any[] = [];
        for(var item of filteredSystemColumns) {
            // Don't allow editing of readonly ordinal position, updated at, inserted at columns 
            var isEditable = (item.ordinal_position == "1" ||
            item.column_name.includes('updated_at') || 
            item.column_name.includes('inserted_at')) ? false : true;
            var isVisible = !isEditable;
            cols.push( 
                { 
                    field: item.column_name,  
                    flex: 1,
                    resizable: true,
                    //hide: isVisible,
                    editable: isEditable,
                    sortable: true,
                    filter: true,
                })
        }
        
        var colNamesOnly = cols.map(o => o.field) as string[];
        this.columnDefs = cols;

        // Update the columns array with only strings of the column names
        this.columns = colNamesOnly;
        //var dataQuery: any = { dataviews: [ { table: "containers", columns: ["id", "title", "type"] }]};
        var dataQuery: any = { dataviews: [ { table: sel, columns: colNamesOnly }]};
        this.http.post("http://localhost:5000/read", dataQuery).subscribe((data: any) => {
            console.log('data ', data)
            this.rowData = data.dataViews[0].rows;
        });
    }

    // Add a new Row to the grid
    AddRow() {        
        const newRow = this.columns.reduce((acc,curr)=> (acc[curr]='',acc),{});
        console.log(' in add row ', newRow)
        // const res = this.gridApi.applyTransaction({
        //     add: newRow,
        //     addIndex: 0,
        //   });
        //   console.log( res)
        newRow['id'] = 0;
        this.rowData.push(newRow);
        this.gridApi.setRowData(this.rowData);
    }

    onCellValueChanged(params: any) {
        console.log(' in cell value changed ', params)
        this.changedRowIds.add(params.node.id);
        // clear out next cells when the user changes the type
//         if (params.colDef.field == 'type') {
//                 params.node.data.target = '';
//                 params.node.data.value = '';
//                 params.node.data.valueHidden = '';
//             }
//         }
    }   
    
    getInsertedRows(rows: any[]) {
        var newRows: any[] = [];
        for (let insert of rows.filter(o => o.id == 0)) {
            // Remove System Columns  
            for(let item of this.SystemColumnsInsert){
                delete insert[item]
            }
            newRows.push(insert);
        }
    }

    replaceAllKeysToString(myObj){
        Object.keys(myObj).forEach(function(key){
            console.log(' in rep ', myObj)
            typeof myObj[key] == 'object' ? this.replace(myObj[key]) : myObj[key]= String(myObj[key]);
        });
    }

    convertValuesToStringsDeep(obj) {
        return lodash.cloneDeepWith(obj, value => {
        return !lodash.isPlainObject(value) ? lodash.toString(value) : undefined;
        });
    }

    Save() {
        console.log(' in save ', this.selectedTableValue)
        if(this.selectedTableValue == undefined) {
            alert('Please select a database table')
        }
        if(this.selectedTableValue != undefined) {
            var changedRows: any[] = [];
            var colsInsert: string[] = [];
            var colsUpdate: string[] = [];
    
            // Gather insert/updates
            for (let item of this.changedRowIds) {
                var gridItem = this.gridApi.getRowNode(item).data;
                var NewgridItem = this.convertValuesToStringsDeep(gridItem);
                console.log(' in loop ', NewgridItem)
                changedRows.push(gridItem);
            }
    
            console.log(' changes ', changedRows)
            // const OriginalRows = [...changedRows];
            // insertedRows = [...OriginalRows];
            // updatedRows = [...OriginalRows];
            // var updatedRows = OriginalRows;
            
            const OriginalRows = lodash.cloneDeep(changedRows); //Array.from(changedRows);
    
            //let newrows = OriginalRows.filter(o => o.id == 0);
            //console.log('new rows ', newrows)
            //let johnTest = this.getInsertedRows(OriginalRows);
            console.log(' changes ', OriginalRows)
            const insertClone = lodash.cloneDeep(OriginalRows);
            const updateClone = lodash.cloneDeep(OriginalRows);
    
            var insertedRows: any[] = [];
            var updatedRows: any[] = [];
    
            // Get only columns we need todo. do this in some way where you get these columns from the system db somehow
            for (let insert of insertClone.filter(o => o.id == 0)) {
                // Remove System Columns  
                for(let item of this.SystemColumnsInsert){
                    delete insert[item]
                }
                insertedRows.push(insert);
            }
    
            var insertedRowsValues: any[] = [];
            // Get values
            for(let insert of insertedRows) {
                var props = Object.getOwnPropertyNames(insert);
                var row = [];
                for(let item of props) {
                    var val = insert[item];
                    row.push(val)
                }
                insertedRowsValues.push(row);
            }
    
            // console.log(' inserts ', insertClone.filter(o => o.id == 0), ' insertedRows ', insertedRows)
            // console.log(' updates ', updateClone.filter(o => o.id != 0))
    
            // Gather Updates
            for (let update of updateClone.filter(o => o.id != 0) ) {
                // Remove System Columns  
                for(let item of this.SystemColumnsUpdate){
                    delete update[item]
                }
                updatedRows.push(update);
            }
    
            var updatedRowsValues: any[] = [];
            // Get values
            for(let update of updatedRows) {
                var props = Object.getOwnPropertyNames(update);
                var row = [];
                for(let item of props) {
                    var val = update[item];
                    row.push(val)
                }
                updatedRowsValues.push(row);
            }

            // filter out the data
            // res = arr1.filter(item => !arr2.includes(item));
            // var newItems = changedItems.filter(o => !this.nonSystemColumns.includes(o));
            // console.log(' newIOtems ', newItems)
            
                // Get all delete items and create a new object with null fields that denotes a deleted Default Mapping
    //         for (let item of this.deletedIds) {
    //         }
    
            console.log(' in save ', insertedRows, updatedRows)

            // only proceed if there are changes
            if(insertedRows.length > 0 || updatedRows.length > 0) {
                var saveRequest: any = {};
                if(insertedRows.length > 0) {
                    colsInsert = Object.keys(insertedRows[0]);
                    if(insertedRows.length > 0) {
                        saveRequest.insert =  
                        {
                            table: this.selectedTableValue,
                            columns: colsInsert,
                            data: insertedRowsValues
                        };
                    }
                }

                if(updatedRows.length > 0) {
                    colsUpdate = Object.keys(updatedRows[0]);
                    saveRequest.update = {
                        table: this.selectedTableValue,
                        columns: colsUpdate,
                        data: updatedRowsValues
                    };
                }    
                    
                console.log(' save Rquest ', saveRequest);            
                
                this.http.post("http://localhost:5000/write", saveRequest).subscribe((data: any) => {
                   // this.rowData = data.dataViews[0].rows;
                });
            }
        }
    }

    DeleteRow() {
        const selectedRows = this.gridApi.getSelectedRows();
        console.log(' in del ', selectedRows)
        for (let item of selectedRows) {
            console.log(' in item ' , item)
            this.deletedIds.push(item.id);
        }
        console.log(' dels ', this.deletedIds)
        // const id = this.gridOptions.rowData[selectedRow.rowIndex].i
        this.rowData.splice(selectedRows.rowIndex, 1);
        this.gridApi.setRowData(this.rowData);

//          if (selectedRows) {
//             this.gridApi.applyTransaction({ remove: selectedRows });
//             var rowDataArray = this.rowData as any[];
//             var index = rowDataArray.findIndex(e => e.Id == selectedRows[0].Id);
//             this.rowData.splice(index, 1);
//          }
    }

    onGridReady(params: any) {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
    }

    ngOnInit() {
        this.tableEditorForm = this.fb.group({
            countryControl: ['Select']
          });
        
        this.tableName = this.selectedTableValue || 'schemas';
        this.http.get("http://localhost:4010/api/systemcolumns").subscribe((data: SystemColumnItem[]) => {
            this.systemColumnData = data;
            // Create a list of all table names
            for(var item of this.systemColumnData) {
                this.tableNames.push( { is_nullable: item.is_nullable, table_name: item.table_name, data_type: item.data_type, column_name: item.column_name, ordinal_position: item.ordinal_position} )
            }
            this.tableNames = lodash.uniqBy(this.tableNames, 'table_name');
            
            //this.refreshTableData('schemas')
            this.rowSelection = 'multiple';

            //this.tableNames[0].table_name
            // console.log(' data ', this.systemColumnData)
            // var filteredSystemColumns: SystemColumnItem[] = this.systemColumnData.filter(o => o.table_name == this.tableName);
            // // Build Column Definitions
            // var cols: any[] = [];
            // for(var item of filteredSystemColumns) {
            //     cols.push( { field: item.column_name })
            // }

            // //console.log(' table names ', this.systemColumnItems)

            // this.theColumnDefs = cols;
            // var dataQuery: any = { dataviews: [ { table: "containers", columns: ["id", "title", "type"] }]};
            // this.http.post("http://localhost:5000/read", dataQuery).subscribe((data: any) => {
            //     console.log(' in get data from read svc ', data.dataViews[0].rows, data)
            //     //theDataFromSvc = data.dataViews[0].rows;
            //     this.sampleData = data.dataViews[0].rows;
            // });
        }); 
    }

    constructor(private fb: FormBuilder, private http: HttpClient) {
        // var rows: any[] = [];
        // var dataQuery: any = { dataviews: [ { table: "containers", columns: ["id", "title", "type"] }]};
        // var theDataFromSvc: any[];
        // var theColumnsFromSvc: any[];
        // const readPromise = this.http.post("http://localhost:5000/read", dataQuery).toPromise();
        //const systemColumnsPromise = this.http.get("http://localhost:4010/api/systemcolumns").toPromise();
        
        // var systemColumnDataTest: SystemColumnItem[] = []; //[{ table_name: 'test', column_name: '', ordinal_position: '', is_nullable: '', data_type: ''},]
        
        // Promise.all([readPromise, systemColumnsPromise]).then(function(values: any) {
        //     console.log(values);
        //     theDataFromSvc = values[0];
        //     systemColumnDataTest = values[1];
            
        //     systemColumnDataTest = values[1];
        //     //this.systemColumnData = theColumnsFromSvc;
        //     console.log(' values[1] ', systemColumnDataTest)
        //     //this.systemColumnData = systemColumnDataTest;
        //     //var filteredSystemColumns: SystemColumnItem[] = this.systemColumnData.filter(o => o.table_name == this.tableName);
        //     // // Build Column Definitions
        //     // var cols: any[] = [];
        //     // for(var item of filteredSystemColumns) {
        //     //     cols.push( { field: item.column_name })
        //     // }
        //     // this.theColumnDefs = cols;

        //     //this.sampleData = theDataFromSvc; //[ { id: 1, title: 'test', type: 'APP' } ];    
        // });
        // console.log('in read systemColumnData ', systemColumnDataTest)    
        // readPromise.then((data: any)=>{
        //     //console.log("Promise resolved with: " + JSON.stringify(data));
        //     console.log("Promise resolved with: ", data);
        //   });
        // const res = await Promise.all([
        //     fetch("./names.json"),
        //     fetch("./names-mid.json"),
        //     fetch("./names-old.json")
        //   ]);
        
        // this.http.post("http://localhost:5000/read", dataQuery).subscribe((data: any) => {
        //     console.log(' in get data from read svc ', data.dataViews[0].rows, data)
        //     theDataFromSvc = data.dataViews[0].rows;
        // });
        // We need a schema to represent the table or tablesource (aka datasource (i don't like this name ))
        // this will have the table vanity properties like a table header name, 
        // columns that contains the proper column header names, whether the column is hidden
        // it will also contain the system column name in a property called field to create a mapping between the two
        // this will also have the column data type setup as each column will be configured in the application builder
        //this.sampleData = [ { id: 1, title: 'test', type: 'APP' } ];    
        
        

        // this.http.get("http://localhost:4010/api/systemcolumns").subscribe((data: SystemColumnItem[]) => {
        //     this.systemColumnData = data;
        //     var filteredSystemColumns: SystemColumnItem[] = this.systemColumnData.filter(o => o.table_name == this.tableName);
        //     // Build Column Definitions
        //     var cols: any[] = [];
        //     for(var item of filteredSystemColumns) {
        //         cols.push( { field: item.column_name })
        //     }
        //     this.theColumnDefs = cols;
        // }); 
    }

}
type SystemColumnItem = {
    table_name: string,
    column_name: string,
    ordinal_position: string,
    is_nullable: string,
    data_type: string
}