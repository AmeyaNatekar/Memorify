declare module 'connect-sqlite3' {
  import session from 'express-session';
  export default function connectSqlite3(session: typeof import('express-session')): new (options?: any) => session.Store;
}