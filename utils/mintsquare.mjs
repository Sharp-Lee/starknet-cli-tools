import axios from 'axios'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data';
import { faker } from '@faker-js/faker';
import { stringToHex } from './utils.mjs'

const mintAddress = "0x04a3621276a83251b557a8140e915599ae8e7b6207b067ea701635c0d509801e"

async function uploadFile(folder, file) {
    try {
        const form = new FormData();
        const imagePath = path.join(folder, file);
        form.append('file', fs.createReadStream(imagePath), { filename: file });
        const res = await axios.post('https://api.mintsquare.io/files/upload/', form, {
            headers: {
                ...form.getHeaders(),
                'origin': 'https://mintsquare.io',
                'referer': 'https://mintsquare.io/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                'Content-Type': 'multipart/form-data',
            },
        })
        if (res.status == 200) {
            return res.data
        } else {
            return false
        }

    } catch (error) {
        console.log(error)
    }
    return false
}

async function uploadMetadata(imgUrl) {
    try {
        const data = generateData(imgUrl)
        const res = await axios.post('https://api.mintsquare.io/metadata/upload/', { metadata: JSON.stringify(data) }, {
            headers: {
                'origin': 'https://mintsquare.io',
                'referer': 'https://mintsquare.io/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
            },
        })
        if (res.status == 200) {
            return res.data
        } else {
            return false
        }
    } catch (error) {
        console.log(error)
    }
    return false

}

const generateData = (imgUrl) => {
    const metadata = {
        image: imgUrl,
        name: faker.commerce.productName(),
        attributes: faker.random.numeric() > 5
            ? Array.from(
                { length: faker.random.numeric({ allowLeadingZeros: false }) },
                () => ({
                    trait_type: faker.lorem.word(),
                    value: faker.random.words(),
                })
            )
            : [], // 返回空数组，如果 attributes 应该为空
    };

    const hasExternalUrl = faker.random.numeric() > 5;
    if (hasExternalUrl) {
        metadata.external_url = faker.internet.url();
    }

    const hasDescription = faker.random.numeric() > 5;
    if (hasDescription) {
        metadata.description = faker.lorem.sentence();
    }


    return metadata;
};

export async function executeMintSquare(account, path, file) {
    const url = await uploadFile(path, file)
    const { Hash } = await uploadMetadata(url)
    const uri = "ipfs://" + Hash
    const { transaction_hash: transferTxHash } = await account.execute({
        contractAddress: mintAddress,
        entrypoint: "mint",
        calldata: [stringToHex(uri.slice(0, 31)), stringToHex(uri.slice(31, 62)), stringToHex(uri.slice(62))]
    });

    console.log("address: ", account.address, ", mint square image name: ", file, ", tx: ", transferTxHash);

    return transferTxHash
}
