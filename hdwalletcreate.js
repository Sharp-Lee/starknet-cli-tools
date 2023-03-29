import { BigNumber, utils, Wallet } from "ethers";
import { generateStarkAccounts } from "./utils/accounts.mjs";
import { Provider, RpcProvider } from "starknet";
import dotenv from "dotenv";

dotenv.config();

// 生成随机的12个单词
const mnemonic = process.env.MNEMONIC;
const starkRpcUrl = process.env.StarkRpcUrl;
const starkRpcProvider = new RpcProvider({ nodeUrl: starkRpcUrl });

const start = 8;
const end = 9;

const starkAccounts = await generateStarkAccounts(mnemonic, start, end, starkRpcProvider);

// 根据助记词生成 HD 钱包
const hdNode = utils.HDNode.fromMnemonic(mnemonic);
// 生成前100个派生地址
for (let i = start; i < end; i++) {
  const wallet = hdNode.derivePath(`m/44'/60'/0'/0/${i}`);
  console.log(`Address ${i+1}: `, wallet.address);
  console.log(`Stark Address ${i+1}: `, starkAccounts[i-start].account.address);
  console.log();
}
