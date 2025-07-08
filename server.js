const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { MongoClient, ObjectId } = require("mongodb");
const MongoStore = require("connect-mongo");  // <-- импорт connect-mongo

const app = express();
const PORT = process.env.PORT || 3000;

const uri = "mongodb+srv://timati2209:s7WVPYvbwJLgrbqj@cluster0.m57nnau.mongodb.net/mydatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let db;
let postsCollection;
let settingsCollection;

async function migrateIfNeeded() {
  const postsCount = await postsCollection.countDocuments();
  const settingsCount = await settingsCollection.countDocuments();

  if (postsCount > 0 || settingsCount > 0) {
    console.log("MongoDB уже содержит данные, миграция не нужна");
    return;
  }

  console.log("Запускаем миграцию из db.json в MongoDB...");

  const dataPath = path.join(__dirname, "data", "db.json");
  if (!fs.existsSync(dataPath)) {
    console.log("Файл db.json не найден, миграция пропущена");
    return;
  }

  const rawData = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(rawData);

  if (Array.isArray(data.posts) && data.posts.length > 0) {
    const postsToInsert = data.posts.map(post => ({
      ...post,
      _id: post.id ? post.id : undefined
    }));
    await postsCollection.insertMany(postsToInsert);
    console.log(`Вставлено ${postsToInsert.length} постов`);
  }

  if (data.settings && typeof data.settings === "object") {
    const settingsToInsert = Object.entries(data.settings).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : JSON.stringify(value)
    }));
    await settingsCollection.insertMany(settingsToInsert);
    console.log(`Вставлено ${settingsToInsert.length} настроек`);
  }

  console.log("Миграция завершена");
}

async function startServer() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db("mydatabase");
    postsCollection = db.collection("posts");
    settingsCollection = db.collection("settings");

    await migrateIfNeeded();

    app.use(bodyParser.json({ limit: "10mb" }));
    app.use(express.static(path.join(__dirname, "public")));

    // Настройка сессий с использованием MongoDB в качестве хранилища
    app.use(session({
      secret: "yourSuperSecretKey123!@#",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: client,
        dbName: "mydatabase",
        collectionName: "sessions",
        ttl: 60 * 30 // 30 минут в секундах
      }),
      cookie: { maxAge: 1800000 } // 30 минут
    }));

    async function getAuthSettings() {
      const settingsArray = await settingsCollection.find().toArray();
      const settings = {};
      for (const s of settingsArray) {
        try {
          settings[s.key] = JSON.parse(s.value);
        } catch {
          settings[s.key] = s.value;
        }
      }
      return settings;
    }

    app.post("/login", async (req, res) => {
      try {
        const { login, password } = req.body;
        const settings = await getAuthSettings();
        const auth = settings.auth || {};
        if (login === auth.login && password === auth.password) {
          req.session.authenticated = true;
          res.json({ success: true });
        } else {
          res.status(401).json({ success: false, message: "Неверный логин или пароль" });
        }
      } catch {
        res.status(500).json({ success: false, message: "Ошибка сервера" });
      }
    });

    app.post("/logout", (req, res) => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });

    function authMiddleware(req, res, next) {
      if (req.session.authenticated) {
        next();
      } else {
        res.status(401).send("Доступ запрещён");
      }
    }

    app.get("/api/data", async (req, res) => {
      try {
        const posts = await postsCollection.find().toArray();
        const settings = await getAuthSettings();
        res.json({ posts, settings });
      } catch {
        res.status(500).json({ error: "Ошибка чтения данных" });
      }
    });

    app.post("/api/posts", authMiddleware, async (req, res) => {
      try {
        const post = req.body;
        if (!post.title) return res.status(400).json({ success: false, message: "Отсутствует title" });
        post.createdAt = new Date();
        const result = await postsCollection.insertOne(post);
        res.json({ success: true, id: result.insertedId });
      } catch {
        res.status(500).json({ success: false, message: "Ошибка записи поста" });
      }
    });

    app.put("/api/posts/:id", authMiddleware, async (req, res) => {
      try {
        const id = req.params.id;
        const post = req.body;
        const result = await postsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: {
            title: post.title,
            description: post.description || "",
            price: post.price || "",
            image: post.image || ""
          } }
        );
        if (result.matchedCount === 0) return res.status(404).json({ success: false, message: "Пост не найден" });
        res.json({ success: true });
      } catch {
        res.status(500).json({ success: false, message: "Ошибка обновления поста" });
      }
    });

    app.delete("/api/posts/:id", authMiddleware, async (req, res) => {
      try {
        const id = req.params.id;
        let query;

        // Проверяем валидность ObjectId
        if (/^[a-f\d]{24}$/i.test(id)) {
          query = { _id: new ObjectId(id) };
        } else {
          query = { id }; // fallback, если id в другом формате
        }

        const result = await postsCollection.deleteOne(query);
        if (result.deletedCount === 0) return res.status(404).json({ success: false, message: "Пост не найден" });
        res.json({ success: true });
      } catch (err) {
        console.error("Ошибка удаления поста:", err);
        res.status(500).json({ success: false, message: "Ошибка удаления поста" });
      }
    });

    app.post("/api/settings", authMiddleware, async (req, res) => {
      try {
        const settings = req.body;
        const ops = [];
        for (const [key, value] of Object.entries(settings)) {
          const valStr = JSON.stringify(value);
          ops.push({
            updateOne: {
              filter: { key },
              update: { $set: { value: valStr } },
              upsert: true
            }
          });
        }
        if (ops.length > 0) {
          await settingsCollection.bulkWrite(ops);
        }
        res.json({ success: true });
      } catch {
        res.status(500).json({ success: false, message: "Ошибка записи настроек" });
      }
    });

    app.get("/admin.html", authMiddleware, (req, res) => {
      res.sendFile(path.join(__dirname, "private", "admin.html"));
    });

    app.get("/admin.js", authMiddleware, (req, res) => {
      res.sendFile(path.join(__dirname, "private", "admin.js"));
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error(err);
  }
}

startServer();
