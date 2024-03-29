export const dappsList = ["JediSwap", "Naming", "MintSquare", "MySwap", "10kSwap"];
export const dapps = {
    "ETH": {
        "name": "ETH Token",
        "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        // "abi": json.parse(fs.readFileSync("./abi/erc20abi.json"))
    },
    "USDT": {
        "name": "USDT Token",
        "address": "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
        // "abi": json.parse(fs.readFileSync("./abi/erc20abi.json"))
    },
    "StarknetId": {
        "name": "StarknetId",
        "address": "0x05dbdedc203e92749e2e746e2d40a768d966bd243df04a6b712e222bc040a9af",
        // "abi": json.parse(fs.readFileSync("./abi/starknetidabi.json"))
    },
    "Naming": {
        "name": "Naming",
        "address": "0x06ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678",
        // "abi": json.parse(fs.readFileSync("./abi/namingabi.json"))
    },
    "JediSwap": {
        "name": "JediSwap",
        "address": "0x041fd22b238fa21cfcf5dd45a8548974d8263b3a531a60388411c5e230f97023",
        // "abi": json.parse(fs.readFileSync("./abi/jediswapabi.json"))
    },
    "10kSwap": {
        "name": "10kSwap",
        "address": "0x07a6f98c03379b9513ca84cca1373ff452a7462a3b61598f0af5bb27ad7f76d1",
        // "abi": json.parse(fs.readFileSync("./abi/jediswapabi.json"))
    },
    "MintSquare": {
        "name": "MintSquare",
        "address": "0x04a3621276a83251b557a8140e915599ae8e7b6207b067ea701635c0d509801e",
        // "abi": json.parse(fs.readFileSync("./abi/jediswapabi.json"))
    },
    "MySwap": {
        "name": "MySwap",
        "address": "0x010884171baf1914edc28d7afb619b40a4051cfae78a094a55d230f19e944a28",
        // "abi": json.parse(fs.readFileSync("./abi/jediswapabi.json"))
    }
};
// 合约ABI（仅包含需要的函数）
// export const depositContractAbi = [{ "inputs": [{ "internalType": "uint256", "name": "l2Recipient", "type": "uint256" }], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function" }]
export const depositContractAbi = [{ "inputs": [{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"l2Recipient","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"}];
// 合约地址
export const depositContractAddress = "0xae0Ee0A63A2cE6BaeEFFE56e7714FB4EFE48D419";