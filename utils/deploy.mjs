import { insertAccountData } from "../db/db.js";
import { randomInt } from "./utils.mjs";
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
    let deployTxHash = null, AXContractAddress = null;
    while (!deployTxHash) {
        try {
            const deployAccountPayload = {
                classHash: starkAccount.argentXproxyClassHash,
                constructorCalldata: starkAccount.constructorCalldata,
                contractAddress: starkAccount.account.address,
                addressSalt: starkAccount.addressSalt
            };
            const { transaction_hash: AXdAth, contract_address: AXcontractFinalAdress } = await starkAccount.account.deployAccount(deployAccountPayload);
            deployTxHash = AXdAth;
            AXContractAddress = AXcontractFinalAdress;
            console.log("address: ", starkAccount.account.address, ", deploy_tx_hash: ", deployTxHash, ", contract_address: ", AXContractAddress);
        } catch (error) {
            console.log("Error in deploy:", error);
            // 等待100秒后再次部署
            await new Promise((resolve) => setTimeout(resolve, 100 * 1000));
            continue;
        }
        for (let i = 0; i < 3; i++) {
            try {
                console.log("will wait for transaction: ", deployTxHash);
                await starkRpcProvider.waitForTransaction(deployTxHash);
                await insertAccountData(db, {
                    starknetAddress: starkAccount.account.address,
                    deployTxHash: deployTxHash,
                });
                console.log("deployAccount success, txHash: ", deployTxHash, ", contract_address: ", AXContractAddress);
                return deployTxHash;
            } catch (error) {
                // 随机等待1-3分钟后再次查询
                console.log("Error in waitForTransaction:", error);
                await new Promise((resolve) => setTimeout(resolve, randomInt(1, 3) * 60 * 1000));
            }
        }
        return 2;
    }
}