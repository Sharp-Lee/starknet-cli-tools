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
import { execute10kSwapMulticall } from "./utils/10kswap.mjs";
import { executeMintSquare } from "./utils/mintsquare.mjs";
import { setupDatabase, insertAccountData, getAndRemoveFirstImageName } from "./db/db.js";
import { checkImages } from "./utils/insertImages.mjs";

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
async function interact(account, dapp) {
    let callHash, balanceUSDT, amountIn, pair_path;
    const db = await setupDatabase();
    let accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [account.address]);
    switch (dapp["name"]) {
        case "Naming":
            console.log("address: ", account.address, " interact with Naming");
            try {
                if (accountData && accountData.naming) {
                    db.close();
                    return null;
                }
                callHash = await executeNamingMulticall(account);
                if (callHash) {
                    for (let i = 0; i < 3; i++) {
                        try {
                            console.log("Wait for transaction:", callHash);
                            await starkRpcProvider.waitForTransaction(callHash);
                            await insertAccountData(db, {
                                starknetAddress: account.address,
                                namingTxHash: callHash,
                            });
                            db.close();
                            console.log("address:", account.address, "Execute naiming success:", callHash);
                            return callHash;
                        } catch (error) {
                            console.log("Wait for transaction failed:", error);
                        }
                        // 随机等待1-3分钟, 等待交易确认
                        await new Promise(resolve => setTimeout(resolve, randomInt(60000, 180000)));
                    }
                }
                db.close();
                console.log("address:", account.address, "Execute naiming failed:", callHash);
                return null;
            } catch (error) {
                console.log("Execute naiming failed:", error);
                db.close();
                return;
            }
        case "MintSquare":
            console.log("address: ", account.address, " interact with MintSquare");
            try {
                if (accountData && accountData.mint_square) {
                    db.close();
                    return null;
                }
                const imagePath = path.join(".", "images");
                const imageName = await getAndRemoveFirstImageName(db);
                callHash = await executeMintSquare(account, imagePath, imageName);
                if (callHash) {
                    for (let i = 0; i < 3; i++) {
                        try {
                            console.log("Wait for transaction:", callHash);
                            await starkRpcProvider.waitForTransaction(callHash);
                            await insertAccountData(db, {
                                starknetAddress: account.address,
                                mintSquareTxHash: callHash,
                            })
                            db.close();
                            console.log("address:", account.address, "Execute mintsquare success:", callHash);
                            return callHash;
                        } catch (error) {
                            console.log("Wait for transaction failed:", error);
                        }
                        // 随机等待1-3分钟, 等待交易确认
                        await new Promise(resolve => setTimeout(resolve, randomInt(60000, 180000)));
                    }
                }
                db.close();
                console.log("address:", account.address, "Execute mintsquare failed:", callHash);
                return null;
            } catch (error) {
                db.close();
                console.log("Execute mintsquare failed:", error);
                return;
            }
        case "MySwap":
            console.log("address: ", account.address, " interact with MySwap");
            try {
                // 查询starknet账户的USDT余额
                balanceUSDT = await getStarkERC20TokenBalance(account.address, starkUSDTAddress, starkRpcProvider);
            } catch (error) {
                console.log("Get USDT balance failed:", error);
                db.close();
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
                callHash = await executeMySwapMulticall(account, amountIn, pair_path);
                if (callHash) {
                    for (let i = 0; i < 3; i++) {
                        try {
                            console.log("Wait for transaction:", callHash);
                            await starkRpcProvider.waitForTransaction(callHash);
                            await insertAccountData(db, {
                                starknetAddress: account.address,
                                mySwapTxHash: callHash,
                            });
                            db.close();
                            console.log("address:", account.address, "Execute myswap success:", callHash);
                            return callHash;
                        } catch (error) {
                            console.log("Wait for transaction failed:", error);
                        }
                        // 随机等待1-3分钟, 等待交易确认
                        await new Promise(resolve => setTimeout(resolve, randomInt(60000, 180000)));
                    }
                }
                db.close();
                console.log("address:", account.address, "Execute myswap failed:", callHash);
                return null;
            } catch (error) {
                console.log("Execute myswap failed:", error);
                db.close();
                return;
            }
        case "10kSwap":
            console.log("address: ", account.address, " interact with 10kSwap");
            try {
                // 查询starknet账户的USDT余额
                balanceUSDT = await getStarkERC20TokenBalance(account.address, starkUSDTAddress, starkRpcProvider);
            } catch (error) {
                console.log("Get USDT balance failed:", error);
                db.close();
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
                callHash = await execute10kSwapMulticall(account, amountIn, pair_path);
                if (callHash) {
                    for (let i = 0; i < 3; i++) {
                        try {
                            console.log("Wait for transaction:", callHash);
                            await starkRpcProvider.waitForTransaction(callHash);
                            await insertAccountData(db, {
                                starknetAddress: account.address,
                                kSwapTxHash: callHash,
                            });
                            db.close();
                            console.log("Execute 10kswap success:", callHash);
                            return callHash;
                        } catch (error) {
                            console.log("Wait for 10kswap transaction failed:", error);
                        }
                        // 随机等待1-3分钟, 等待交易确认
                        await new Promise(resolve => setTimeout(resolve, randomInt(60000, 180000)));
                    }
                }
                db.close();
                return null;
            } catch (error) {
                console.log("Execute 10kswap failed:", error);
                db.close();
                return null;
            }
        case "JediSwap":
            console.log("address: ", account.address, " interact with JediSwap");
            try {
                // 查询starknet账户的USDT余额
                balanceUSDT = await getStarkERC20TokenBalance(account.address, starkUSDTAddress, starkRpcProvider);
            } catch (error) {
                console.log("Get USDT balance failed:", error);
                db.close();
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
                callHash = await executeJediSwapMulticall(account, amountIn, pair_path);
                if (callHash) {
                    for (let i = 0; i < 3; i++) {
                        try {
                            console.log("Wait for transaction:", callHash);
                            await starkRpcProvider.waitForTransaction(callHash);
                            await insertAccountData(db, {
                                starknetAddress: account.address,
                                jediSwapTxHash: callHash,
                            });
                            db.close();
                            console.log("Execute jediswap success:", callHash);
                            return callHash;
                        } catch (error) {
                            console.log("Wait for transaction failed:", error);
                        }
                        // 随机等待1-3分钟, 等待交易确认
                        await new Promise(resolve => setTimeout(resolve, randomInt(60000, 180000)));
                    }
                }
                db.close();
                return null;
            } catch (error) {
                console.log("Execute jediswap failed:", error);
                db.close();
                return;
            }
        default:
            break;
    }
}

// perform tasks
async function performTasks(starkAccount, ethAccount) {
    const db = await setupDatabase();
    // 查询数据库表accounts中是否有starkAccount和ethAccount的数据, 如果没有则插入
    let accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ? AND eth_address = ?", [starkAccount.account.address, ethAccount.address]);
    if (accountData === undefined) {
        await db.run("INSERT INTO accounts (starknet_address, eth_address) VALUES (?, ?)", [starkAccount.account.address, ethAccount.address]);
        accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ? AND eth_address = ?", [starkAccount.account.address, ethAccount.address]);
    }
    // 1. deposit eth
    let depositTxHash = accountData ? accountData.deposit : null;
    if (!depositTxHash) {
        try {
            depositTxHash = await deposit(db, ethAccount, starkAccount.account.address);
        } catch (error) {
            console.log("Error in deposit:", error);
            db.close();
            return;
        }
    } else {
        console.log("Deposit already done");
    }
    // 2. 循环获取starknet账户的余额, 如果余额为0, 则等待一段时间后再次获取
    let starkBalance = "0";
    while (starkBalance === "0") {
        try {
            starkBalance = await getStarkERC20TokenBalance(starkAccount.account.address, starkETHAddress, starkRpcProvider);
            if (starkBalance === "0") {
                // 等待1分钟后再次获取
                console.log("Stark address: ", starkAccount.account.address, "balance is 0, wait for 1 minute...");
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
    let deployTxHash = accountData ? accountData.deploy : null;
    if (!deployTxHash) {
        try {
            deployTxHash = await deploy(db, starkAccount, starkRpcProvider);
            if (deployTxHash === 2) {
                console.log("Deploy failed, stark address: ", starkAccount.account.address);
                db.close();
                return;
            }
        } catch (error) {
            console.log("Error in deploy:", error);
            db.close();
            return;
        }
    }
    // 4. 删除已mint的图片
    // if (accountData && accountData.mint_square) {
    //     try {
    //         await getAndRemoveFirstImageName(db);
    //     } catch (error) {
    //         console.log("Error in getAndRemoveFirstImageName:", error);
    //     }
    // }
    // 4. 与dapps交互
    // 如果naming, mint_square, my_swap, jedi_swap中有至少一个没有交互过, 则与dapps交互
    while (!accountData.naming || !accountData.mint_square || !accountData.my_swap || !accountData.k_swap || !accountData.jedi_swap) {
        const shuffledDappAddresses = shuffleArray([...dappsList]);
        for (const dapp of shuffledDappAddresses) {
            if ( (dapp["name"] === "MySwap" && accountData.my_swap) || (dapp["name"] === "10kSwap" && accountData.k_swap) || (dapp["name"] === "JediSwap" && accountData.jedi_swap) ) {
                continue;
            }
            let interacted = false;
            try {
                interacted = await interact(starkAccount.account, dapps[dapp]);
            } catch (error) {
                console.log("Error in interact:", error);
                continue;
            }
            // 如果是本次交互的, 随机等待30-60分钟
            if (interacted) {
                await new Promise((resolve) => setTimeout(resolve, randomInt(30 * 60 * 1000, 60 * 60 * 1000)));
            }
        }
        accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ? AND eth_address = ?", [starkAccount.account.address, ethAccount.address]);
    }
    db.close();
    // 5. 长期交互
    while (true) {
        // 从 jedi_swap my_swap k_swap中随机选择一个dapp
        const swaps = ["JediSwap", "MySwap", "10kSwap"];
        const swap = swaps[randomInt(0, swaps.length - 1)]
        const dapp = dapps[swap];
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
            console.log("Stark address: ", starkAccount.account.address, " done all interactions");
            return;
        }
        try {
            await interact(starkAccount.account, dapp);
        } catch (error) {
            console.log("Error in interact:", error);
        }
        // 使用setTimeout64随机等待15-45天, 再次交互
        const delay = randomInt(15 * 24 * 60 * 60 * 1000, 45 * 24 * 60 * 60 * 1000);
        await new Promise((resolve) => setTimeout64(resolve, delay));
    }
}

// 生成100个以太坊账户以及对应的starknet账户
const start = 8, end = 108;
const ethAccounts = await generateEthAccounts(mnemonic, start, end, ethRpcProvider);
const starkAccounts = await generateStarkAccounts(mnemonic, start, end, starkRpcProvider);

// 主函数
async function main() {
    // 程序开始时间
    console.log("Start time:", new Date().toLocaleString());
    const tasks = [];
    try {
        // 查询image_names表中是否有数据, 如果没有, 则插入数据
        await checkImages(start, end);
        // 一个starknet账户为一个用户, 遍历所有的starknet账户, 模拟用户交互
        let lastDelay = 0;
        for (let i = 0; i < starkAccounts.length; i++) {
            const starkAccount = starkAccounts[i];
            const ethAccount = ethAccounts[i];

            // 模拟用户使用时间的随机性, 每间隔30分钟-1小时有一个新用户进入交互
            const delay = randomInt(30 * 60 * 1000, 60 * 60 * 1000) + lastDelay;
            lastDelay = delay;
            const task = new Promise(async (resolve) => {
                try {
                    // 等待一段时间后, 模拟用户进入交互
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    await performTasks(starkAccount, ethAccount);
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