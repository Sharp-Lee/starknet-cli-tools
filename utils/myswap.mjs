import { stark } from "starknet";
import { dapps } from "./dapps.mjs";

export async function executeMySwapMulticall(account, amountIn, path) {
    const multiCall = await account.execute(
        [
            {
                contractAddress: path.low,
                entrypoint: "approve",
                calldata: stark.compileCalldata({
                    spender: dapps["MySwap"]["address"],
                    amount: { type: 'struct', low: amountIn.toString(), high: '0' },
                })
            },
            {
                contractAddress: dapps["MySwap"]["address"],
                entrypoint: "swap",
                calldata: stark.compileCalldata({
                    pool_id: "4",
                    token_from_addr: path.low,
                    amount_from: { type: 'struct', low: amountIn.toString(), high: '0' },
                    amount_to_min: { type: 'struct', low: '1', high: '0' },
                })
            }
        ]
    ) 

    console.log("address: ", account.address, ", amountIn: ", amountIn.toString(), ", path_in: ", path.low, ", path_out: ", path.high, ", tx_hash: ", multiCall.transaction_hash);

    return multiCall.transaction_hash;
}