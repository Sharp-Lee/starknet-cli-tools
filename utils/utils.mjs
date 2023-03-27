export function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function from_special_38_to_decimal(s) {
    let base_10 = 0;
    for (let i = 0; i < s.length; i++) {
        let ch = s[s.length - i - 1];
        let digit;
        if (ch == 'a') {
            digit = i == s.length - 1 ? 0 : 37;
        } else if (ch >= 'b' && ch <= 'z') {
            digit = ch.charCodeAt(0) - 'b'.charCodeAt(0) + 1;
        } else if (ch >= '0' && ch <= '9') {
            digit = ch.charCodeAt(0) - '0'.charCodeAt(0) + 26;
        } else if (ch == '-') {
            digit = 36;
        } else {
            throw new Error("Invalid character: " + ch);
        }

        let power = s.length - i - 1;
        base_10 += digit * Math.pow(38, power);
    }

    return base_10;
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomString(length) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz-";
    let str = "";
    for (let i = 0; i < length; i++) {
        let randIndex = Math.floor(Math.random() * chars.length);
        str += chars[randIndex];
    }
    return str;
}

export function str2hex(str) {
    if (str === "") {
        return "";
    }
    var arr = [];
    arr.push("0x");
    for (var i = 0; i < str.length; i++) {
        arr.push(Number(str.charCodeAt(i)).toString(16));
    }
    return arr.join('');
}
export function stringToHex(str) {
    // 将字符串转换为Buffer对象
    const buffer = Buffer.from(str, 'utf8');
    // 将Buffer对象转换为十六进制字符串
    const hex = buffer.toString('hex');
    // 添加前缀0x,并返回
    return '0x' + hex;
}

export function setTimeout64(callback, delay) {
    const maxDelay = 2147483647;
    if (delay > maxDelay) {
        const firstDelay = maxDelay;
        const remainingDelay = delay - maxDelay;
        return setTimeout(() => setTimeout64(callback, remainingDelay), firstDelay);
    } else {
        return setTimeout(callback, delay);
    }
}

export async function removeImageName(db, imageName) {
    // 在删除之前检查图片名称是否存在
    const imageEntry = await db.get("SELECT * FROM images WHERE image_name = ?", [imageName]);

    if (!imageEntry) {
        console.error("Image name not found:", imageName);
        return;
    }

    await db.run("DELETE FROM images WHERE image_name = ?", [imageName]);
    console.log("Removed image name:", imageName);
}