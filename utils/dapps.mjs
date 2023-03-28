export const dappsList = ["JediSwap", "Naming", "MintSquare", "MySwap"];
export const dapps = {
    "ETH": {
        "name": "ETH Token",
        "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        // "abi": json.parse(fs.readFileSync("./abi/erc20abi.json"))
    },
    "USDT": {
        "name": "USDT Token",
        "address": "0x5a643907b9a4bc6a55e9069c4fd5fd1f5c79a22470690f75556c4736e34426",
        // "abi": json.parse(fs.readFileSync("./abi/erc20abi.json"))
    },
    "StarknetId": {
        "name": "StarknetId",
        "address": "0x0783a9097b26eae0586373b2ce0ed3529ddc44069d1e0fbc4f66d42b69d6850d",
        // "abi": json.parse(fs.readFileSync("./abi/starknetidabi.json"))
    },
    "Naming": {
        "name": "Naming",
        "address": "0x003bab268e932d2cecd1946f100ae67ce3dff9fd234119ea2f6da57d16d29fce",
        // "abi": json.parse(fs.readFileSync("./abi/namingabi.json"))
    },
    "JediSwap": {
        "name": "JediSwap",
        "address": "0x02bcc885342ebbcbcd170ae6cafa8a4bed22bb993479f49806e72d96af94c965",
        // "abi": json.parse(fs.readFileSync("./abi/jediswapabi.json"))
    },
    "MintSquare": {
        "name": "MintSquare",
        "address": "0x064bfed736951e98e16fedfd4605960879251f59f2f14427a2ae88a48f379801",
        // "abi": json.parse(fs.readFileSync("./abi/jediswapabi.json"))
    },
    "MySwap": {
        "name": "MySwap",
        "address": "0x018a439bcbb1b3535a6145c1dc9bc6366267d923f60a84bd0c7618f33c81d334",
        // "abi": json.parse(fs.readFileSync("./abi/jediswapabi.json"))
    }
};
// 合约ABI（仅包含需要的函数）
export const depositContractAbi = [{ "inputs": [{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"l2Recipient","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"}];
// 合约地址
export const depositContractAddress = "0xc3511006C04EF1d78af4C8E0e74Ec18A6E64Ff9e";