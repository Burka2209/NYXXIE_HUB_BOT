// migrate.js
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://timati2209:s7WVPYvbwJLgrbqj@cluster0.m57nnau.mongodb.net/mydatabase?retryWrites=true&w=majority";

async function migrate() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("mydatabase");
    const postsCollection = db.collection("posts");
    const settingsCollection = db.collection("settings");

    const dataPath = path.join(__dirname, "data", "db.json");
    const rawData = fs.readFileSync(dataPath, "utf8");
    const data = JSON.parse(rawData);

    // Вставляем посты, если они есть
    if (Array.isArray(data.posts) && data.posts.length > 0) {
      // Вставляем без очистки, пропуская дубликаты по _id
      for (const post of data.posts) {
        const filter = { _id: post.id ? post.id : null };
        if (!filter._id) continue;
        await postsCollection.updateOne(filter, { $set: post }, { upsert: true });
      }
      console.log(`Migrated ${data.posts.length} posts`);
    }

    // Вставляем настройки (ключ-значение)
    if (data.settings && typeof data.settings === "object") {
      for (const [key, value] of Object.entries(data.settings)) {
        const valStr = typeof value === "string" ? value : JSON.stringify(value);
        await settingsCollection.updateOne(
          { key },
          { $set: { value: valStr } },
          { upsert: true }
        );
      }
      console.log(`Migrated settings`);
    }

    console.log("Migration complete");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.close();
  }
}

migrate();
