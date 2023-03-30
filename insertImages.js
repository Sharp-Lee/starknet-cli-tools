import { setupDatabase, getAndRemoveFirstImageName, insertImageNames } from "./db/db.js";

async function demo() {
    // 设置数据库
    const db = await setupDatabase();

    // 定义图片名称列表, 1.jpg, 2.jpg, 3.jpg...100.jpg
    const imageNames = [];
    for (let i = 17; i <= 100; i++) {
        imageNames.push(`${i}.jpg`);
    }

    // 先清空, 防止重复插入
    await db.run("DELETE FROM image_names");

    // 插入图片名称作为示例数据
    await insertImageNames(db, imageNames);

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

// 运行示例
demo().catch(console.error);
