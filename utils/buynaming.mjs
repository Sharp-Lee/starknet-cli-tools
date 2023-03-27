import { stark } from "starknet";
import { randomInt, randomString, from_special_38_to_decimal } from "./utils.mjs";
import { dapps } from "./dapps.mjs";
import { insertAccountData } from "../db/db.js";

export async function executeNamingMulticall(db, account) {
    const accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [account.address]);
    if (accountData && accountData.naming) {
        return null;
    }
    const min = 10000000000;
    const max = 999999999999;
    const starknetid = randomInt(min, max);
    const minLen = 5;
    const maxLen = 10;
    const randLen = randomInt(minLen, maxLen);
    const randStr = randomString(randLen);
    const domainid = from_special_38_to_decimal(randStr);

    const multiCall = await account.execute(
        [
            {
                contractAddress: dapps["ETH"]["address"],
                entrypoint: "approve",
                calldata: stark.compileCalldata({
                    spender: dapps["Naming"]["address"],
                    amount: { type: 'struct', low: '8999999999999875', high: '0' },
                })
            },
            {
                contractAddress: dapps["StarknetId"]["address"],
                entrypoint: "mint",
                calldata: stark.compileCalldata({
                    starknet_id: starknetid.toString()
                })
            },
            {
                contractAddress: dapps["Naming"]["address"],
                entrypoint: "buy",
                calldata: stark.compileCalldata({
                    token_id: starknetid.toString(),
                    domain: domainid.toString(),
                    days: "365",
                    resolver: "0",
                    address: account.address
                })
            },
            {
                contractAddress: dapps["Naming"]["address"],
                entrypoint: "set_address_to_domain",
                calldata: stark.compileCalldata({
                    domain_len: "1",
                    domain: domainid.toString()
                })
            }
        ]
    )

    console.log("buy domain: ", randStr);
    await insertAccountData(db, {
        starknetAddress: account.address,
        namingTxHash: multiCall.transaction_hash,
    });

    return multiCall.transaction_hash;
}
