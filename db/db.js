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
            jedi_swap TEXT
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
    } = accountData;

    // 将undefined替换为null
    if (ethAddress === undefined) ethAddress = null;
    if (starknetAddress === undefined) starknetAddress = null;
    if (deployTxHash === undefined) deployTxHash = null;
    if (depositTxHash === undefined) depositTxHash = null;
    if (namingTxHash === undefined) namingTxHash = null;
    if (mintSquareTxHash === undefined) mintSquareTxHash = null;
    if (jediSwapTxHash === undefined) jediSwapTxHash = null;

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
                jedi_swap = ?
            WHERE starknet_address = ?`,
            [
                deployTxHash,
                depositTxHash,
                namingTxHash,
                mintSquareTxHash,
                JSON.stringify(jediSwapTxHashes),
                starknetAddress,
            ]
        );
        console.log("Updated account data:", starknetAddress);
    } else {
        // 插入新记录
        const jediSwapTxHashes = jediSwapTxHash ? [jediSwapTxHash] : [];

        await db.run(
            "INSERT INTO accounts (eth_address, starknet_address, deploy, deposit, naming, mint_square, jedi_swap) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                ethAddress,
                starknetAddress,
                deployTxHash,
                depositTxHash,
                namingTxHash,
                mintSquareTxHash,
                JSON.stringify(jediSwapTxHashes),
            ]
        );
        console.log("Inserted new account data:", ethAddress, starknetAddress);
    }
}

export { setupDatabase, insertAccountData };