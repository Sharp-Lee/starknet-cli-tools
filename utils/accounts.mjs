import { Wallet } from "ethers";
import { Account, ec, stark, hash, uint256, Contract } from "starknet";
import { getStarkPair } from "./keys.mjs";

const erc20_abi = [{ "name": "Uint256", "size": 2, "type": "struct", "members": [{ "name": "low", "type": "felt", "offset": 0 }, { "name": "high", "type": "felt", "offset": 1 }] }, { "data": [{ "name": "previousOwner", "type": "felt" }, { "name": "newOwner", "type": "felt" }], "keys": [], "name": "OwnershipTransferred", "type": "event" }, { "data": [{ "name": "from_", "type": "felt" }, { "name": "to", "type": "felt" }, { "name": "value", "type": "Uint256" }], "keys": [], "name": "Transfer", "type": "event" }, { "data": [{ "name": "owner", "type": "felt" }, { "name": "spender", "type": "felt" }, { "name": "value", "type": "Uint256" }], "keys": [], "name": "Approval", "type": "event" }, { "name": "constructor", "type": "constructor", "inputs": [{ "name": "name", "type": "felt" }, { "name": "symbol", "type": "felt" }, { "name": "decimals", "type": "felt" }, { "name": "initial_supply", "type": "Uint256" }, { "name": "recipient", "type": "felt" }, { "name": "owner", "type": "felt" }], "outputs": [] }, { "name": "name_", "type": "function", "inputs": [], "outputs": [{ "name": "name", "type": "felt" }], "stateMutability": "view" }, { "name": "symbol", "type": "function", "inputs": [], "outputs": [{ "name": "symbol", "type": "felt" }], "stateMutability": "view" }, { "name": "totalSupply", "type": "function", "inputs": [], "outputs": [{ "name": "totalSupply", "type": "Uint256" }], "stateMutability": "view" }, { "name": "decimals", "type": "function", "inputs": [], "outputs": [{ "name": "decimals", "type": "felt" }], "stateMutability": "view" }, { "name": "balanceOf", "type": "function", "inputs": [{ "name": "account", "type": "felt" }], "outputs": [{ "name": "balance", "type": "Uint256" }], "stateMutability": "view" }, { "name": "allowance", "type": "function", "inputs": [{ "name": "owner", "type": "felt" }, { "name": "spender", "type": "felt" }], "outputs": [{ "name": "remaining", "type": "Uint256" }], "stateMutability": "view" }, { "name": "owner", "type": "function", "inputs": [], "outputs": [{ "name": "owner", "type": "felt" }], "stateMutability": "view" }, { "name": "transfer", "type": "function", "inputs": [{ "name": "recipient", "type": "felt" }, { "name": "amount", "type": "Uint256" }], "outputs": [{ "name": "success", "type": "felt" }] }, { "name": "transferFrom", "type": "function", "inputs": [{ "name": "sender", "type": "felt" }, { "name": "recipient", "type": "felt" }, { "name": "amount", "type": "Uint256" }], "outputs": [{ "name": "success", "type": "felt" }] }, { "name": "approve", "type": "function", "inputs": [{ "name": "spender", "type": "felt" }, { "name": "amount", "type": "Uint256" }], "outputs": [{ "name": "success", "type": "felt" }] }, { "name": "increaseAllowance", "type": "function", "inputs": [{ "name": "spender", "type": "felt" }, { "name": "added_value", "type": "Uint256" }], "outputs": [{ "name": "success", "type": "felt" }] }, { "name": "decreaseAllowance", "type": "function", "inputs": [{ "name": "spender", "type": "felt" }, { "name": "subtracted_value", "type": "Uint256" }], "outputs": [{ "name": "success", "type": "felt" }] }, { "name": "mint", "type": "function", "inputs": [{ "name": "to", "type": "felt" }, { "name": "amount", "type": "Uint256" }], "outputs": [] }, { "name": "transferOwnership", "type": "function", "inputs": [{ "name": "newOwner", "type": "felt" }], "outputs": [] }, { "name": "renounceOwnership", "type": "function", "inputs": [], "outputs": [] }]

// 导出一个异步函数 generateAccounts
export async function generateAccounts(mnemonic, startIndex, endIndex, provider) {
    //new Argent X account v0.2.3 :
    const argentXproxyClassHash = "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918";
    const argentXaccountClassHash = "0x33434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2";

    // 使用 ArgentX 的助记词生成钱包
    const walletMaster = Wallet.fromMnemonic(mnemonic);

    const accounts = [];
    for (let i = startIndex; i < endIndex; i++) {
        const starkKeyPairAX = await getStarkPair(i, walletMaster.privateKey);
        const starkKeyPubAX = ec.getStarkKey(starkKeyPairAX);

        // Calculate future address of the ArgentX account
        const AXproxyConstructorCallData = stark.compileCalldata({
            implementation: argentXaccountClassHash,
            selector: hash.getSelectorFromName("initialize"),
            calldata: stark.compileCalldata({ signer: starkKeyPubAX, guardian: "0" }),
        });
        const AXcontractAddress = hash.calculateContractAddressFromHash(
            starkKeyPubAX,
            argentXproxyClassHash,
            AXproxyConstructorCallData,
            0
        );

        const account = new Account(provider, AXcontractAddress, starkKeyPairAX);
        accounts.push({
            account: account,
            argentXproxyClassHash: argentXproxyClassHash,
            constructorCalldata: AXproxyConstructorCallData,
            addressSalt: starkKeyPubAX,
        });
    }

    return accounts;
}

export async function getBalance(address, tokenAddress, provider) {
    const erc20 = new Contract(erc20_abi, tokenAddress, provider);
    const res = await erc20.balanceOf(address);
    return uint256.uint256ToBN(res.balance).toString()
}

export async function transferToken(account, tokenAddress, to, amount) {
    const toAmount = uint256.bnToUint256(amount);
    const transferCallData = stark.compileCalldata({
        recipient: to,
        amount: { type: 'struct', low: toAmount.low, high: toAmount.high }
    });
    const { transaction_hash: transferTxHash } = await account.execute({
        contractAddress: tokenAddress,
        entrypoint: "transfer",
        calldata: transferCallData
    });
    console.log(`Transfer ${amount} to ${to} in tx ${transferTxHash}`);
}
