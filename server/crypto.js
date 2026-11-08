import {verifyMessage, getAddress} from 'ethers';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {createHash, randomBytes} from 'node:crypto';
export const nonce = () => randomBytes(24).toString('hex');
export const digest = text => '0x'+createHash('sha256').update(text).digest('hex');
export function challengeText({origin, evm, solana, nonce: n, expires}) {
 return `RomeID wallet linking\nOrigin: ${origin}\nEVM: ${evm}\nSolana: ${solana}\nNonce: ${n}\nExpires: ${expires}\nAction: Link these two wallets to one public profile. No token approval or transfer is requested.`;
}
export function verifyPair({message,evm,solana,evmSignature,solanaSignature}) {
 if(getAddress(verifyMessage(message,evmSignature))!==getAddress(evm)) return false;
 const key=bs58.decode(solana), sig=bs58.decode(solanaSignature);
 if(key.length!==32 || sig.length!==64) return false;
 return nacl.sign.detached.verify(new TextEncoder().encode(message),sig,key);
}
