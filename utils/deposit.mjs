import { ethers } from "ethers";
import { insertAccountData } from "../db/db.js";
import { depositContractAbi, depositContractAddress } from "./dapps.mjs";

export async function deposit(db, ethAccount, l2Recipient) {
    // 1.1 查询eth账户余额
    let ethBalance;
    while (true) {
        try {
            ethBalance = await ethAccount.getBalance();
            if (ethBalance.eq(0)) {
                console.log("Eth balance is 0, wait for 1 minute");
                await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
                continue;
            } else {
                console.log("Eth balance is not 0, go to next step");
                break;
            }
        } catch (error) {
            console.log("Error in getBalance:", error);
            // 如果查询失败, 则等待10秒后重试
            await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
            continue;
        }
    }

    // 1.2 如果当前gas price小于15gwei, 则进行deposit
    while (true) {
        try {
            const baseFee = await ethAccount.provider.getFeeData();
            if (baseFee.gasPrice.lt(ethers.utils.parseUnits("150", "gwei"))) {
                console.log("Eth gas price is less than 150gwei, go to next step");
                break;
            } else {
                console.log("Eth gas price is more than 150gwei, wait for 100 seconds");
                await new Promise((resolve) => setTimeout(resolve, 100 * 1000));
                continue;
            }
        } catch (error) {
            console.log("Error in getFeeData:", error);
            // 如果查询失败, 则等待100秒后重试
            await new Promise((resolve) => setTimeout(resolve, 100 * 1000));
            continue;
        }
    }

    // 1.3 构建deposit交易参数
    // param1: starknet账户地址
    const l2RecipientBN = ethers.BigNumber.from(l2Recipient);
    // param2: 跨链金额, 总金额减去随机0.00500到0.00800的ETH
    const ethToSend = ethBalance.sub(ethers.utils.parseEther((Math.random() * 0.005 + 0.003).toFixed(5)));

    // 1.4 执行deposit交易
    let tx;
    while (true) {
        try {
            const depositContract = new ethers.Contract(depositContractAddress, depositContractAbi, ethAccount);
            tx = await depositContract.deposit(l2RecipientBN, { value: ethToSend });
            break;
        } catch (error) {
            console.log("Error in deposit:", error);
            // 如果执行失败, 则等待10秒后重试
            await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
            continue;
        }
    }

    // 1.5 等待交易确认, 并将交易哈希插入数据库
    let receipt;
    while (true) {
        try {
            receipt = await tx.wait();
            await insertAccountData(db, {
                starknetAddress: l2Recipient,
                ethAddress: ethAccount.address,
                depositTxHash: receipt.transactionHash,
            });
            break;
        } catch (error) {
            console.log("Error in wait:", error);
            // 如果执行失败, 则等待10秒后重试
            await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
            continue;
        }
    }

    // 打印from, to, value, txHash;
    console.log("Deposit from", ethAccount.address, "to", l2Recipient, "value", ethToSend.toString());
    console.log("Deposit txHash", receipt.transactionHash);
    return receipt.transactionHash;
}