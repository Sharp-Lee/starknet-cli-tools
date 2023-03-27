import { BigNumber, utils, Wallet } from "ethers";
import { generateStarkAccounts } from "./utils/accounts.mjs";
import { Provider, RpcProvider } from "starknet";
import dotenv from "dotenv";

dotenv.config();

// 生成随机的12个单词
const mnemonic = process.env.MNEMONIC;
const starkRpcUrl = process.env.StarkRpcUrl;
const starkRpcProvider = new RpcProvider({ nodeUrl: starkRpcUrl });

const starkAccounts = await generateStarkAccounts(mnemonic, 3, 103, starkRpcProvider);

// 根据助记词生成 HD 钱包
const hdNode = utils.HDNode.fromMnemonic(mnemonic);
// 生成前100个派生地址
for (let i = 3; i < 103; i++) {
  const wallet = hdNode.derivePath(`m/44'/60'/0'/0/${i}`);
  console.log(`Address ${i-2}: `, wallet.address);
  console.log(`Stark Address ${i-2}: `, starkAccounts[i-3].account.address);
  console.log();
}
