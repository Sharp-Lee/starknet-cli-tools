import { setupDatabase, insertImageNames } from "../db/db.js";

export async function checkImages(start, end) {
    // 设置数据库
    const db = await setupDatabase();

    const result = await db.get("SELECT * FROM image_names ORDER BY id LIMIT 1");
    if (!result) {
        console.log("No image names available, inserting...");
        const imageNames = [];
        for (let i = 1; i <= (end - start); i++) {
            imageNames.push(`${i}.jpg`);
        }
        await insertImageNames(db, imageNames);
    }

    // 调用getAndRemoveFirstImageName并打印结果
    // const firstImageName = await getAndRemoveFirstImageName(db);
    // console.log("First image name:", firstImageName);

    // 再次调用getAndRemoveFirstImageName并打印结果
    // const secondImageName = await getAndRemoveFirstImageName(db);
    // console.log("Second image name:", secondImageName);

    // 清空数据库
    // await db.run("DELETE FROM image_names");

    // 关闭数据库连接
    await db.close();
}
