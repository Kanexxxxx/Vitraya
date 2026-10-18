import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { id, now } from './validation.mjs';

const tables=['products','campaigns','channels','templates','activity','deliveries','coupons'];
export class Store {
  constructor(dataDir) {
    mkdirSync(dataDir,{recursive:true});this.db=new DatabaseSync(path.join(dataDir,'vitraya.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    for(const table of tables)this.db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
    this.db.exec('CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');
    if(!this.db.prepare('SELECT id FROM settings WHERE id=1').get())this.db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify({brand:'Vitraya Studio',accent:'#d96a43',signature:''}));
  }
  all(table){if(!tables.includes(table))throw new Error('Tabela inválida');return this.db.prepare(`SELECT data FROM ${table} ORDER BY rowid DESC`).all().map(r=>JSON.parse(r.data));}
  get(table,key){if(!tables.includes(table))throw new Error('Tabela inválida');const row=this.db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(key);return row?JSON.parse(row.data):null;}
  save(table,value){if(!tables.includes(table))throw new Error('Tabela inválida');this.db.prepare(`INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(value.id,JSON.stringify(value));return value;}
  remove(table,key){if(!tables.includes(table))throw new Error('Tabela inválida');return this.db.prepare(`DELETE FROM ${table} WHERE id=?`).run(key).changes;}
  settings(value){if(value)this.db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(value));return JSON.parse(this.db.prepare('SELECT data FROM settings WHERE id=1').get().data);}
  activity(message){this.save('activity',{id:id(),message,createdAt:now()});this.db.exec('DELETE FROM activity WHERE rowid NOT IN (SELECT rowid FROM activity ORDER BY rowid DESC LIMIT 200)');}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  close(){this.db.close();}
}
