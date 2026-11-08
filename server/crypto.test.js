import test from 'node:test';import assert from 'node:assert/strict';
import {Wallet} from 'ethers';import nacl from 'tweetnacl';import bs58 from 'bs58';
import {challengeText,verifyPair} from './crypto.js';
test('valid EVM + Solana signatures prove both keys',async()=>{
 const evm=Wallet.createRandom(), sol=nacl.sign.keyPair(), solana=bs58.encode(sol.publicKey);
 const message=challengeText({origin:'http://localhost:5173',evm:evm.address,solana,nonce:'123',expires:'2027-01-01'});
 const evmSignature=await evm.signMessage(message);
 const solanaSignature=bs58.encode(nacl.sign.detached(new TextEncoder().encode(message),sol.secretKey));
 assert.equal(verifyPair({message,evm:evm.address,solana,evmSignature,solanaSignature}),true);
 assert.equal(verifyPair({message:message+'tampered',evm:evm.address,solana,evmSignature,solanaSignature}),false);
});
