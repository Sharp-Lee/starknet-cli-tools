import { stark } from "starknet";
import { dapps } from "./dapps.mjs";
import { insertAccountData } from "../db/db.js";

export async function executeJediSwapMulticall(db, account, amountIn, path) {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
    const multiCall = await account.execute(
        [
            {
                contractAddress: path.low,
                entrypoint: "approve",
                calldata: stark.compileCalldata({
                    spender: dapps["JediSwap"]["address"],
                    amount: { type: 'struct', low: amountIn.toString(), high: '0' },
                })
            },
            {
                contractAddress: dapps["JediSwap"]["address"],
                entrypoint: "swap_exact_tokens_for_tokens",
                calldata: stark.compileCalldata({
                    amountIn: { type: 'struct', low: amountIn.toString(), high: '0' },
                    amountOutMin: { type: 'struct', low: '1', high: '0' },
                    path_len: "2",
                    path: path,
                    to: account.address,
                    deadline: deadline.toString()
                })
            }
        ]
    )

    await insertAccountData(db, {
        starknetAddress: account.address,
        jediSwapTxHash: multiCall.transaction_hash,
    });
    
    return multiCall.transaction_hash;
}