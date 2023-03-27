import { insertAccountData } from "./db/db.js";
import { randomInt } from "./utils/utils.mjs";
export async function deploy(db, starkAccount, starkRpcProvider) {
    // 1 查询starknet账户 Class
    try {
        await starkRpcProvider.getClassAt(starkAccount.account.address);
        console.log("starknet account already deployed");
        return null;
    } catch (error) {
        console.log("starknet account not deployed, start to deploy");
    }

    // 2 循环部署starknet账户, 直到部署成功, 并且交易hash写入数据库
    let deployTxHash = null;
    while (!deployTxHash) {
        try {
            const deployAccountPayload = {
                classHash: starkAccount.argentXproxyClassHash,
                constructorCalldata: starkAccount.constructorCalldata,
                contractAddress: starkAccount.account.address,
                addressSalt: starkAccount.addressSalt
            };
            const { transaction_hash: AXdAth, contract_address: AXcontractFinalAdress } = await account.account.deployAccount(deployAccountPayload);
            console.log("deployAccount success, txHash: ", AXdAth, ", contract_address: ", AXcontractFinalAdress);
            deployTxHash = AXdAth;
        } catch (error) {
            console.log("Error in deploy:", error);
            // 等待100秒后再次部署
            await new Promise((resolve) => setTimeout(resolve, 100 * 1000));
            continue;
        }
        await insertAccountData(db, {
            starknetAddress: starkAccount.account.address,
            deployTxHash: deployTxHash,
        });
        for (let i = 0; i < 5; i++) {
            try {
                await starkRpcProvider.waitForTransaction(deployTxHash);
                break;
            } catch (error) {
                // 随机等待2-10分钟后再次查询
                await new Promise((resolve) => setTimeout(resolve, randomInt(2 * 60 * 1000, 10 * 60 * 1000))); 
            }
        }
    }
    return deployTxHash;
}