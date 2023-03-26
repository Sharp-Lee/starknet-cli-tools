import { ethers, utils } from "ethers";
import { Provider } from "starknet";
import dotenv from "dotenv";
import { generateAccounts } from "./utils/accounts.mjs";
import { setupDatabase, insertAccountData } from "./db/db.js";

dotenv.config();

// 生成随机的12个单词
const mnemonic = process.env.MNEMONIC;

// 根据助记词生成 HD 钱包
const hdNode = utils.HDNode.fromMnemonic(mnemonic);

// 创建provider
const provider = new ethers.providers.JsonRpcProvider("https://nd-002-127-980.p2pify.com/ba74b64c9df4d653894b356c0323d4c5");
const starkProvider = new Provider({ sequencer: { baseUrl: "https://nd-451-606-415.p2pify.com/802f9988e1d15d0d45e08c576892978c" } });
// 合约ABI（仅包含需要的函数）
const contractAbi = [{ "inputs": [{ "internalType": "uint256", "name": "l2Recipient", "type": "uint256" }], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function" }]
// 合约地址
const contractAddress = "0xae0Ee0A63A2cE6BaeEFFE56e7714FB4EFE48D419";

// 生成前100个派生地址
const contracts = [];
for (let i = 3; i < 18; i++) {
    const wallet = hdNode.derivePath(`m/44'/60'/0'/0/${i}`);
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractAbi, signer);
    contracts.push(contract);
}

async function deposit(db, contract, l2Recipient) {
    // 从数据库中获取上次的deposit交易hash
    const accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [l2Recipient]);
    const depositTxHash = accountData ? accountData.deposit : null;
    if (depositTxHash) {
        // 如果已经deposit过了, 则直接返回
        console.log("Already deposited:", contract.signer.address);
        return;
    }
    // 循环获取signer的余额,直到余额大于0.1
    let balance;
    while (true) {
        try {
            balance = await contract.signer.getBalance();
        } catch (error) {
            console.error("get balance error: ", error);
            // 等待10秒后重试
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue;
        }
        if (balance.gt(ethers.utils.parseEther("0.1"))) {
            console.log("Balance:", ethers.utils.formatEther(balance));
            break;
        }
        if (balance.gt(ethers.utils.parseEther("0.0000001"))) {
            // 已经deposit过了
            await insertAccountData(db, {
                ethAddress: contract.signer.address,
                starknetAddress: l2Recipient,
            });
            console.log("Already deposited:", contract.signer.address);
            return;
        }
        // 每一个小时检查一次
        console.log("Balance:", ethers.utils.formatEther(balance), "waiting...");
        await new Promise(resolve => setTimeout(resolve, 3600000));
    }
    // 获取base fee, 如果大于30Gwei, 则等待
    while (true) {
        try {
            const baseFee = await provider.getFeeData();
            if (baseFee.gasPrice.lt(ethers.utils.parseUnits("25", "gwei"))) {
                console.log("Base fee:", ethers.utils.formatUnits(baseFee.gasPrice, "gwei"));
                break;
            }
        } catch (error) {
            console.error("get base fee error: ", error);
        }
        // 每10分钟检查一次
        await new Promise(resolve => setTimeout(resolve, 600000));
    }

    const l2RecipientBN = ethers.BigNumber.from(l2Recipient);
    // 发送全部余额减去随机0.004500到0.010000的ETH
    const ethToSend = balance.sub(ethers.utils.parseEther((Math.random() * 0.0055 + 0.0045).toFixed(5)));
    console.log("ETH to send:", ethers.utils.formatEther(ethToSend));
    // 随机等待0到10分钟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 60000));
    // 循环发送交易, 直到交易成功
    while (true) {
        let tx;
        try {
            // 发送交易
            tx = await contract.deposit(l2RecipientBN, { value: ethToSend });
        } catch (error) {
            console.log();
            console.log("Transaction failed:", contract.signer.address);
            console.log("Transaction failed:", l2RecipientBN.toString());
            console.log();
            // 等待10秒后重试
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue;
        }
        console.log("Transaction sent:", tx.hash);
        try {
            const receipt = await tx.wait();
            // 将交易哈希插入数据库
            await insertAccountData(db, {
                ethAddress: contract.signer.address,
                starknetAddress: l2Recipient,
                depositTxHash: receipt.transactionHash,
            });
            console.log("Transaction mined:", receipt.transactionHash);
        } catch (error) {
            console.log("Transaction wait failed:", tx.hash);
        }
        break
    }
}

async function multiAccountInteraction() {
    try {
        // 初始化数据库
        const db = await setupDatabase();
        const accounts = await generateAccounts(mnemonic, 0, 15, starkProvider);

        // 遍历contracts, 每个30分钟-1小时执行一次deposit
        for (let i = 0; i < contracts.length; i++) {
            const contract = contracts[i];
            const l2Recipient = accounts[i].account.address;
            console.log();
            console.log("Account:", i+1);
            console.log("ETH Address:", contract.signer.address);
            console.log("L2 Recipient:", l2Recipient);
            await deposit(db, contract, l2Recipient);
            if (i === contracts.length - 1) {
                console.log("All done!");
            }
            // 如果不是最后一个, 则等待30分钟-1小时
            // if ( i < contracts.length - 1 ) {
            //     await new Promise(resolve => setTimeout(resolve, Math.random() * 3600000 + 1800000));
            // }else{
            //     console.log("All done!");
            // }
        }
    } catch (error) {
        console.error('Error in account interaction: ', error);
    }
}

multiAccountInteraction();
