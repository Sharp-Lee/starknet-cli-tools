import { stark } from "starknet";
import { dapps } from "./dapps.mjs";

export async function execute10kSwapMulticall(account, amountIn, path) {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
    const multiCall = await account.execute(
        [
            {
                contractAddress: path.low,
                entrypoint: "approve",
                calldata: stark.compileCalldata({
                    spender: dapps["10kSwap"]["address"],
                    amount: { type: 'struct', low: amountIn.toString(), high: '0' },
                })
            },
            {
                contractAddress: dapps["10kSwap"]["address"],
                entrypoint: "swapExactTokensForTokens",
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

    console.log("address: ", account.address, ", amountIn: ", amountIn.toString(), ", path_in: ", path.low, ", path_out: ", path.high, ", tx_hash: ", multiCall.transaction_hash);
     
    return multiCall.transaction_hash;
}