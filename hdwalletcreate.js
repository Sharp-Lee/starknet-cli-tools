import { BigNumber, utils, Wallet } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// 生成随机的12个单词
const mnemonic = process.env.MNEMONIC;

// 根据助记词生成 HD 钱包
const hdNode = utils.HDNode.fromMnemonic(mnemonic);

// 打印 HD 钱包的地址和私钥
console.log('HD Wallet Address: ', hdNode.address);

// 生成前100个派生地址
for (let i = 3; i < 18; i++) {
  const wallet = hdNode.derivePath(`m/44'/60'/0'/0/${i}`);
  console.log(`Address ${i-2}: `, wallet.address);
  console.log();
}
