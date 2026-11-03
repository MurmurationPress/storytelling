'use strict';
// Explicit author CLI. Nothing deploys as part of export; production needs a reviewed receipt.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {prepare} = require('./prepare-skip-publication.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = (file,value) => fs.writeFile(file, JSON.stringify(value,null,2)+'\n',{flag:'wx'});
async function inventory(root) {
  const result={};
  async function visit(dir) { for(const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name); if(entry.isSymbolicLink()) throw Error('Symlinks forbidden');
    if(entry.isDirectory()) await visit(file); else if(entry.isFile()) {const bytes=await fs.readFile(file);result[path.relative(root,file).split(path.sep).join('/')]={bytes:bytes.length,sha256:hash(bytes)};} else throw Error('Unexpected file');
  }}
  await visit(root); return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}
const digest = value => hash(JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)))));
async function checked(build) {
  const report=await read(path.join(build,'build-report.json'));
  if(report.mode!=='preview'||report.problems.length||report.warnings.length) throw Error('A warning-free preview build is required');
  const actual=await inventory(path.join(build,'site'));
  if(digest(actual)!==digest(report.publicFiles)) throw Error('Build changed since validation');
  return {report,artifact:digest(actual)};
}
function targetValid(t) {
  for(const key of ['project','previewBranch','productionBranch','slug']) if(!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(t[key]||'')) throw Error(`Invalid target ${key}`);
  if(t.previewBranch===t.productionBranch) throw Error('Preview branch must differ from production');
  return t;
}
function runner(args,cwd,json=false) {
  try {const out=execFileSync('npx',['--yes','wrangler@4.155.0',...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});return json?JSON.parse(out):out;}
  catch {throw Error('Wrangler command failed; check login/account and retry (credential output suppressed)');}
}
async function connection(build,target) {
  const who=runner(['whoami','--json'],build,true);
  const accounts=who.accounts||[];const account=target.accountId?accounts.find(a=>a.id===target.accountId):accounts.length===1?accounts[0]:null;
  if(!account) throw Error('Specify accountId in target when account selection is ambiguous');
  const credentials=runner(['auth','token','--json'],build,true);
  async function api(route) {const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account.id}/pages/projects/${target.project}${route}`,{headers:{Authorization:`Bearer ${credentials.token}`}});if(!response.ok) throw Error(`Cloudflare inspection failed (${response.status})`);const body=await response.json();if(!body.success) throw Error('Cloudflare inspection failed');return body.result;}
  const project=await api('');if(project.production_branch!==target.productionBranch) throw Error('Configured production branch differs from target');
  return {api,project,accountId:account.id};
}
async function deploy(build,site,target,branch,report,conn) {
  const previous=new Set((await conn.api('/deployments')).map(d=>d.id));
  runner(['pages','deploy',site,'--project-name',target.project,'--branch',branch,'--commit-hash',report.sourceRevision,'--commit-message',`Story Teller ${report.rendererVersion}; source ${report.sourceRevision}`],build);
  const deployments=await conn.api('/deployments');
  const env=branch===target.productionBranch?'production':'preview';
  const match=deployments.find(d=>!previous.has(d.id)&&d.environment===env&&d.deployment_trigger?.metadata?.branch===branch&&d.deployment_trigger?.metadata?.commit_hash===report.sourceRevision);
  if(!match || match.latest_stage?.status!=='success') throw Error('Cannot confirm successful deployment; inspect account before retrying');
  return {id:match.id,url:match.url,environment:match.environment};
}
async function command(action,opts,deps={connection,deploy}) {
  if(action==='prepare') {
    const target=targetValid(await read(opts.target));const project=path.resolve(opts.project);
    const repo=execFileSync('git',['-C',project,'rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
    if(!opts.renderer||!opts.source) throw Error('Explicit --renderer and --source revisions are required');
    const report=await prepare(repo,opts.source,opts.build,'preview',{project:path.relative(repo,project),slug:target.slug,renderer:opts.renderer,analytics:target.analytics,moreLink:target.moreLink});
    await write(path.join(opts.build,'target.json'),target); return report;
  }
  const build=path.resolve(opts.build); const {report,artifact}=await checked(build); const target=targetValid(await read(path.join(build,'target.json')));
  const conn=await deps.connection(build,target);const current=conn.project.canonical_deployment?.id||null;
  if(action==='preview') {
    const deployed=await deps.deploy(build,'site',target,target.previewBranch,report,conn);
    if(deployed.environment!=='preview') throw Error('Expected preview');
    const receipt={...deployed,artifact,target,sourceRevision:report.sourceRevision,rendererRevision:report.rendererRevision,productionAtPreview:current,createdAt:new Date().toISOString()};
    await write(path.join(build,`preview-${deployed.id}.json`),receipt);return receipt;
  }
  if(action!=='publish'&&action!=='rollback') throw Error('Expected prepare, preview, publish or rollback');
  const receipt=await read(path.join(build,`${action==='publish'?'preview':'production'}-${opts.reviewed}.json`));
  if(receipt.id!==opts.reviewed||receipt.artifact!==artifact||JSON.stringify(receipt.target)!==JSON.stringify(target)) throw Error('Receipt does not match build/target');
  const expected=action==='publish'?receipt.productionAtPreview:opts.expected;
  if((expected==='none'?null:expected)!==current) throw Error('Production changed: review current deployment before publishing');
  const remote=await conn.api(`/deployments/${receipt.id}`);
  if(remote.url!==receipt.url) throw Error('Deployment URL differs from receipt');
  if(remote.environment!==(action==='publish'?'preview':'production')) throw Error('Wrong reviewed deployment environment');
  if(action==='publish') {
    // Verify reviewed payload over HTTPS before any write. Operational noindex files are handled separately.
    for(const [name,item] of Object.entries(report.publicFiles)) {if(['_headers','_redirects','404.html'].includes(name)) continue;const response=await fetch(new URL(name,receipt.url+'/'));if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==item.sha256) throw Error(`Reviewed deployment differs: ${name}`);}
  }
  const stage=`production-site-${crypto.randomUUID()}`;const root=path.join(build,stage);
  await fs.cp(path.join(build,'site'),root,{recursive:true,errorOnExist:true});
  await fs.writeFile(path.join(root,'_headers'),(await fs.readFile(path.join(root,'_headers'),'utf8')).replace('  X-Robots-Tag: noindex, nofollow\n',''));
  await fs.writeFile(path.join(root,'robots.txt'),`User-agent: *\nAllow: /${target.slug}/\n`);
  // All reader/content bytes are copied unchanged; only indexing metadata differs.
  const promoted=await inventory(root);
  for(const [name,item] of Object.entries(report.publicFiles)) if(!['_headers','robots.txt'].includes(name)&&JSON.stringify(promoted[name])!==JSON.stringify(item)) throw Error('Promotion changed reviewed content');
  if(((await conn.api('')).canonical_deployment?.id||null)!==current) throw Error('Production changed while preparing upload');
  const deployed=await deps.deploy(build,stage,target,target.productionBranch,report,conn);
  if(deployed.environment!=='production') throw Error('Expected production');
  const result={...deployed,artifact,target,sourceRevision:report.sourceRevision,rendererRevision:report.rendererRevision,previousProduction:current,reviewed:receipt.id,action,publicFiles:promoted,createdAt:new Date().toISOString()};
  await write(path.join(build,`production-${deployed.id}.json`),result);return result;
}
module.exports={command,inventory,digest,checked,targetValid};
if(require.main===module) {
  const [action,...args]=process.argv.slice(2);const opts={};
  for(let i=0;i<args.length;i+=2) {if(!args[i].startsWith('--')||!args[i+1]) throw Error('Use --option value pairs');opts[args[i].slice(2)]=args[i+1];}
  command(action,opts).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
