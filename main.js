import { BigNumber, ethers } from "ethers";
import { Provider, RpcProvider } from "starknet";
import path from "path";
import dotenv from "dotenv";
import { generateStarkAccounts, getStarkERC20TokenBalance, generateEthAccounts } from "./utils/accounts.mjs";
import { deposit } from "./utils/deposit.mjs";
import { deploy } from "./utils/deploy.mjs";
import { dapps, dappsList } from "./utils/dapps.mjs";
import { randomInt, shuffleArray, setTimeout64 } from "./utils/utils.mjs";
import { executeNamingMulticall } from "./utils/buynaming.mjs";
import { executeJediSwapMulticall } from "./utils/jediswap.mjs";
import { executeMySwapMulticall } from "./utils/myswap.mjs";
import { executeMintSquare } from "./utils/mintsquare.mjs";
import { setupDatabase, getAndRemoveFirstImageName } from "./db/db.js";

dotenv.config();

// 读取助记词
const mnemonic = process.env.MNEMONIC;
// 读取RPC URL
const starkSequencerUrl = process.env.StarkSequencerUrl;
const starkRpcUrl = process.env.StarkRpcUrl;
const ethRpcUrl = process.env.EthereumRpcUrl;
// 读取合约地址
const starkETHAddress = process.env.StarkETHAddress;
const starkUSDTAddress = process.env.StarkUSDTAddress;

// 创建stark sequencer provider
const starkSequencerProvider = new Provider({ sequencer: { baseUrl: starkSequencerUrl } })
// 创建rpc provider
const starkRpcProvider = new RpcProvider({ nodeUrl: starkRpcUrl });
// 创建ethers provider
const ethRpcProvider = new ethers.providers.JsonRpcProvider(ethRpcUrl);


// 交互函数
async function interact(db, account, dapp) {
    let accountData, callHash;
    let balanceUSDT, amountIn, pair_path;
    switch (dapp["name"]) {
        case "Naming":
            console.log("interact with Naming");
            try {
                callHash = await executeNamingMulticall(db, account);
                console.log("Execute naiming success:", callHash);
            } catch (error) {
                console.log("Execute naiming failed:", error);
                return;
            }
            break;
        case "MintSquare":
            try {
                const imagePath = path.join(".", "images");
                const imageName = await getAndRemoveFirstImageName(db);
                callHash = await executeMintSquare(db, account, imagePath, imageName);
                console.log("Execute mintsquare success:", callHash);
            } catch (error) {
                console.log("Execute mintsquare failed:", error);
                return;
            }
            break;
        case "MySwap":
            accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [account.address]);
            if (accountData && accountData.my_swap) {
                return null;
            }
            try {
                // 查询starknet账户的USDT余额
                balanceUSDT = await getStarkERC20TokenBalance(account.address, starkUSDTAddress, starkRpcProvider);
            } catch (error) {
                console.log("Get USDT balance failed:", error);
                return;
            }
            // 如果余额为0
            if (balanceUSDT === "0") {
                const min = 10000000000000;
                const max = 4900000000000000;
                amountIn = randomInt(min, max);
                pair_path = { type: 'struct', low: dapps["ETH"]["address"], high: dapps["USDT"]["address"] };
            } else {
                // 如果余额小于1000000, 全部swap
                if (BigNumber.from(balanceUSDT).lt(BigNumber.from("1000000"))) {
                    amountIn = BigNumber.from(balanceUSDT);
                } else {
                    // 如果余额大于1000000, 随机swap
                    amountIn = BigNumber.from(balanceUSDT).mul(randomInt(1, 9)).div(10);
                }
                pair_path = { type: 'struct', low: dapps["USDT"]["address"], high: dapps["ETH"]["address"] };
            }
            try {
                callHash = await executeMySwapMulticall(db, account, amountIn, pair_path);
                console.log("Execute myswap success:", callHash);
            } catch (error) {
                console.log("Execute myswap failed:", error);
                return;
            }
            break;
        case "JediSwap":
            accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [account.address]);
            if (accountData && accountData.jedi_swap) {
                return null;
            }
            try {
                // 查询starknet账户的USDT余额
                balanceUSDT = await getStarkERC20TokenBalance(account.address, starkUSDTAddress, starkRpcProvider);
            } catch (error) {
                console.log("Get USDT balance failed:", error);
                return;
            }
            // 如果余额为0
            if (balanceUSDT === "0") {
                const min = 10000000000000;
                const max = 4900000000000000;
                amountIn = randomInt(min, max);
                pair_path = { type: 'struct', low: dapps["ETH"]["address"], high: dapps["USDT"]["address"] };
            } else {
                // 如果余额小于1000000, 全部swap
                if (BigNumber.from(balanceUSDT).lt(BigNumber.from("1000000"))) {
                    amountIn = BigNumber.from(balanceUSDT);
                } else {
                    // 如果余额大于1000000, 随机swap
                    amountIn = BigNumber.from(balanceUSDT).mul(randomInt(1, 9)).div(10);
                }
                pair_path = { type: 'struct', low: dapps["USDT"]["address"], high: dapps["ETH"]["address"] };
            }
            try {
                callHash = await executeJediSwapMulticall(db, account, amountIn, pair_path);
                console.log("Execute jediswap success:", callHash);
            } catch (error) {
                console.log("Execute jediswap failed:", error);
                return;
            }
            break;
        default:
            break;
    }
    if (callHash) {
        for (let i = 0; i < 5; i++) {
            try {
                await starkRpcProvider.waitForTransaction(callHash);
                console.log("Wait for transaction success:", callHash);
                break;
            } catch (error) {
                console.log("Wait for transaction failed:", error);
            }
            // 随机等待2-10分钟, 等待交易确认
            await new Promise(resolve => setTimeout(resolve, randomInt(120000, 600000)));
        }
        return callHash;
    }
    return null;
}

// perform tasks
async function performTasks(starkAccount, ethAccount, db) {
    // 查询数据库表accounts中是否有starkAccount和ethAccount的数据, 如果没有则插入
    let accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ? AND eth_address = ?", [starkAccount.account.address, ethAccount.address]);
    if (accountData === undefined) {
        await db.run("INSERT INTO accounts (starknet_address, eth_address) VALUES (?, ?)", [starkAccount.account.address, ethAccount.address]);
        accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ? AND eth_address = ?", [starkAccount.account.address, ethAccount.address]);
    }
    // 1. deposit eth
    const depositTxHash = accountData ? accountData.deposit : null;
    if (!depositTxHash) {
        try {
            depositTxHash = await deposit(db, ethAccount, starkAccount.account.address);
        } catch (error) {
            console.log("Error in deposit:", error);
            return;
        }
    }
    // 2. 循环获取starknet账户的余额, 如果余额为0, 则等待一段时间后再次获取
    let starkBalance = "0";
    while (starkBalance === "0") {
        try {
            starkBalance = await getStarkERC20TokenBalance(starkAccount.account.address, starkETHAddress, starkRpcProvider);
            if (starkBalance === "0") {
                // 等待1分钟后再次获取
                await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000));
            }
        } catch (error) {
            console.log("Error in getStarkERC20TokenBalance:", error);
            // 等待10秒后再次获取
            await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
            continue;
        }
    }
    // 3. deploy starknet account
    const deployTxHash = accountData ? accountData.deploy : null;
    if (!deployTxHash) {
        try {
            deployTxHash = await deploy(db, starkAccount, starkRpcProvider);
        } catch (error) {
            console.log("Error in deploy:", error);
            return;
        }
    }
    // 4. 与dapps交互
    // 如果naming, mint_square, my_swap, jedi_swap中有至少一个没有交互过, 则与dapps交互
    while (!accountData.naming || !accountData.mint_square || !accountData.my_swap || !accountData.jedi_swap) {
        const shuffledDappAddresses = shuffleArray([...dappsList]);
        for (const dapp of shuffledDappAddresses) {
            let interacted = false;
            try {
                interacted = await interact(db, starkAccount.account, dapps[dapp]);
            } catch (error) {
                console.log("Error in interact:", error);
                continue;
            }
            // 如果是本次交互的, 随机等待30分钟-2小时
            if (interacted) {
                await new Promise((resolve) => setTimeout(resolve, randomInt(10 * 60 * 1000, 20 * 60 * 1000)));
            }
        }
        accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ? AND eth_address = ?", [starkAccount.account.address, ethAccount.address]);
    }
    // 5. 长期交互指定的dapp jedi_swap
    const jediSwapDapp = dapps["JediSwap"];
    while (true) {
        // 查询starknet账户的余额
        let starkBalance = "0";
        while (starkBalance === "0") {
            try {
                starkBalance = await getStarkERC20TokenBalance(starkAccount.account.address, starkETHAddress, starkRpcProvider);
                if (starkBalance === "0") {
                    // 等待10分钟后再次获取
                    await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1000));
                }
            } catch (error) {
                console.log("Error in getStarkERC20TokenBalance:", error);
                // 等待100秒后再次获取
                await new Promise((resolve) => setTimeout(resolve, 100 * 1000));
                continue;
            }
        }
        // 如果余额大于0.005 ETH, 则与jedi_swap交互
        const balance = ethers.utils.parseUnits(starkBalance, "wei");
        if (balance.lt(ethers.utils.parseEther("0.005"))) {
            // 完成交互, 退出
            return;
        }
        try {
            await interact(db, starkAccount.account, jediSwapDapp);
            // 使用setTimeout64随机等待15-45天, 再次交互
        } catch (error) {
            console.log("Error in interact:", error);
        }
        const delay = randomInt(10 * 60 * 1000, 20 * 60 * 1000);
        await new Promise((resolve) => setTimeout64(resolve, delay));
    }
}

// 生成100个以太坊账户以及对应的starknet账户
const start = 0, end = 15;
const ethAccounts = await generateEthAccounts(mnemonic, start, end, ethRpcProvider);
const starkAccounts = await generateStarkAccounts(mnemonic, start, end, starkRpcProvider);

// 主函数
async function main() {
    // 程序开始时间
    console.log("Start time:", new Date().toLocaleString());
    const db = setupDatabase();
    const tasks = [];
    try {
        // 一个starknet账户为一个用户, 遍历所有的starknet账户, 模拟用户交互
        let lastDelay = 0;
        for (let i = 0; i < starkAccounts.length; i++) {
            const starkAccount = starkAccounts[i];
            const ethAccount = ethAccounts[i];

            // 模拟用户使用时间的随机性, 每间隔30分钟到2小时有一个新用户进入交互
            const delay = randomInt(1 * 60 * 1000, 2 * 60 * 1000) + lastDelay;
            lastDelay = delay;
            const task = new Promise(async (resolve) => {
                try {
                    // 等待一段时间后, 模拟用户进入交互
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    await performTasks(starkAccount, ethAccount, db);
                    resolve();
                } catch (error) {
                    console.log("Error in performTasks:", error);
                    resolve();
                }
            });
            tasks.push(task);
        }

        // 等待所有用户交互完成
        await Promise.all(tasks);
    } catch (error) {
        console.log("Error in main:", error);
    }
}

main();