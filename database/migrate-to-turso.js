require('dotenv').config();
const fs=require('fs');
const path=require('path');
const {createClient}=require('@libsql/client');
const {DatabaseSync}=require('node:sqlite');
const root=path.join(__dirname,'..');
const localPath=process.env.DELTA_DB_PATH ? (path.isAbsolute(process.env.DELTA_DB_PATH)?process.env.DELTA_DB_PATH:path.join(root,'data',process.env.DELTA_DB_PATH)) : path.join(root,'data','delta.sqlite');
if(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN) throw new Error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
if(!fs.existsSync(localPath)) throw new Error('SQLite não encontrado: '+localPath);
const local=new DatabaseSync(localPath,{readOnly:true});
const client=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
(async()=>{
 const tables=local.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
 for(const t of tables){if(t.sql) await client.execute(t.sql);}
 for(const t of tables){
  const name=t.name.replaceAll('"','""');
  const cols=local.prepare(`PRAGMA table_info("${name}")`).all();
  const rows=local.prepare(`SELECT * FROM "${name}"`).all();
  for(const row of rows){
   const names=cols.map(c=>`"${c.name.replaceAll('"','""')}"`).join(',');
   const marks=cols.map(()=>'?').join(',');
   await client.execute({sql:`INSERT INTO "${name}" (${names}) VALUES (${marks})`,args:cols.map(c=>row[c.name])});
  }
 }
 console.log('Migração concluída:',localPath,'->',process.env.TURSO_DATABASE_URL);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{try{local.close()}catch{}});
