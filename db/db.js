import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function setupDatabase() {
    const db = await open({
        filename: "./starknet.db",
        driver: sqlite3.Database,
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eth_address TEXT,
            starknet_address TEXT,
            deploy TEXT,
            deposit TEXT,
            naming TEXT,
            mint_square TEXT,
            jedi_swap TEXT,
            my_swap TEXT
        );
    `);

    // 创建 image_names 表
    await db.exec(`
        CREATE TABLE IF NOT EXISTS image_names (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_name_list TEXT
        );
    `);

    return db;
}

async function insertAccountData(db, accountData) {
    let {
        ethAddress,
        starknetAddress,
        deployTxHash,
        depositTxHash,
        namingTxHash,
        mintSquareTxHash,
        jediSwapTxHash,
        mySwapTxHash,
    } = accountData;

    // 将undefined替换为null
    if (ethAddress === undefined) ethAddress = null;
    if (starknetAddress === undefined) starknetAddress = null;
    if (deployTxHash === undefined) deployTxHash = null;
    if (depositTxHash === undefined) depositTxHash = null;
    if (namingTxHash === undefined) namingTxHash = null;
    if (mintSquareTxHash === undefined) mintSquareTxHash = null;
    if (jediSwapTxHash === undefined) jediSwapTxHash = null;
    if (mySwapTxHash === undefined) mySwapTxHash = null;

    const existingEntry = await db.get(
        "SELECT * FROM accounts WHERE starknet_address = ?",
        [starknetAddress]
    );

    if (existingEntry) {
        let jediSwapTxHashes = [];
        try {
            jediSwapTxHashes = existingEntry.jedi_swap ? JSON.parse(existingEntry.jedi_swap) : [];
        } catch (error) {
            console.error("Error parsing jedi_swap JSON:", error);
        }

        // // 更新已存在的记录
        // const jediSwapTxHashes = existingEntry.jedi_swap
        //     ? JSON.parse(existingEntry.jedi_swap)
        //     : [];
        if (jediSwapTxHash) {
            jediSwapTxHashes.push(jediSwapTxHash);
        }

        await db.run(
            `UPDATE accounts SET
                deploy = COALESCE(?, deploy),
                deposit = COALESCE(?, deposit),
                naming = COALESCE(?, naming),
                mint_square = COALESCE(?, mint_square),
                jedi_swap = ?,
                my_swap = COALESCE(?, my_swap)
            WHERE starknet_address = ?`,
            [
                deployTxHash,
                depositTxHash,
                namingTxHash,
                mintSquareTxHash,
                JSON.stringify(jediSwapTxHashes),
                mySwapTxHash,
                starknetAddress,
            ]
        );
        console.log("Updated account data:", starknetAddress);
    } else {
        // 插入新记录
        const jediSwapTxHashes = jediSwapTxHash ? [jediSwapTxHash] : [];

        await db.run(
            "INSERT INTO accounts (eth_address, starknet_address, deploy, deposit, naming, mint_square, jedi_swap, my_swap) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                ethAddress,
                starknetAddress,
                deployTxHash,
                depositTxHash,
                namingTxHash,
                mintSquareTxHash,
                JSON.stringify(jediSwapTxHashes),
                mySwapTxHash,
            ]
        );
        console.log("Inserted new account data:", ethAddress, starknetAddress);
    }
}

async function insertImageNames(db, imageNames) {
    const imageNameList = JSON.stringify(imageNames);

    await db.run(
        "INSERT INTO image_names (image_name_list) VALUES (?)",
        [imageNameList]
    );

    console.log("Inserted image names:", imageNames);
}

async function getAndRemoveFirstImageName(db) {
    // 获取存储的图片名字数组
    const result = await db.get("SELECT * FROM image_names ORDER BY id LIMIT 1");
    if (!result) {
        console.log("No image names available.");
        return null;
    }

    // 将 JSON 字符串解析为数组
    const imageNames = JSON.parse(result.image_name_list);

    // 获取并移除数组中的第一个图片名字
    const firstImageName = imageNames.shift();

    // 更新数据库中的图片名字数组
    if (imageNames.length > 0) {
        await db.run(
            "UPDATE image_names SET image_name_list = ? WHERE id = ?",
            [JSON.stringify(imageNames), result.id]
        );
    } else {
        // 如果数组为空，删除该记录
        await db.run("DELETE FROM image_names WHERE id = ?", [result.id]);
    }

    console.log("Retrieved and removed first image name:", firstImageName);
    return firstImageName;
}

export { setupDatabase, insertAccountData , insertImageNames, getAndRemoveFirstImageName};