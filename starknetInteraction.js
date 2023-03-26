import { Provider, RpcProvider } from "starknet";
import path from "path";
import dotenv from "dotenv";
import { generateAccounts, getBalance } from "./utils/accounts.mjs";
import { dapps, dappsList } from "./utils/dapps.mjs";
import { randomInt, shuffleArray, getRandomArbitrary } from "./utils/utils.mjs";
import { executeNamingMulticall } from "./utils/buynaming.mjs";
import { executeJediSwapMulticall } from "./utils/jediswap.mjs";
import { executeMySwapMulticall } from "./utils/myswap.mjs";
import { executeMintSquare } from "./utils/mintsquare.mjs";
import { setupDatabase, insertAccountData } from "./db/db.js";

dotenv.config();

const sequencerProvider = new Provider({ sequencer: { baseUrl: "https://alpha-mainnet.starknet.io" } })
// const provider = new Provider({ sequencer: { baseUrl: "https://alpha-mainnet.starknet.io"}})
const provider = new RpcProvider({ nodeUrl: "https://nd-451-606-415.p2pify.com/802f9988e1d15d0d45e08c576892978c" });
const mnemonic = process.env.MNEMONIC;

const images = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg"];

async function interactWithDapp(account, dapp, db) {
    let multiCall, hash;
    if (dapp["name"] == "Naming") {
        console.log("interact with Naming");
        const accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [account.address]);
        if (accountData && accountData.naming) {
            return;
        }
        try {
            multiCall = await executeNamingMulticall(account, dapps);
        } catch (error) {
            console.log("executeNamingMulticall error: ", error);
            return;
        }
        if (multiCall) {
            await insertAccountData(db, {
                starknetAddress: account.address,
                namingTxHash: multiCall.transaction_hash,
            });
            for (let i = 0; i < 5; i++) {
                try {
                    await provider.waitForTransaction(multiCall.transaction_hash);
                    break;
                } catch (error) {
                    console.log("Transaction ", multiCall.transaction_hash, " failed, check for more details.");
                }
                // 随机等待等待2-10分钟，再次查询交易状态
                await new Promise(resolve => setTimeout(resolve, randomInt(120000, 600000)));
            }
        }
    }
    else if (dapp["name"] == "MintSquare") {
        console.log("interact with MintSquare");
        const accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [account.address]);
        if (accountData && accountData.mint_square) {
            return;
        }
        let imagePath, file;
        try {
            imagePath = path.join(".", "images");
            // 从 images 数组中顺序取出一张图片,不放回
            file = images.shift();
        } catch (error) {
            console.log("get image error: ", error);
            // 如果取不到图片，就退出
            return;
        }
        try {
            hash = await executeMintSquare(account, imagePath, file);
        } catch (error) {
            console.log("executeMintSquare error: ", error);
            return;
        }
        if (hash) {
            await insertAccountData(db, {
                starknetAddress: account.address,
                mintSquareTxHash: hash,
            });
            for (let i = 0; i < 5; i++) {
                try {
                    await provider.waitForTransaction(hash);
                    break;
                } catch (error) {
                    console.log("Transaction ", hash, " failed, check for more details.");
                }
                // 随机等待等待2-10分钟，再次查询交易状态
                await new Promise(resolve => setTimeout(resolve, randomInt(120000, 600000)));
            }
        }
    }
    else if (dapp["name"] == "MySwap") {
        console.log("interact with MySwap");
        const accountData = await db.get("SELECT * FROM accounts WHERE starknet_address = ?", [account.address]);
        if (accountData && accountData.my_swap) {
            return;
        }
        let balanceUSDT, amountIn, path;
        try {
            balanceUSDT = await getBalance(account.address, dapps["USDT"]["address"], provider);
        } catch (error) {
            console.log("getBalance error: ", error);
            return;
        }
        if (balanceUSDT === "0") {
            const min = 10000000000000;
            const max = 1000000000000000;
            amountIn = randomInt(min, max);
            path = { type: 'struct', low: dapps["ETH"]["address"], high: dapps["USDT"]["address"] };
        } else {
            // 如果 USDT 余额小于 1000000, 就全部转换
            if (Number(balanceUSDT) < 1000000) {
                amountIn = Math.floor(Number(balanceUSDT));
            } else {
                amountIn = Math.floor(Number(balanceUSDT) * getRandomArbitrary(0.1, 0.9));
            }
            path = { type: 'struct', low: dapps["USDT"]["address"], high: dapps["ETH"]["address"] };
        }
        try {
            multiCall = await executeMySwapMulticall(account, dapps, amountIn, path);
        } catch (error) {
            console.log("executeMySwapMulticall error: ", error);
            return;
        }
        if (multiCall) {
            await insertAccountData(db, {
                starknetAddress: account.address,
                jediSwapTxHash: multiCall.transaction_hash,
            });
            for (let i = 0; i < 5; i++) {
                try {
                    await provider.waitForTransaction(multiCall.transaction_hash);
                    break;
                } catch (error) {
                    console.log("Transaction ", multiCall.transaction_hash, " failed, check for more details.");
                }
                // 随机等待等待2-10分钟，再次查询交易状态
                await new Promise(resolve => setTimeout(resolve, randomInt(120000, 600000)));
            }
        }
    }
    else if (dapp["name"] == "JediSwap") {
        console.log("interact with JediSwap");
        let balanceUSDT, amountIn, path;
        try {
            balanceUSDT = await getBalance(account.address, dapps["USDT"]["address"], provider);
        } catch (error) {
            console.log("getBalance error: ", error);
            // 如果取不到余额，就退出
            return;
        }
        if (balanceUSDT === "0") {
            const min = 10000000000000;
            const max = 500000000000000;
            amountIn = randomInt(min, max);
            path = { type: 'struct', low: dapps["ETH"]["address"], high: dapps["USDT"]["address"] };
        } else {
            // 如果 USDT 余额小于 1000000, 就全部转换
            if (Number(balanceUSDT) < 1000000) {
                amountIn = Math.floor(Number(balanceUSDT));
            } else {
                amountIn = Math.floor(Number(balanceUSDT) * getRandomArbitrary(0.1, 0.9));
            }
            path = { type: 'struct', low: dapps["USDT"]["address"], high: dapps["ETH"]["address"] };
        }
        try {
            multiCall = await executeJediSwapMulticall(account, dapps, amountIn, path);
        } catch (error) {
            console.log("executeJediSwapMulticall error: ", error);
            return;
        }
        if (multiCall) {
            await insertAccountData(db, {
                starknetAddress: account.address,
                jediSwapTxHash: multiCall.transaction_hash,
            });
            for (let i = 0; i < 5; i++) {
                try {
                    await provider.waitForTransaction(multiCall.transaction_hash);
                    break;
                } catch (error) {
                    console.log("Transaction ", multiCall.transaction_hash, " failed, check for more details.");
                }
                // 随机等待等待2-10分钟，再次查询交易状态
                await new Promise(resolve => setTimeout(resolve, randomInt(120000, 600000)));
            }
        }
    }
}

async function performTasks(account, db) {
    // 循环判断账户是否有余额
    while (true) {
        let balance;
        try {
            balance = await getBalance(account.account.address, dapps["ETH"]["address"], provider);
        } catch (error) {
            console.log("getBalance error: ", error);
            console.log("getBalance error, waiting for 1 hour...");
            await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 60 * 1000));
            continue;
        }
        console.log(`Account ${account.account.address} has balance: ${balance} ETH.`);
        if (balance !== "0") {
            break;
        }
        console.log(`Account ${account.account.address} has no balance, waiting for 1 hour...`);
        // 每隔 1 小时检查一次
        await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 60 * 1000));
    }
    // 查询账户是否deploy
    let code;
    while (true) {
        try {
            code = await sequencerProvider.getCode(account.account.address)
            break;
        } catch (error) {
            console.log("getCode error: ", error);
        }
        // 每隔10秒检查一次
        await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
    }
    if (code.bytecode.length === 0) {
        // 随机等待2-10小时, 防止同时部署
        await new Promise((resolve) => setTimeout(resolve, randomInt(2 * 60 * 60 * 1000, 10 * 60 * 60 * 1000)));

        let txHash;
        // deploy账户, 循环检查直到成功
        while (true) {
            let count = 0;
            try {
                const deployAccountPayload = {
                    classHash: account.argentXproxyClassHash,
                    constructorCalldata: account.constructorCalldata,
                    contractAddress: account.account.address,
                    addressSalt: account.addressSalt
                };
                const { transaction_hash: AXdAth, contract_address: AXcontractFinalAdress } = await account.account.deployAccount(deployAccountPayload);
                console.log("deployAccount success, txHash: ", AXdAth, ", contract_address: ", AXcontractFinalAdress);
                txHash = AXdAth;
            } catch (error) {
                console.log("deployAccount error: ", error);
                // 等待10秒再次尝试
                count++;
                if (count > 5) {
                    // 如果尝试5次都失败，就退出
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 100 * 1000));
                continue;
            }
            if (txHash) {
                await insertAccountData(db, {
                    starknetAddress: account.account.address,
                    deployTxHash: txHash,
                });
                for (let i = 0; i < 5; i++) {
                    try {
                        await provider.waitForTransaction(txHash);
                        break;
                    } catch (error) {
                        console.log("Transaction ", txHash, " failed, check for more details.");
                    }
                    // 随机等待等待2-10分钟，再次查询交易状态
                    await new Promise(resolve => setTimeout(resolve, randomInt(120000, 600000)));
                }
            }
        }
    }
    const shuffledDappAddresses = shuffleArray([...dappsList]);
    for (const dapp of shuffledDappAddresses) {
        const waitTime = getRandomArbitrary(30 * 60 * 1000, 2 * 60 * 60 * 1000);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        try {
            await interactWithDapp(account.account, dapps[dapp], db);
            console.log(`Account ${account.account.address} interacted with DApp ${dapp} successfully.`);
        } catch (error) {
            console.error(`Account ${account.account.address} interaction with DApp ${dapp} failed: `, error);
        }
    }

    const continuousDapp = dapps["JediSwap"];
    while (true) {
        // 查询账户余额, 小于0.001ETH则退出完成任务
        let balance;
        try {
            balance = await getBalance(account.account.address, dapps["ETH"]["address"], provider);
        } catch (error) {
            console.log("getBalance error: ", error);
            console.log("getBalance error, waiting for 1 hour...");
            await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 60 * 1000));
            continue;
        }
        console.log(`Continuous interaction: Account ${account.account.address} has balance: ${balance} ETH.`);
        // balance类型为string, 需要转换为number
        if (Number(balance) < 0.001) {
            console.log(`Continuous interaction: Account ${account.account.address} has no balance, exiting...`);
            return;
        }

        const waitTime = getRandomArbitrary(5 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        try {
            await interactWithDapp(account.account, continuousDapp, db);
            console.log(`Continuous interaction: Account ${account.account.address} interacted with DApp ${continuousDapp} successfully.`);
        } catch (error) {
            console.error(`Continuous interaction: Account ${account.account.address} interaction with DApp ${continuousDapp} failed: `, error);
        }
    }
}

async function multiAccountInteraction() {
    console.log("Starting multi account interaction...");
    try {
        const db = await setupDatabase();
        const accounts = await generateAccounts(mnemonic, 0, 15, provider);
        const tasks = [];
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            // 设置随机30分钟-2个小时的延时, 并乘以账户索引, 防止同时执行
            const delay = randomInt(30 * 60 * 1000, 2 * 60 * 60 * 1000) * i;

            // 创建一个异步任务
            const task = new Promise(async (resolve) => {
                try {
                    await new Promise((r) => setTimeout(r, delay));
                    await performTasks(account, db);
                    resolve();
                } catch (error) {
                    console.error('Error in account interaction: ', error);
                    resolve();
                }
            });

            tasks.push(task);
        }

        // 等待所有任务完成
        await Promise.all(tasks);
    } catch (error) {
        console.error('Error in account interaction: ', error);
    }
}

multiAccountInteraction();
