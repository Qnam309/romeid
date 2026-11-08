import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import bs58 from 'bs58';
import {getAddress,Wallet,JsonRpcProvider,Contract,keccak256,toUtf8Bytes} from 'ethers';
import {nonce,digest,challengeText,verifyPair} from './crypto.js';
const app=express(); app.disable('x-powered-by');app.use(express.json({limit:'20kb'}));
const origin=process.env.APP_ORIGIN||'http://localhost:5173';
app.use(cors({origin}));
const dataPath=path.join(path.dirname(fileURLToPath(import.meta.url)),'data','links.json');
const pending=new Map();
const registryAbi=['function attest(address evm, bytes32 solanaKey, bytes32 proofDigest) external','function links(address) view returns (bytes32 solanaKey,bytes32 proofDigest,uint64 updatedAt,bool active)'];
async function anchorRecord(record){
 if(!process.env.ANCHOR_PRIVATE_KEY||!process.env.ANCHOR_CONTRACT_ADDRESS)return record;
 const rpc=process.env.HADRIAN_RPC||'https://hadrian.testnet.romeprotocol.xyz/';
 const provider=new JsonRpcProvider(rpc,200010);
 const signer=new Wallet(process.env.ANCHOR_PRIVATE_KEY,provider);
 const contract=new Contract(process.env.ANCHOR_CONTRACT_ADDRESS,registryAbi,signer);
 const tx=await contract.attest(record.evm,'0x'+Buffer.from(bs58.decode(record.solana)).toString('hex'),record.proofDigest);
 const receipt=await tx.wait(1);
 if(receipt.status!==1)throw Error('On-chain transaction reverted');
 return {...record,status:'Hadrian on-chain attested',txHash:tx.hash,contractAddress:process.env.ANCHOR_CONTRACT_ADDRESS};
}
async function readLinks(){try{return JSON.parse(await readFile(dataPath,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}}
async function saveLinks(links){await mkdir(path.dirname(dataPath),{recursive:true});await writeFile(dataPath,JSON.stringify(links,null,2))}
function validate(evm,solana){const e=getAddress(evm);const s=bs58.decode(solana);if(s.length!==32)throw Error('Invalid Solana public key');return e}
app.post('/api/challenge',(req,res)=>{try{
 const {evm,solana}=req.body;const address=validate(evm,solana);
 const n=nonce(),expires=new Date(Date.now()+5*60*1000).toISOString();
 const message=challengeText({origin,evm:address,solana,nonce:n,expires});
 pending.set(n,{message,evm:address,solana,expires:Date.parse(expires)});
 res.json({nonce:n,message,expires});
 }catch(e){res.status(400).json({error:e.message})}});
app.post('/api/link',async(req,res)=>{try{
 const {nonce:n,evmSignature,solanaSignature}=req.body;
 const p=pending.get(n); if(!p || Date.now()>p.expires) return res.status(400).json({error:'Challenge missing or expired'});
 pending.delete(n);
 if(!verifyPair({...p,evmSignature,solanaSignature})) return res.status(401).json({error:'Signature verification failed'});
 const links=await readLinks();
 for(const [key,link] of Object.entries(links)) if(link.solana===p.solana && key!==p.evm.toLowerCase()) return res.status(409).json({error:'Solana wallet already linked to another EVM wallet'});
 const record={evm:p.evm,solana:p.solana,proofDigest:digest(p.message+'|'+evmSignature+'|'+solanaSignature),updatedAt:new Date().toISOString(),status:'off-chain verified',txHash:null};
 let finalRecord=record;
 try{finalRecord=await anchorRecord(record)}catch(e){console.error('Anchor failed:',e.message);finalRecord={...record,anchorError:e.message}}
 links[p.evm.toLowerCase()]=finalRecord;await saveLinks(links);res.json(finalRecord);
 }catch(e){res.status(400).json({error:'Unable to verify wallet signatures'})}});
app.get('/api/profile/:evm',async(req,res)=>{try{const e=getAddress(req.params.evm);const links=await readLinks();const p=links[e.toLowerCase()];if(!p)return res.status(404).json({error:'No profile found'});res.json(p)}catch{res.status(400).json({error:'Invalid EVM address'})}});
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'RomeID',mode:process.env.ANCHOR_CONTRACT_ADDRESS&&process.env.ANCHOR_PRIVATE_KEY?'Hadrian anchoring enabled':'off-chain only (anchoring not configured)'}));
app.listen(Number(process.env.PORT||8787),()=>console.log('RomeID API listening'));
