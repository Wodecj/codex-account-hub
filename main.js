const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');
const { readQuota } = require('./quota');
const { autoUpdater } = require('electron-updater');
const updateSource = require('./update-source.json');
let tray=null;
let quitting=false;
const root = path.join(app.getPath('userData'), 'profiles');
const registry = path.join(app.getPath('userData'), 'profiles.json');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
function readSettings() { try { const data=JSON.parse(fs.readFileSync(settingsPath,'utf8')); return {autoRefresh:data.autoRefresh===true}; } catch(e) { if(e.code==='ENOENT') return {autoRefresh:false}; throw new Error('无法读取设置'); } }
function read() { try { const v = JSON.parse(fs.readFileSync(registry, 'utf8')); if (!Array.isArray(v)) throw Error(); return v.filter(x => typeof x.name === 'string' && /^[0-9a-f-]{36}$/.test(x.id)); } catch (e) { if (e.code === 'ENOENT') return []; throw new Error('账号列表无法读取，请检查 profiles.json。'); } }
function save(v) { fs.mkdirSync(path.dirname(registry), {recursive:true}); const tmp = registry + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(v,null,2)); fs.renameSync(tmp,registry); }
function profile(id) { const item=read().find(x=>x.id===id); if(!item) throw Error('账号不存在'); return path.join(root,item.id); }
app.whenReady().then(() => {
 Menu.setApplicationMenu(null);
 const win = new BrowserWindow({width:1000,height:720,minWidth:720,minHeight:550,backgroundColor:'#101521',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 if (app.isPackaged && updateSource.owner && updateSource.repo) {
   autoUpdater.setFeedURL({provider:'github',owner:updateSource.owner,repo:updateSource.repo});
   autoUpdater.autoDownload=false;
   autoUpdater.autoInstallOnAppQuit=false;
   autoUpdater.on('update-available',async info=>{
     const result=await dialog.showMessageBox(win,{type:'info',title:'发现新版本',message:`发现新版本 ${info.version}`,detail:'是否下载更新？下载完成后可选择重新启动安装。',buttons:['下载更新','稍后'],defaultId:0,cancelId:1});
     if(result.response===0) autoUpdater.downloadUpdate().catch(error=>dialog.showErrorBox('更新下载失败',error.message));
   });
   autoUpdater.on('update-downloaded',async()=>{
     const result=await dialog.showMessageBox(win,{type:'info',title:'更新已下载',message:'更新已准备好',detail:'是否现在退出并安装更新？',buttons:['退出并安装','稍后'],defaultId:0,cancelId:1});
     if(result.response===0){quitting=true;autoUpdater.quitAndInstall();}
   });
   autoUpdater.on('error',error=>console.error('检查更新失败:',error.message));
   win.webContents.once('did-finish-load',()=>{autoUpdater.checkForUpdates().catch(error=>console.error('检查更新失败:',error.message));});
 }
 const icon=nativeImage.createFromPath(path.join(__dirname,'tray.png'));
 if (!icon.isEmpty()) {
   try {
     tray=new Tray(icon);
     tray.setToolTip('Codex Account Hub');
     const show=()=>{if(win.isMinimized())win.restore();win.show();win.focus();};
     tray.setContextMenu(Menu.buildFromTemplate([{label:'打开账号管理',click:show},{type:'separator'},{label:'退出',click:()=>{quitting=true;app.quit();}}]));
     tray.on('click',show);
     win.on('close',event=>{if(!quitting){event.preventDefault();win.hide();}});
   } catch(error) { console.error('无法创建系统托盘:',error.message); }
 }
 win.on('query-session-end',()=>{quitting=true;});
 win.loadFile('index.html');
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 ipcMain.handle('list',()=>read());
 ipcMain.handle('settings:get',()=>readSettings());
 ipcMain.handle('settings:set-auto-refresh',(_,value)=>{ if(typeof value!=='boolean') throw new Error('无效设置'); const settings={...readSettings(),autoRefresh:value}; fs.mkdirSync(path.dirname(settingsPath),{recursive:true}); const tmp=settingsPath+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(settings,null,2)); fs.renameSync(tmp,settingsPath); return settings; });
 ipcMain.handle('quota',async (_,id)=>{ const result=await readQuota(profile(id)); const buckets=result.rateLimitsByLimitId || (result.rateLimits ? {codex:result.rateLimits} : {}); return Object.entries(buckets).map(([id,b])=>({id,name:b.limitName || id,plan:b.planType,primary:b.primary,secondary:b.secondary})); });
 ipcMain.handle('add',(_,name)=>{ if(typeof name!=='string'||!name.trim()||name.length>60) throw Error('请输入 1–60 个字符的名称'); let list=read(); const item={id:randomUUID(),name:name.trim()}; fs.mkdirSync(path.join(root,item.id),{recursive:true}); list.push(item); save(list); return list; });
 ipcMain.handle('launch',async (_,id,mode)=>{ const dir=profile(id); if(!['login','start','status'].includes(mode)) throw Error('无效操作'); const escaped=dir.replace(/'/g,"''"); const command=`$env:CODEX_HOME = '${escaped}'; Write-Host 'Codex profile:' $env:CODEX_HOME; if (-not (Get-Command codex -ErrorAction SilentlyContinue)) { Write-Host 'Codex CLI not found. Install Node.js and run: npm install -g @openai/codex'; } else { codex ${mode==='login'?'login':mode==='status'?'login status':'--no-daemon'} }`; const encoded=Buffer.from(command,'utf16le').toString('base64'); const launcher=`Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit','-EncodedCommand','${encoded}') -ErrorAction Stop`; await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',launcher],{windowsHide:true}); let error=''; child.stderr.on('data',d=>error+=d.toString()); child.on('error',reject); child.on('close',code=>code===0?resolve():reject(new Error(error || '无法打开终端')));}); });
 ipcMain.handle('open-folder',async (_,id)=>{const error=await shell.openPath(profile(id)); if(error) throw Error(error);});
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{quitting=true;});
