// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
/**
 * RomeID: consent-based on-chain attestation registry.
 * The owner is a trusted attestor, which MUST verify both wallet signatures
 * off-chain before anchoring. This contract does not validate Ed25519 signatures.
 * Do not represent an unanchored off-chain profile as on-chain verified.
 */
contract RomeIDRegistry {
    address public immutable attestor;
    struct Link { bytes32 solanaKey; bytes32 proofDigest; uint64 updatedAt; bool active; }
    mapping(address => Link) public links;
    event Linked(address indexed evm, bytes32 indexed solanaKey, bytes32 proofDigest);
    event Unlinked(address indexed evm);
    error Unauthorized();
    constructor(address _attestor) { require(_attestor != address(0), "zero attestor"); attestor = _attestor; }
    modifier onlyAttestor() { if (msg.sender != attestor) revert Unauthorized(); _; }
    function attest(address evm, bytes32 solanaKey, bytes32 proofDigest) external onlyAttestor {
        require(evm != address(0) && solanaKey != bytes32(0) && proofDigest != bytes32(0), "invalid");
        links[evm] = Link(solanaKey, proofDigest, uint64(block.timestamp), true);
        emit Linked(evm, solanaKey, proofDigest);
    }
    function revoke(address evm) external onlyAttestor {
        delete links[evm]; emit Unlinked(evm);
    }
}
