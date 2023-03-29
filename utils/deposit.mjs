import { ethers } from "ethers";
import { insertAccountData } from "../db/db.js";
import { depositContractAbi, depositContractAddress } from "./dapps.mjs";
import dotenv from "dotenv";
import { SequencerProvider } from "starknet";
dotenv.config();
const starkSequencerUrl = process.env.StarkSequencerUrl;
const starkSequencerProvider = new SequencerProvider({ baseUrl: starkSequencerUrl })

export async function deposit(db, ethAccount, l2Recipient) {
    console.log("address ", ethAccount.address, " start to deposit");
    // 1.1 查询eth账户余额
    let ethBalance;
    while (true) {
        try {
            ethBalance = await ethAccount.getBalance();
            if (ethBalance.eq(0)) {
                // 打印 eth account address 和 eth balance
                console.log("address: ", ethAccount.address, ", ethBalance: ", ethBalance.toString());
                await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
                continue;
            } else {
                console.log("address: ", ethAccount.address, ", ethBalance: ", ethBalance.toString(), ", go to next step");
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
            if (baseFee.gasPrice.lt(ethers.utils.parseUnits("25", "gwei"))) {
                console.log("Eth gas price is less than 25gwei, go to next step");
                break;
            } else {
                console.log("Eth gas price is more than 25gwei, wait for 100 seconds");
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
    // param1: 跨链金额, 0.022-0.025之间的随机数
    const ethToSend = ethers.utils.parseEther((Math.random() * 0.003 + 0.022).toFixed(8));
    // param2: starknet账户地址
    const l2RecipientBN = ethers.BigNumber.from(l2Recipient);

    console.log("l2RecipientBN: ", l2RecipientBN.toString());
    console.log("ethToSend: ", ethToSend.toString());

    // 1.4 执行deposit交易
    let tx;
    while (true) {
        try {
            const depositContract = new ethers.Contract(depositContractAddress, depositContractAbi, ethAccount);
            // 设置max priority fee per gas, max fee per gas and gas limit
            // const txParams = {
                // maxPriorityFeePerGas: ethers.utils.parseUnits("2.5", "gwei"),
                // maxFeePerGas: ethers.utils.parseUnits("150", "gwei"),
                // gasLimit: 180000,
            // };
            // 获取fee
            const fee = await starkSequencerProvider.estimateMessageFee({
                from_address: "993696174272377493693496825928908586134624850969",
                to_address: "0x073314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82",
                entry_point_selector: "0x2d757788a8d8d6f21d1cd40bce38a8222d70654214e96ff95d8086e684fbee5",
                payload: [l2Recipient.toLowerCase(), ethToSend.toHexString(), "0x0"]
            });
            tx = await depositContract.deposit(ethToSend.sub(fee.overall_fee), l2RecipientBN, { value: ethToSend });
            // tx = await depositContract.deposit(l2RecipientBN, { value: ethToSend, gasLimit: 180000 });
            console.log("address: ", ethAccount.address, ", deposit txHash: ", tx.hash);
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
            console.log("wait depost txHash: ", tx.hash);
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