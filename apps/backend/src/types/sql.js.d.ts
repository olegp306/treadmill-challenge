declare module 'sql.js' {
  export interface BindParams {
    [key: string]: number | string | Uint8Array | null;
  }
  export interface ParamsObject {
    [key: string]: number | string | Uint8Array | null;
  }
  export interface QueryExecResult {
    columns: string[];
    values: (number | string | Uint8Array | null)[][];
  }
  export interface StatementIterator {
    step(): boolean;
    getAsObject(): Record<string, number | string | Uint8Array | null>;
    get(): (number | string | Uint8Array | null)[];
    getColumnNames(): string[];
    free(): boolean;
    run(...params: (number | string | Uint8Array | null)[]): void;
    bind(values?: (number | string | Uint8Array | null)[] | ParamsObject): boolean;
  }
  export interface Database {
    run(sql: string, params?: (number | string | Uint8Array | null)[] | ParamsObject): Database;
    exec(sql: string): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
    prepare(sql: string, ...args: unknown[]): StatementIterator;
  }
  export interface SqlJsStatic {
    Database: {
      new (data?: Uint8Array | number): Database;
    };
  }
  export default function initSqlJs(config?: { wasmBinary?: Uint8Array; locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
